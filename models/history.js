const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  addressToWithdraw:{
    type: String
  },
  amount: {
    type: Number,
    required: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['deposit', 'withdraw']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  historyId: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('History', HistorySchema);
