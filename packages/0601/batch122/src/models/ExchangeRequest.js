const mongoose = require('mongoose');

const exchangeRequestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  offeredItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  requestedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  message: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

exchangeRequestSchema.index({ fromUser: 1 });
exchangeRequestSchema.index({ toUser: 1 });
exchangeRequestSchema.index({ status: 1, createdAt: 1 });
exchangeRequestSchema.index({ status: 1, expiresAt: 1 });
exchangeRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ExchangeRequest', exchangeRequestSchema);
