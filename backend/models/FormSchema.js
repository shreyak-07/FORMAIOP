const mongoose = require('mongoose');

const ShowIfSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: ['equals', 'notEquals', 'contains'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const ValidationSchema = new mongoose.Schema(
  {
    required: Boolean,
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String
  },
  { _id: false }
);

const FieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: {
      type: String,
      required: false, // Fixed: Frontend payload crash avoid karne ke liye required hata diya hai
      default: function () {
        return this.label
          ? this.label.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
          : `field_${this.id || Date.now()}`;
      }
    },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'email', 'date', 'select', 'radio', 'checkbox', 'textarea'],
      required: true
    },
    required: { type: Boolean, default: false },
    placeholder: String,
    helpText: String,
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [String],
    validation: { type: ValidationSchema, default: undefined },
    showIf: { type: ShowIfSchema, default: undefined },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    fields: { type: [FieldSchema], default: [] }
  },
  { _id: false }
);

const FormSchemaSchema = new mongoose.Schema(
  {
    formId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: String,
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    sections: { type: [SectionSchema], default: [] },
    fields: { type: [FieldSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true }
  },
  { timestamps: true }
);

// Fallback logic: Fields aur Sections standard format maintain rakhein
FormSchemaSchema.pre('validate', function () {
  const sanitizeFields = (fieldsArray) => {
    return fieldsArray.map((field) => {
      if (!field.name && field.label) {
        field.name = field.label.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      } else if (!field.name) {
        field.name = `field_${field.id || Date.now()}`;
      }
      return field;
    });
  };

  if (this.fields && this.fields.length) {
    this.fields = sanitizeFields(this.fields);
  }

  if (this.sections && this.sections.length) {
    this.sections.forEach((sec) => {
      if (sec.fields && sec.fields.length) {
        sec.fields = sanitizeFields(sec.fields);
      }
    });
  }
});

module.exports = mongoose.model('FormSchema', FormSchemaSchema);