const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0.0,
  },
  accountId: {
    type: Number,
    unique: true,
    required: true,
  },
  status: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'member'
  },
  date: {
    type: String,
    required: true
  },
  referralCode: { type: String },
  referredBy: { type: String },
  referrals: { type: [String], default: [] },
  waitingForWithdrawAmount: { type: Boolean, default: false },
  waitingForWalletAddress: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
