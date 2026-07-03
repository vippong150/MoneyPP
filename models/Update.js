const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Update', updateSchema);
