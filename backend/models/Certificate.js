const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  recipientName: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true
  },
  recipientEmail: {
    type: String,
    required: [true, 'Recipient email is required'],
    lowercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  courseDescription: {
    type: String,
    default: '',
    trim: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required']
  },
  expiryDate: {
    type: Date,
    default: null
  },
  certificateHash: {
    type: String,
    required: true
  },
  blockchainTxHash: {
    type: String,
    default: null
  },
  blockchainNetwork: {
    type: String,
    default: 'simulation'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    default: null
  },
  pdfPath: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Virtual: compute live status based on expiry
certificateSchema.virtual('liveStatus').get(function () {
  if (this.status === 'revoked') return 'revoked';
  if (this.expiryDate && new Date() > new Date(this.expiryDate)) return 'expired';
  return 'active';
});

certificateSchema.set('toJSON', { virtuals: true });
certificateSchema.set('toObject', { virtuals: true });

// Index for fast lookups
certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ issuedBy: 1 });
certificateSchema.index({ recipientEmail: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
