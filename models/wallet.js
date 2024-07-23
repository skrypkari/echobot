const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
  },
  privateKey: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0.0,
  },
});

module.exports = mongoose.model('Wallet', WalletSchema);
