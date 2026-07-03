const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'config', unique: true },
  truemoney: {
    accountNumber: { type: String, default: '0000000000' },
    accountName: { type: String, default: 'TRUEMONEY' },
    qrCodeUrl: { type: String, default: null }
  },
  bank: {
    accountNumber: { type: String, default: '0000000000' },
    accountName: { type: String, default: '' },
    bankName: { type: String, default: 'ธนาคารกรุงเทพ' },
    qrCodeUrl: { type: String, default: null }
  }
});

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);
