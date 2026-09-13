require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const formRoutes = require('./routes/formRoutes');
const aiRoutes = require('./routes/aiRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const authRoutes = require('./routes/authRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((x) => x.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false); // Avoid throwing direct Error object
    },
    credentials: true,
  })
);

// Body Parser
app.use(express.json({ limit: '1mb' }));

// Rate Limiter Setup (Separated for clarity)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Health Route
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/applications', applicationRoutes);

// Error Handling Middlewares (Must be at the very bottom)
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Forma AI backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;