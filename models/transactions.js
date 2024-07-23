const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  profit: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['up', 'down'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'fail'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);