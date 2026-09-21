const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fileName: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['json', 'yaml', 'yml', 'custom']
  },
  provider: {
    type: String,
    default: 'demo-cloud'
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED'
  },
  securityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  scoreLabel: {
    type: String,
    default: 'CloudGuard Security Score'
  },
  totalPenalty: {
    type: Number,
    default: 0
  },
  summary: {
    totalResources: { type: Number, default: 0 },
    totalFindings: { type: Number, default: 0 },
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 }
  },
  resources: {
    type: Array,
    default: []
  },
  rawConfig: {
    type: String,
    default: null
  },
  parentScanId: {
    type: String,
    default: null
  },
  remediationReport: {
    type: Object,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.models.Scan || mongoose.model('Scan', scanSchema);
