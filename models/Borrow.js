const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  username: { type: String, required: true },
  amount: { type: Number, required: true },
  days: { type: Number, required: true },
  walletNumber: { type: String, default: '' },
  accountName: { type: String, default: '' },
  interest: { type: Number, default: 0 },
  interestRate: { type: Number, default: 0.01 },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'slip_uploaded', 'return_pending', 'completed'],
    default: 'pending'
  },
  date: { type: Date, default: Date.now },
  approvedDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  slipUrl: { type: String, default: null },
  slipUploadDate: { type: Date, default: null },
  returnSlipUrl: { type: String, default: null },
  returnSlipUploadDate: { type: Date, default: null },
  adminSlipUrl: { type: String, default: null },
  adminSlipUploadDate: { type: Date, default: null },
  adminSlipUploadedBy: { type: String, default: null },
  pointsDeducted: { type: Number, default: 0 },
  returnedOnTime: { type: Boolean, default: false },
  approvedBy: { type: String, default: null },
  rejectedDate: { type: Date, default: null },
  rejectedBy: { type: String, default: null },
  completedDate: { type: Date, default: null }
});

module.exports = mongoose.model('Borrow', borrowSchema);
