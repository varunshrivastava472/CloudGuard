const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: [true, 'Rule ID is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  impact: {
    type: String
  },
  remediation: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Rule || mongoose.model('Rule', ruleSchema);
