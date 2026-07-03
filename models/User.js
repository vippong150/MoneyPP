const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  wallet: { type: String, default: '' },
  fullName: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin', 'dev'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  points: { type: Number, default: 50 },
  level: { type: Number, default: 1 },
  maxDailyBorrow: { type: Number, default: 100 },
  totalBorrowed: { type: Number, default: 0 },
  pendingBorrows: { type: Number, default: 0 },
  approvedBorrows: { type: Number, default: 0 },
  completedBorrows: { type: Number, default: 0 },
  balance: { type: Number, default: 0.00 },
  verifiedAt: { type: Date, default: null },
  lateReturnsCount: { type: Number, default: 0 },
  totalPointsDeducted: { type: Number, default: 0 },
  activeBorrowTotal: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
