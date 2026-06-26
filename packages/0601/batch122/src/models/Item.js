const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  images: [{
    type: String
  }],
  expectedExchange: {
    type: String,
    required: true,
    maxlength: 200
  },
  haveTag: {
    type: String,
    default: ''
  },
  wantTag: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: '其他'
  },
  status: {
    type: String,
    enum: ['draft', 'available', 'exchanging', 'completed', 'removed', 'deleted'],
    default: 'available'
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  exchangedAt: {
    type: Date,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

itemSchema.index({ owner: 1, status: 1 });
itemSchema.index({ status: 1, createdAt: -1 });
itemSchema.index({ haveTag: 1 });
itemSchema.index({ wantTag: 1 });
itemSchema.index({ haveTag: 1, wantTag: 1 });

itemSchema.pre('save', function(next) {
  if (this.status === 'draft') {
    this.isDraft = true;
  } else if (this.isDraft && this.status !== 'draft') {
    this.isDraft = false;
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema);
