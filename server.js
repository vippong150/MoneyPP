const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { connectDB, readJSON, writeJSON, initCollection } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `slip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        cb(null, mimetype && extname);
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/VIEDD', express.static(path.join(__dirname, 'VIEDD')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const SEED_USERS_FILE = 'seed-users.json';
const SEED_BORROWS_FILE = 'seed-borrows.json';

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function calculateLevel(points) {
    if (points >= 1000) return 20;
    if (points >= 950) return 19;
    if (points >= 900) return 18;
    if (points >= 850) return 17;
    if (points >= 800) return 16;
    if (points >= 750) return 15;
    if (points >= 700) return 14;
    if (points >= 650) return 13;
    if (points >= 600) return 12;
    if (points >= 550) return 11;
    if (points >= 500) return 10;
    if (points >= 450) return 9;
    if (points >= 400) return 8;
    if (points >= 350) return 7;
    if (points >= 300) return 6;
    if (points >= 250) return 5;
    if (points >= 200) return 4;
    if (points >= 150) return 3;
    if (points >= 100) return 2;
    return 1;
}

function calculateRemainingLimit(user) {
    let limit = user.maxDailyBorrow - (user.activeBorrowTotal || 0);
    const balance = user.balance !== undefined ? user.balance : 0;
    if (balance < 0) limit += balance;
    return Math.max(0, limit);
}

function newUserObj(username, password) {
    return {
        userId: 'user' + Date.now(),
        username, password,
        phone: '', wallet: '', fullName: '',
        verified: false,
        role: 'user',
        createdAt: new Date().toISOString(),
        points: 50, level: 1, maxDailyBorrow: 100,
        totalBorrowed: 0, pendingBorrows: 0, approvedBorrows: 0, completedBorrows: 0,
        balance: 0.00
    };
}

// ===================== API Routes =====================

// Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        if (data.users.find(u => u.username === username)) return res.json({ success: false, message: 'มีชื่อผู้ใช้นี้แล้ว' });
        const newUser = newUserObj(username, password);
        data.users.push(newUser);
        await writeJSON('users', data);
        res.json({ success: true, message: 'สมัครสำเร็จ! คุณได้รับ 50 แต้ม (เลเวล 1)', user: { username, role: 'user' } });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = data.users.find(u => u.username === username && u.password === password);
        if (user) res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ!', user: { username, role: user.role } });
        else res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผิด' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Verify
app.post('/api/user/verify', async (req, res) => {
    try {
        const { username, fullName, wallet } = req.body;
        if (!username || !fullName || !wallet) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (user.verified) return res.json({ success: false, message: 'คุณยืนยันตัวตนแล้ว' });
        user.fullName = fullName;
        user.wallet = wallet;
        user.verified = true;
        user.verifiedAt = new Date().toISOString();
        await writeJSON('users', data);
        res.json({ success: true, message: 'ยืนยันตัวตนสำเร็จ! ตอนนี้คุณสามารถยืมเงินได้แล้ว' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// User Info
app.post('/api/user/info', async (req, res) => {
    try {
        const { username } = req.body;
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (user.points === undefined) user.points = 50;
        if (user.level === undefined) user.level = 1;
        if (user.completedBorrows === undefined) user.completedBorrows = 0;
        user.level = calculateLevel(user.points);
        user.maxDailyBorrow = 50 + (user.level * 50);
        const borrowData = await readJSON('borrows');
        let totalBorrowed = 0, pendingBorrows = 0, approvedBorrows = 0, completedBorrows = 0;
        let totalPointsToDeduct = 0;
        if (borrowData && borrowData.borrows) {
            const userBorrows = borrowData.borrows.filter(b => b.username === username);
            totalBorrowed = userBorrows.reduce((sum, b) => sum + b.amount, 0);
            pendingBorrows = userBorrows.filter(b => b.status === 'pending').length;
            approvedBorrows = userBorrows.filter(b => b.status === 'approved').length;
            completedBorrows = userBorrows.filter(b => b.status === 'completed' && b.returnedOnTime).length;
            const lateBorrows = userBorrows.filter(b => b.status === 'completed' && !b.returnedOnTime);
            const lateReturnsCount = lateBorrows.length;
            const totalPointsDeducted = userBorrows.reduce((sum, b) => sum + (b.pointsDeducted || 0), 0);
            const now = new Date();
            userBorrows.forEach(borrow => {
                if (borrow.status === 'approved' && borrow.approvedDate) {
                    const approvedDate = new Date(borrow.approvedDate);
                    const dueDate = new Date(approvedDate.getTime() + 24 * 60 * 60 * 1000);
                    const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));
                    if (daysOverdue > 0) {
                        const pointsAlreadyDeducted = borrow.pointsDeducted || 0;
                        if (daysOverdue > pointsAlreadyDeducted) {
                            const newPointsToDeduct = daysOverdue - pointsAlreadyDeducted;
                            totalPointsToDeduct += newPointsToDeduct;
                            borrow.pointsDeducted = daysOverdue;
                        }
                    }
                }
            });
            if (totalPointsToDeduct > 0) {
                user.points = Math.max(0, user.points - totalPointsToDeduct);
                user.level = calculateLevel(user.points);
                user.maxDailyBorrow = 50 + (user.level * 50);
                await writeJSON('users', data);
                await writeJSON('borrows', borrowData);
            }
            const activeBorrows = userBorrows.filter(b => b.status === 'pending' || b.status === 'approved' || b.status === 'slip_uploaded');
            const activeBorrowTotal = activeBorrows.reduce((sum, b) => sum + (b.amount || 0), 0);
            user.lateReturnsCount = lateReturnsCount;
            user.totalPointsDeducted = totalPointsDeducted;
            user.activeBorrowTotal = activeBorrowTotal;
        }
        user.completedBorrows = completedBorrows;
        await writeJSON('users', data);
        res.json({
            success: true,
            user: {
                username: user.username, role: user.role, points: user.points, level: user.level,
                maxDailyBorrow: user.maxDailyBorrow, balance: user.balance !== undefined ? user.balance : 0.00,
                phone: user.phone || '', wallet: user.wallet || '', fullName: user.fullName || '',
                verified: user.verified || false, totalBorrowed, pendingBorrows, approvedBorrows, completedBorrows,
                lateReturnsCount: user.lateReturnsCount || 0, totalPointsDeducted: user.totalPointsDeducted || 0,
                activeBorrowTotal: user.activeBorrowTotal || 0, remainingLimit: calculateRemainingLimit(user)
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Borrow Request
app.post('/api/borrow/request', async (req, res) => {
    try {
        const { username, amount, days, interest, total, walletNumber, accountName } = req.body;
        if (!username || !amount || !days) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        if (!walletNumber || !accountName) return res.json({ success: false, message: 'กรุณากรอกเบอร์วอเลทและชื่อบัญชีให้ครบ' });
        const usersData = await readJSON('users');
        if (!usersData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = usersData.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (!user.verified) return res.json({ success: false, message: 'กรุณายืนยันตัวตนก่อนยืมเงิน (ไปเมนู "ยืนยันตัวตน")' });
        if (user.points === undefined) user.points = 50;
        if (user.level === undefined) user.level = 1;
        user.level = calculateLevel(user.points);
        user.maxDailyBorrow = 50 + (user.level * 50);
        await writeJSON('users', usersData);
        const userPoints = user.points || 50;
        if (userPoints <= 0) return res.json({ success: false, message: 'แต้มของคุณหมดแล้ว ไม่สามารถยืมได้' });
        const borrowData = await readJSON('borrows');
        if (!borrowData.borrows) borrowData.borrows = [];
        const activeBorrows = borrowData.borrows.filter(b => b.username === username && (b.status === 'pending' || b.status === 'approved' || b.status === 'slip_uploaded'));
        const totalActiveBorrowAmount = activeBorrows.reduce((sum, b) => sum + b.amount, 0);
        const maxBorrow = user.maxDailyBorrow;
        const borrowAmount = parseFloat(amount);
        const remainingLimit = maxBorrow - totalActiveBorrowAmount;
        if (remainingLimit <= 0) return res.json({ success: false, message: `คุณยืมไปแล้ว ${totalActiveBorrowAmount} บาท (เต็มลิมิต) กรุณาคืนเงินก่อนยืมใหม่` });
        if (borrowAmount < 1 || borrowAmount > remainingLimit) return res.json({ success: false, message: `คุณยืมไปแล้ว ${totalActiveBorrowAmount} บาท / ${maxBorrow} บาท | ยืมได้อีก ${remainingLimit} บาท` });
        const now = new Date();
        const interestRate = 0.01;
        const calculatedInterest = parseFloat(interest) || 0;
        const calculatedTotal = parseFloat(total) || borrowAmount;
        const newBorrow = {
            id: 'borrow' + Date.now(), username, amount: borrowAmount, days: parseInt(days),
            walletNumber, accountName, interest: calculatedInterest, interestRate,
            total: calculatedTotal, status: 'pending', date: now.toISOString(),
            approvedDate: null, dueDate: null, slipUrl: null, pointsDeducted: 0, returnedOnTime: false
        };
        borrowData.borrows.push(newBorrow);
        await writeJSON('borrows', borrowData);
        io.emit('new-borrow-request', newBorrow);
        res.json({ success: true, message: 'ส่งคำขอยืมเงินสำเร็จ! รอแอดมินอนุมัติ', borrow: newBorrow });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Borrow History
app.post('/api/borrow/history', async (req, res) => {
    try {
        const { username } = req.body;
        const data = await readJSON('borrows');
        if (!data) return res.json({ success: true, history: [] });
        const history = data.borrows.filter(b => b.username === username).sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ success: true, history });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Upload Return Slip
app.post('/api/borrow/upload-return-slip', upload.single('slip'), async (req, res) => {
    try {
        const { borrowId, username } = req.body;
        if (!req.file) return res.json({ success: false, message: 'กรุณาเลือกไฟล์สลิป' });
        if (!borrowId || !username) return res.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const borrow = borrowData.borrows.find(b => b.id === borrowId && b.username === username);
        if (!borrow) return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        if (borrow.status !== 'approved' && borrow.status !== 'return_pending') return res.json({ success: false, message: 'รายการนี้ไม่สามารถแนบสลิปได้' });
        const isReUpload = borrow.status === 'return_pending';
        if (isReUpload && borrow.returnSlipUrl) {
            const oldSlipPath = path.join(__dirname, borrow.returnSlipUrl);
            if (fs.existsSync(oldSlipPath)) { try { fs.unlinkSync(oldSlipPath); } catch (e) {} }
        }
        borrow.returnSlipUrl = `/uploads/${req.file.filename}`;
        borrow.returnSlipUploadDate = new Date().toISOString();
        borrow.status = 'return_pending';
        await writeJSON('borrows', borrowData);
        io.emit('return-slip-uploaded', { borrowId: borrow.id, username: borrow.username, amount: borrow.amount, slipUrl: borrow.returnSlipUrl, isReUpload });
        res.json({ success: true, message: isReUpload ? 'แก้ไขสลิปคืนเงินสำเร็จ! รอแอดมินตรวจสอบใหม่' : 'อัปโหลดสลิปคืนเงินสำเร็จ! รอแอดมินตรวจสอบและยืนยัน', slipUrl: borrow.returnSlipUrl });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// Admin: Get All Slips
app.post('/api/admin/slips', async (req, res) => {
    try {
        const { adminUsername } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: true, slips: [] });
        const slips = borrowData.borrows.filter(b => b.slipUrl && b.status === 'slip_uploaded').sort((a, b) => new Date(b.slipUploadDate) - new Date(a.slipUploadDate));
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Pending Borrows
app.post('/api/admin/pending-borrows', async (req, res) => {
    try {
        const { adminUsername } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: true, borrows: [] });
        const pending = borrowData.borrows.filter(b => b.status === 'pending').sort((a, b) => new Date(b.date) - new Date(a.date)).map(borrow => {
            const user = userData.users.find(u => u.username === borrow.username);
            return { ...borrow, userFullName: user?.fullName || 'ไม่ระบุ', userVerifiedWallet: user?.wallet || 'ไม่ระบุ', userVerified: user?.verified || false };
        });
        res.json({ success: true, borrows: pending });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Approve Borrow
app.post('/api/admin/approve-borrow', async (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        const now = new Date();
        const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        borrow.status = 'approved';
        borrow.approvedDate = now.toISOString();
        borrow.dueDate = dueDate.toISOString();
        borrow.approvedBy = adminUsername;
        await writeJSON('borrows', borrowData);
        const notifData = await readJSON('notifications');
        notifData.notifications.push({
            id: 'notif' + Date.now(), username: borrow.username, type: 'approved',
            title: '✅ ได้รับเงินแล้ว!', message: `คำขอยืม ${borrow.amount.toFixed(2)} บาท ได้รับการอนุมัติแล้ว`,
            amount: borrow.amount, borrowId: borrow.id, date: now.toISOString(), read: false
        });
        await writeJSON('notifications', notifData);
        io.emit('borrow-approved', { borrowId: borrow.id, username: borrow.username, amount: borrow.amount, walletNumber: borrow.walletNumber, dueDate: borrow.dueDate });
        res.json({ success: true, message: 'อนุมัติคำขอยืมสำเร็จ! เวลานับถอยหลัง 24 ชม. เริ่มแล้ว!', borrow });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Reject Borrow
app.post('/api/admin/reject-borrow', async (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        borrow.status = 'rejected';
        borrow.rejectedDate = new Date().toISOString();
        borrow.rejectedBy = adminUsername;
        await writeJSON('borrows', borrowData);
        io.emit('borrow-rejected', { borrowId: borrow.id, username: borrow.username });
        res.json({ success: true, message: 'ปฏิเสธคำขอยืมสำเร็จ!' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Register User (DEV only)
app.post('/api/admin/register-user', async (req, res) => {
    try {
        const { adminUsername, username, password } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        if (!username || !password) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        if (userData.users.find(u => u.username === username)) return res.json({ success: false, message: 'มีชื่อผู้ใช้นี้แล้ว' });
        const newUser = newUserObj(username, password);
        userData.users.push(newUser);
        await writeJSON('users', userData);
        res.json({ success: true, message: `สมัครสำเร็จ! ชื่อผู้ใช้: ${username} (50 แต้ม, เลเวล 1)` });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Get All Users
app.post('/api/admin/users', async (req, res) => {
    try {
        const { adminUsername } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const users = userData.users.map(u => ({
            userId: u.userId, username: u.username, role: u.role, level: u.level || 1,
            points: u.points || 50, maxDailyBorrow: u.maxDailyBorrow || 100, verified: u.verified || false,
            fullName: u.fullName || '', wallet: u.wallet || '', createdAt: u.createdAt
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Payment Config - Public
app.get('/api/payment/config', async (req, res) => {
    try {
        const config = await readJSON('paymentConfig');
        if (!config) return res.json({ success: false, message: 'ไม่พบข้อมูลการชำระเงิน' });
        res.json({ success: true, config });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Payment Config - Admin Update
app.post('/api/admin/payment/config', async (req, res) => {
    try {
        const { adminUsername, truemoney, bank } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        const config = await readJSON('paymentConfig') || { truemoney: { accountNumber: '0000000000', accountName: 'TRUEMONEY', qrCodeUrl: null }, bank: { accountNumber: '0000000000', accountName: '', bankName: 'ธนาคารกรุงเทพ', qrCodeUrl: null } };
        if (truemoney) config.truemoney = { ...config.truemoney, ...truemoney };
        if (bank) config.bank = { ...config.bank, ...bank };
        await writeJSON('paymentConfig', config);
        res.json({ success: true, message: 'อัพเดตข้อมูลการชำระเงินสำเร็จ', config });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Payment QR Upload
app.post('/api/admin/payment/upload-qr', upload.single('qrImage'), async (req, res) => {
    try {
        const { adminUsername, paymentType } = req.body;
        if (!req.file) return res.json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' });
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        if (!['truemoney', 'bank'].includes(paymentType)) return res.json({ success: false, message: 'ประเภทการชำระเงินไม่ถูกต้อง' });
        const config = await readJSON('paymentConfig');
        if (!config) return res.json({ success: false, message: 'ไม่พบข้อมูลการชำระเงิน' });
        config[paymentType].qrCodeUrl = `/uploads/${req.file.filename}`;
        await writeJSON('paymentConfig', config);
        res.json({ success: true, message: 'อัพโหลด QR Code สำเร็จ', qrCodeUrl: config[paymentType].qrCodeUrl });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// Admin: Upload Slip
app.post('/api/admin/upload-slip', upload.single('slip'), async (req, res) => {
    try {
        const { borrowId, adminUsername } = req.body;
        if (!req.file) return res.json({ success: false, message: 'กรุณาเลือกไฟล์สลิป' });
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        borrow.adminSlipUrl = `/uploads/${req.file.filename}`;
        borrow.adminSlipUploadDate = new Date().toISOString();
        borrow.adminSlipUploadedBy = adminUsername;
        await writeJSON('borrows', borrowData);
        res.json({ success: true, message: 'อัปโหลดสลิปสำเร็จ!', slipUrl: borrow.adminSlipUrl });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// User: Get Admin Slips
app.post('/api/user/admin-slips', async (req, res) => {
    try {
        const { username } = req.body;
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: true, slips: [] });
        const slips = borrowData.borrows.filter(b => b.username === username && b.adminSlipUrl).sort((a, b) => new Date(b.adminSlipUploadDate) - new Date(a.adminSlipUploadDate)).map(b => ({
            id: b.id, amount: b.amount, status: b.status, slipUrl: b.adminSlipUrl,
            uploadDate: b.adminSlipUploadDate, uploadedBy: b.adminSlipUploadedBy || 'Admin',
            borrowDate: b.date, approvedDate: b.approvedDate
        }));
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Get All Return Slips
app.post('/api/admin/return-slips', async (req, res) => {
    try {
        const { adminUsername } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: true, slips: [] });
        const slips = borrowData.borrows.filter(b => b.returnSlipUrl && (b.status === 'return_pending' || b.status === 'completed')).sort((a, b) => new Date(b.returnSlipUploadDate) - new Date(a.returnSlipUploadDate)).map(b => ({
            id: b.id, username: b.username, amount: b.amount, status: b.status, slipUrl: b.returnSlipUrl,
            slipUploadDate: b.returnSlipUploadDate, borrowDate: b.date, approvedDate: b.approvedDate,
            dueDate: b.dueDate, completedDate: b.completedDate, returnedOnTime: b.returnedOnTime
        }));
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Approve Return Slip
app.post('/api/admin/approve-return-slip', async (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        if (borrow.status !== 'return_pending') return res.json({ success: false, message: 'รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ' });
        const now = new Date();
        const dueDate = new Date(borrow.dueDate);
        const returnedOnTime = now <= dueDate;
        borrow.status = 'completed';
        borrow.completedDate = now.toISOString();
        borrow.returnedOnTime = returnedOnTime;
        borrow.approvedBy = adminUsername;
        await writeJSON('borrows', borrowData);
        const user = userData.users.find(u => u.username === borrow.username);
        if (user) {
            if (user.points === undefined) user.points = 50;
            if (returnedOnTime) {
                user.points += 1;
            } else {
                const timeDiff = now - dueDate;
                const daysLate = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
                const pointsToDeduct = daysLate;
                user.points = Math.max(0, user.points - pointsToDeduct);
                borrow.pointsDeducted = pointsToDeduct;
            }
            const oldLevel = user.level || 1;
            user.level = calculateLevel(user.points);
            user.maxDailyBorrow = 50 + (user.level * 50);
            await writeJSON('users', userData);
            if (user.level > oldLevel) {
                io.emit('level-up', { username: user.username, newLevel: user.level, newLimit: user.maxDailyBorrow });
            }
        }
        const notifData = await readJSON('notifications');
        const pointsDeducted = borrow.pointsDeducted || 0;
        notifData.notifications.push({
            id: 'notif' + Date.now(), username: borrow.username,
            type: 'return_approved',
            title: returnedOnTime ? '🎉 คืนเงินสำเร็จ! (ตรงเวลา)' : '⚠️ คืนเงินสำเร็จ! (คืนช้า)',
            message: returnedOnTime ? `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! คุณได้รับ +1 แต้ม 🎉` : `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! (คืนช้า ${pointsDeducted} วัน หัก ${pointsDeducted} แต้ม)`,
            amount: borrow.amount, borrowId: borrow.id, pointsAwarded: returnedOnTime ? 1 : 0,
            pointsDeducted: returnedOnTime ? 0 : pointsDeducted, date: now.toISOString(), read: false
        });
        await writeJSON('notifications', notifData);
        io.emit('return-approved', { borrowId: borrow.id, username: borrow.username, returnedOnTime, pointsAwarded: returnedOnTime ? 1 : 0, pointsDeducted: returnedOnTime ? 0 : pointsDeducted });
        res.json({ success: true, message: returnedOnTime ? 'ยืนยันการคืนเงินสำเร็จ! ผู้ใช้ได้รับ +1 แต้ม (คืนตรงเวลา) 🎉' : `ยืนยันการคืนเงินสำเร็จ! (คืนช้า ${pointsDeducted} วัน หัก ${pointsDeducted} แต้ม)` });
    } catch (error) {
        console.error('Approve return slip error:', error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Admin: Adjust Balance (DEV only)
app.post('/api/admin/adjust-balance', async (req, res) => {
    try {
        const { adminUsername, targetUsername, amount, reason } = req.body;
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || admin.role !== 'dev') return res.json({ success: false, message: 'เฉพาะ DEV เท่านั้น!' });
        const targetUser = userData.users.find(u => u.username === targetUsername);
        if (!targetUser) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (targetUser.balance === undefined) targetUser.balance = 0;
        const oldBalance = targetUser.balance;
        targetUser.balance = parseFloat((targetUser.balance + parseFloat(amount)).toFixed(2));
        await writeJSON('users', userData);
        const notifData = await readJSON('notifications');
        notifData.notifications.push({
            id: 'notif' + Date.now(), username: targetUsername,
            type: amount > 0 ? 'balance_added' : 'balance_deducted',
            title: amount > 0 ? '💰 ได้รับเงินเข้ากระเป๋า' : '💸 เงินถูกหักออกจากกระเป๋า',
            message: `${amount > 0 ? '+' : ''}${parseFloat(amount).toFixed(2)} บาท${reason ? ` (${reason})` : ''}\nยอดคงเหลือ: ${targetUser.balance.toFixed(2)} บาท`,
            amount: parseFloat(amount), reason: reason || '', oldBalance, newBalance: targetUser.balance,
            date: new Date().toISOString(), read: false
        });
        await writeJSON('notifications', notifData);
        io.emit('balance-updated', { username: targetUsername, oldBalance, newBalance: targetUser.balance, amount: parseFloat(amount) });
        res.json({ success: true, message: `ปรับยอดเงินสำเร็จ! ${targetUsername}: ${oldBalance.toFixed(2)} → ${targetUser.balance.toFixed(2)} บาท`, oldBalance, newBalance: targetUser.balance });
    } catch (error) {
        console.error('Adjust balance error:', error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// User: Return History
app.post('/api/user/return-history', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        const borrowData = await readJSON('borrows');
        if (!borrowData) return res.json({ success: true, history: [] });
        const history = borrowData.borrows.filter(b => b.username === username && b.status === 'completed').sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate)).map(b => ({
            id: b.id, amount: b.amount, borrowDate: b.date, approvedDate: b.approvedDate,
            dueDate: b.dueDate, returnSlipUrl: b.returnSlipUrl, returnSlipUploadDate: b.returnSlipUploadDate,
            completedDate: b.completedDate, returnedOnTime: b.returnedOnTime, pointsAwarded: b.returnedOnTime ? 1 : 0, status: b.status
        }));
        res.json({ success: true, history });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Notifications
app.post('/api/user/notifications', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        const notifData = await readJSON('notifications');
        if (!notifData) return res.json({ success: true, notifications: [], unreadCount: 0 });
        const notifications = notifData.notifications.filter(n => n.username === username).sort((a, b) => new Date(b.date) - new Date(a.date));
        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/user/notifications/mark-read', async (req, res) => {
    try {
        const { username, notificationId } = req.body;
        if (!username) return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        const notifData = await readJSON('notifications');
        if (!notifData) return res.json({ success: false, message: 'ไม่พบข้อมูล' });
        if (notificationId) {
            const notif = notifData.notifications.find(n => n.id === notificationId && n.username === username);
            if (notif) notif.read = true;
        } else {
            notifData.notifications.filter(n => n.username === username).forEach(n => n.read = true);
        }
        await writeJSON('notifications', notifData);
        res.json({ success: true, message: 'อัพเดตสถานะสำเร็จ' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// System Updates
app.get('/api/system/updates', async (req, res) => {
    try {
        const data = await readJSON('updates');
        if (!data) return res.json({ success: true, updates: [] });
        const updates = data.updates.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ success: true, updates });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/system/update', async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        const data = await readJSON('updates');
        const newUpdate = { id: 'upd' + Date.now(), title, description, date: new Date().toISOString() };
        data.updates.push(newUpdate);
        await writeJSON('updates', data);
        io.emit('system-update', newUpdate);
        res.json({ success: true, message: 'เพิ่มอัพเดตสำเร็จ!', update: newUpdate });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Spin Config
async function getSpinRewards() {
    try {
        const data = await readJSON('spinConfig');
        return (data && data.rewards && data.rewards.length > 0) ? data.rewards : [0.10];
    } catch { return [0.10]; }
}

// Daily Spin
app.post('/api/user/daily-spin', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        const now = Date.now();
        if (user.lastSpinTime && (now - user.lastSpinTime) < 86400000) {
            const remaining = 86400000 - (now - user.lastSpinTime);
            const hrs = Math.floor(remaining / 3600000);
            const mins = Math.floor((remaining % 3600000) / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            return res.json({ success: false, message: `รออีก ${hrs}ชม ${mins}นาที ${secs}วิ` });
        }
        const rewards = await getSpinRewards();
        const index = Math.floor(Math.random() * rewards.length);
        const reward = rewards[index];
        user.balance = (parseFloat(user.balance) || 0) + reward;
        user.lastSpinTime = now;
        user.totalSpinRewards = (parseFloat(user.totalSpinRewards) || 0) + reward;
        await writeJSON('users', data);
        res.json({ success: true, reward, index, balance: user.balance, message: `🎉 ได้รับ ${reward} บาท` });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/user/spin-status', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const data = await readJSON('users');
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        const now = Date.now();
        let canSpin = true;
        let remainingMs = 0;
        if (user.lastSpinTime && (now - user.lastSpinTime) < 86400000) {
            canSpin = false;
            remainingMs = 86400000 - (now - user.lastSpinTime);
        }
        res.json({ success: true, canSpin, remainingMs, lastSpinTime: user.lastSpinTime || null });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/admin/spin-config', async (req, res) => {
    try {
        const { adminUsername, rewards } = req.body;
        if (!adminUsername) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const userData = await readJSON('users');
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) return res.json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        if (rewards) {
            if (!Array.isArray(rewards) || rewards.length < 2) return res.json({ success: false, message: 'ต้องมีอย่างน้อย 2 รางวัล' });
            await writeJSON('spinConfig', { rewards });
            return res.json({ success: true, message: 'บันทึกการตั้งค่าแล้ว!' });
        }
        const config = await readJSON('spinConfig');
        res.json({ success: true, config });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Main Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ===================== Start Server =====================

async function start() {
    await connectDB();

    // Initialize all collections
    await initCollection('users', { users: [] }, SEED_USERS_FILE);
    await initCollection('borrows', { borrows: [] }, SEED_BORROWS_FILE);
    await initCollection('notifications', { notifications: [] });
    await initCollection('paymentConfig', {
        truemoney: { accountNumber: '0000000000', accountName: 'TRUEMONEY', qrCodeUrl: null },
        bank: { accountNumber: '0000000000', accountName: '', bankName: 'ธนาคารกรุงเทพ', qrCodeUrl: null }
    });
    await initCollection('updates', { updates: [
        { id: 'upd1', title: 'เปิดตัวระบบ MONEY', description: 'ระบบยืมเงินสมัยใหม่ รองรับทุกการใช้งาน ยืม-คืน ง่าย สะดวก รวดเร็ว!', date: new Date().toISOString() }
    ] });
    await initCollection('spinConfig', { rewards: [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.10] });

    server.listen(PORT, HOST, () => {
        console.log(`✓ นาย ชาเย็น ระบบยืมเงิน`);
        console.log(`✓ URL: http://localhost:${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
