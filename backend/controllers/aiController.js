const axios = require('axios');

const extractFormData = async (req, res) => {
  try {
    const { prompt, fields } = req.body;
    const apiKey = (process.env.LLM_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing API key in .env file.'
      });
    }

    const systemPrompt = `Extract relevant entity values from this description based on the fields provided.
Fields: ${JSON.stringify(fields)}
User Text: "${prompt}"

Return ONLY a valid raw JSON object mapping field names to extracted values. Do not use Markdown formatting or backticks.`;

    // Active production model on Groq Cloud
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are an extraction engine. Output strictly valid JSON object.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    let responseText = response.data.choices[0].message.content;

    // Clean any extra tags or backticks
    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const cleanJson = responseText.replace(/```json|```/g, '').trim();

    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON format from model');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      success: true,
      data: extractedData
    });
  } catch (error) {
    console.error('AI Extraction Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({
      success: false,
      message: 'AI extraction failed.'
    });
  }
};

module.exports = { extractFormData };