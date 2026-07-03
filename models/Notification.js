const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  username: { type: String, required: true },
  type: { type: String, default: '' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  borrowId: { type: String, default: null },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  pointsAwarded: { type: Number, default: 0 },
  pointsDeducted: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  oldBalance: { type: Number, default: 0 },
  newBalance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Notification', notificationSchema);
