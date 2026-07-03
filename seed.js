require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const PaymentConfig = require('./models/PaymentConfig');
const Update = require('./models/Update');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneypp';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  // Create dev admin
  const existingAdmin = await User.findOne({ username: 'dev' });
  if (!existingAdmin) {
    await User.create({
      userId: 'user' + Date.now(),
      username: 'dev',
      password: 'dev1234',
      role: 'dev',
      verified: true,
      fullName: 'Developer',
      points: 10000,
      level: 20,
      maxDailyBorrow: 999999,
      balance: 999999.00
    });
    console.log('✓ Created admin: dev / dev1234');
  } else {
    console.log('- Admin "dev" already exists');
  }

  // Create PaymentConfig
  const existingConfig = await PaymentConfig.findOne({ key: 'config' });
  if (!existingConfig) {
    await PaymentConfig.create({
      key: 'config',
      truemoney: { accountNumber: '0000000000', accountName: 'TRUEMONEY', qrCodeUrl: null },
      bank: { accountNumber: '0000000000', accountName: '', bankName: 'ธนาคารกรุงเทพ', qrCodeUrl: null }
    });
    console.log('✓ Created default payment config');
  }

  // Create initial update
  const existingUpdate = await Update.findOne({ id: 'upd1' });
  if (!existingUpdate) {
    await Update.create({
      id: 'upd1',
      title: 'เปิดตัวระบบ MONEY',
      description: 'ระบบยืมเงินสมัยใหม่ รองรับทุกการใช้งาน ยืม-คืน ง่าย สะดวก รวดเร็ว!',
      date: new Date()
    });
    console.log('✓ Created initial system update');
  }

  await mongoose.disconnect();
  console.log('\n✓ Seed completed!');
  console.log('  Admin login: dev / dev1234');
  console.log('  URL: http://localhost:' + (process.env.PORT || 8080));
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
