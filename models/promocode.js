const mongoose = require('mongoose');

const promocodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  bonus: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Promocode', promocodeSchema);
