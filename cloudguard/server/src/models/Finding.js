const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
  scanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan',
    required: [true, 'Scan ID is required'],
    index: true
  },
  ruleId: {
    type: String,
    required: [true, 'Rule ID is required'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String
  },
  resourceType: {
    type: String
  },
  evidence: {
    type: String
  },
  description: {
    type: String
  },
  impact: {
    type: String
  },
  remediation: {
    type: String
  },
  status: {
    type: String,
    enum: ['OPEN', 'RESOLVED', 'MUTED'],
    default: 'OPEN',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Finding || mongoose.model('Finding', findingSchema);
