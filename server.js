const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `slip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('รองรับเฉพาะไฟล์ภาพหรือ PDF เท่านั้น'));
        }
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/VIEDD', express.static(path.join(__dirname, 'VIEDD')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === Data Files ===
const USERS_FILE = path.join(__dirname, 'users.json');
const BORROWS_FILE = path.join(__dirname, 'borrows.json');
const UPDATES_FILE = path.join(__dirname, 'updates.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const PAYMENT_CONFIG_FILE = path.join(__dirname, 'payment-config.json');

function initFile(file, defaultData) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData));
    }
}

initFile(USERS_FILE, { users: [] });
initFile(BORROWS_FILE, { borrows: [] });
initFile(NOTIFICATIONS_FILE, { notifications: [] });
initFile(PAYMENT_CONFIG_FILE, {
    truemoney: {
        accountNumber: '0000000000',
        accountName: 'TRUEMONEY',
        qrCodeUrl: null
    },
    bank: {
        accountNumber: '0000000000',
        accountName: '',
        bankName: 'ธนาคารกรุงเทพ',
        qrCodeUrl: null
    }
});
initFile(UPDATES_FILE, { updates: [
    {
        id: 'upd1',
        title: 'เปิดตัวระบบ MONEY',
        description: 'ระบบยืมเงินสมัยใหม่ รองรับทุกการใช้งาน ยืม-คืน ง่าย สะดวก รวดเร็ว!',
        date: new Date().toISOString()
    }
] });

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

function readJSON(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { return null; }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// === Auth API ===
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        if (data.users.find(u => u.username === username)) {
            return res.json({ success: false, message: 'มีชื่อผู้ใช้นี้แล้ว' });
        }
        
        const newUser = {
            userId: 'user' + Date.now(),
            username,
            password,
            phone: '',
            wallet: '',
            fullName: '',
            verified: false, // ยังไม่ยืนยันตัวตน
            role: 'user',
            createdAt: new Date().toISOString(),
            points: 50,  // เปลี่ยนจาก credits เป็น points เริ่มต้น 50
            level: 1,    // เลเวลเริ่มต้น
            maxDailyBorrow: 100,  // เลเวล 1 ยืมได้ 100฿
            totalBorrowed: 0,
            pendingBorrows: 0,
            approvedBorrows: 0,
            completedBorrows: 0,  // จำนวนครั้งที่คืนตรงเวลา
            balance: 0.00  // กระเป๋าเงิน เริ่มต้น 0 บาท (สามารถติดลบได้)
        };
        
        data.users.push(newUser);
        writeJSON(USERS_FILE, data);
        
        res.json({ success: true, message: 'สมัครสำเร็จ! คุณได้รับ 50 แต้ม (เลเวล 1)', user: { username: newUser.username, role: newUser.role } });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = data.users.find(u => u.username === username && u.password === password);
        
        if (user) {
            res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ!', user: { username: user.username, role: user.role } });
        } else {
            res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผิด' });
        }
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Verify Identity API ===
app.post('/api/user/verify', (req, res) => {
    try {
        const { username, fullName, wallet } = req.body;
        
        if (!username || !fullName || !wallet) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        if (user.verified) {
            return res.json({ success: false, message: 'คุณยืนยันตัวตนแล้ว' });
        }
        
        user.fullName = fullName;
        user.wallet = wallet;
        user.verified = true;
        user.verifiedAt = new Date().toISOString();
        
        writeJSON(USERS_FILE, data);
        
        res.json({ success: true, message: 'ยืนยันตัวตนสำเร็จ! ตอนนี้คุณสามารถยืมเงินได้แล้ว' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === User Info API ===
app.post('/api/user/info', (req, res) => {
    try {
        const { username } = req.body;
        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        // Initialize points and level if not exists
        if (user.points === undefined) user.points = 50;
        if (user.level === undefined) user.level = 1;
        if (user.completedBorrows === undefined) user.completedBorrows = 0;
        
        // Calculate level and maxDailyBorrow based on points
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
        
        user.level = calculateLevel(user.points);
        user.maxDailyBorrow = 50 + (user.level * 50); // เลเวล 1 = 100฿, เลเวล 2 = 150฿, ... เลเวล 20 = 1050฿
        
        // Check and deduct points for overdue borrows
        const borrowData = readJSON(BORROWS_FILE);
        let totalBorrowed = 0, pendingBorrows = 0, approvedBorrows = 0, completedBorrows = 0;
        let totalPointsToDeduct = 0;
        
        if (borrowData && borrowData.borrows) {
            const userBorrows = borrowData.borrows.filter(b => b.username === username);
            totalBorrowed = userBorrows.reduce((sum, b) => sum + b.amount, 0);
            pendingBorrows = userBorrows.filter(b => b.status === 'pending').length;
            approvedBorrows = userBorrows.filter(b => b.status === 'approved').length;
            completedBorrows = userBorrows.filter(b => b.status === 'completed' && b.returnedOnTime).length;
            
            // Count late returns and total points deducted
            const lateBorrows = userBorrows.filter(b => b.status === 'completed' && !b.returnedOnTime);
            const lateReturnsCount = lateBorrows.length;
            const totalPointsDeducted = userBorrows.reduce((sum, b) => sum + (b.pointsDeducted || 0), 0);
            
            // Check for overdue borrows and calculate points to deduct
            const now = new Date();
            userBorrows.forEach(borrow => {
                if (borrow.status === 'approved' && borrow.approvedDate) {
                    const approvedDate = new Date(borrow.approvedDate);
                    const dueDate = new Date(approvedDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours
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
            
            // Deduct points
            if (totalPointsToDeduct > 0) {
                user.points = Math.max(0, user.points - totalPointsToDeduct);
                user.level = calculateLevel(user.points);
                user.maxDailyBorrow = 50 + (user.level * 50);
                writeJSON(USERS_FILE, data);
                writeJSON(BORROWS_FILE, borrowData);
            }
            
            // Calculate active borrow total
            const activeBorrows = userBorrows.filter(b => 
                b.status === 'pending' || b.status === 'approved' || b.status === 'slip_uploaded'
            );
            const activeBorrowTotal = activeBorrows.reduce((sum, b) => sum + (b.amount || 0), 0);
            
            user.lateReturnsCount = lateReturnsCount;
            user.totalPointsDeducted = totalPointsDeducted;
            user.activeBorrowTotal = activeBorrowTotal;
        }
        
        user.completedBorrows = completedBorrows;
        writeJSON(USERS_FILE, data);
        
        res.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                points: user.points,
                level: user.level,
                maxDailyBorrow: user.maxDailyBorrow,
                balance: user.balance !== undefined ? user.balance : 0.00,
                phone: user.phone || '',
                wallet: user.wallet || '',
                fullName: user.fullName || '',
                verified: user.verified || false,
                totalBorrowed,
                pendingBorrows,
                approvedBorrows,
                completedBorrows,
                lateReturnsCount: user.lateReturnsCount || 0,
                totalPointsDeducted: user.totalPointsDeducted || 0,
                activeBorrowTotal: user.activeBorrowTotal || 0,
                remainingLimit: calculateRemainingLimit(user)
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Helper function: Calculate remaining limit (subtract negative balance)
function calculateRemainingLimit(user) {
    let limit = user.maxDailyBorrow - (user.activeBorrowTotal || 0);
    const balance = user.balance !== undefined ? user.balance : 0;
    
    // ถ้ากระเป๋าติดลบ ให้หักออกจากลิมิตที่ยืมได้
    if (balance < 0) {
        limit += balance; // balance เป็นลบอยู่แล้ว เลยใช้ +
    }
    
    return Math.max(0, limit); // ไม่ให้ติดลบ
}

// === Borrow API ===
app.post('/api/borrow/request', (req, res) => {
    try {
        const { username, amount, days, interest, total, walletNumber, accountName } = req.body;
        if (!username || !amount || !days) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        if (!walletNumber || !accountName) {
            return res.json({ success: false, message: 'กรุณากรอกเบอร์วอเลทและชื่อบัญชีให้ครบ' });
        }
        
        const usersData = readJSON(USERS_FILE);
        if (!usersData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = usersData.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        // Check if user is verified
        if (!user.verified) {
            return res.json({ success: false, message: 'กรุณายืนยันตัวตนก่อนยืมเงิน (ไปเมนู "ยืนยันตัวตน")' });
        }
        
        // Initialize points and calculate level
        if (user.points === undefined) user.points = 50;
        if (user.level === undefined) user.level = 1;
        
        // Recalculate level and maxDailyBorrow based on current points
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
        
        user.level = calculateLevel(user.points);
        user.maxDailyBorrow = 50 + (user.level * 50);
        
        // Save updated user data
        writeJSON(USERS_FILE, usersData);
        
        // Check points
        const userPoints = user.points || 50;
        if (userPoints <= 0) {
            return res.json({ success: false, message: 'แต้มของคุณหมดแล้ว ไม่สามารถยืมได้' });
        }
        
        // Check total active borrows (pending + approved but not completed)
        const borrowData = readJSON(BORROWS_FILE) || { borrows: [] };
        if (!borrowData.borrows) borrowData.borrows = [];
        
        const activeBorrows = borrowData.borrows.filter(b => 
            b.username === username && 
            (b.status === 'pending' || b.status === 'approved' || b.status === 'slip_uploaded')
        );
        
        const totalActiveBorrowAmount = activeBorrows.reduce((sum, b) => sum + b.amount, 0);
        
        // Check daily limit based on level
        const maxBorrow = user.maxDailyBorrow;
        const borrowAmount = parseFloat(amount);
        const remainingLimit = maxBorrow - totalActiveBorrowAmount;
        
        if (remainingLimit <= 0) {
            return res.json({ 
                success: false, 
                message: `คุณยืมไปแล้ว ${totalActiveBorrowAmount} บาท (เต็มลิมิต) กรุณาคืนเงินก่อนยืมใหม่` 
            });
        }
        
        if (borrowAmount < 1 || borrowAmount > remainingLimit) {
            return res.json({ 
                success: false, 
                message: `คุณยืมไปแล้ว ${totalActiveBorrowAmount} บาท / ${maxBorrow} บาท | ยืมได้อีก ${remainingLimit} บาท` 
            });
        }
        
        const now = new Date();
        
        // Calculate interest: 1% per day (10 บาท ต่อ 0.10 บาท)
        const interestRate = 0.01; // 1% = 0.01
        const calculatedInterest = parseFloat(interest) || 0;
        const calculatedTotal = parseFloat(total) || borrowAmount;
        
        const newBorrow = {
            id: 'borrow' + Date.now(),
            username,
            amount: borrowAmount,
            days: parseInt(days),
            walletNumber: walletNumber,
            accountName: accountName,
            interest: calculatedInterest,
            interestRate: interestRate,
            total: calculatedTotal,
            status: 'pending',
            date: now.toISOString(),
            approvedDate: null,
            dueDate: null,  // จะตั้งเมื่อแอดมินอนุมัติ
            slipUrl: null,
            pointsDeducted: 0,
            returnedOnTime: false
        };
        
        borrowData.borrows.push(newBorrow);
        writeJSON(BORROWS_FILE, borrowData);
        
        // Broadcast to admins
        io.emit('new-borrow-request', newBorrow);
        
        res.json({ success: true, message: 'ส่งคำขอยืมเงินสำเร็จ! รอแอดมินอนุมัติ', borrow: newBorrow });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/borrow/history', (req, res) => {
    try {
        const { username } = req.body;
        const data = readJSON(BORROWS_FILE);
        if (!data) return res.json({ success: true, history: [] });
        
        const history = data.borrows
            .filter(b => b.username === username)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({ success: true, history });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Slip Upload API (User returns money) ===
app.post('/api/borrow/upload-return-slip', upload.single('slip'), (req, res) => {
    try {
        const { borrowId, username } = req.body;
        
        if (!req.file) {
            return res.json({ success: false, message: 'กรุณาเลือกไฟล์สลิป' });
        }
        
        if (!borrowId || !username) {
            return res.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const borrow = borrowData.borrows.find(b => b.id === borrowId && b.username === username);
        if (!borrow) {
            return res.json({ success: false, message: 'ไม่พบรายการยืมนี้' });
        }
        
        // Allow upload for 'approved' or re-upload for 'return_pending'
        if (borrow.status !== 'approved' && borrow.status !== 'return_pending') {
            return res.json({ success: false, message: 'รายการนี้ไม่สามารถแนบสลิปได้' });
        }
        
        const isReUpload = borrow.status === 'return_pending';
        
        // Delete old slip file if re-uploading
        if (isReUpload && borrow.returnSlipUrl) {
            const oldSlipPath = path.join(__dirname, borrow.returnSlipUrl);
            if (fs.existsSync(oldSlipPath)) {
                try {
                    fs.unlinkSync(oldSlipPath);
                } catch (e) {
                    console.error('Failed to delete old slip:', e);
                }
            }
        }
        
        borrow.returnSlipUrl = `/uploads/${req.file.filename}`;
        borrow.returnSlipUploadDate = new Date().toISOString();
        borrow.status = 'return_pending';  // รอแอดมินอนุมัติการคืนเงิน
        
        writeJSON(BORROWS_FILE, borrowData);
        
        // Notify admin
        io.emit('return-slip-uploaded', {
            borrowId: borrow.id,
            username: borrow.username,
            amount: borrow.amount,
            slipUrl: borrow.returnSlipUrl,
            isReUpload: isReUpload
        });
        
        res.json({ 
            success: true, 
            message: isReUpload ? 
                'แก้ไขสลิปคืนเงินสำเร็จ! รอแอดมินตรวจสอบใหม่' : 
                'อัปโหลดสลิปคืนเงินสำเร็จ! รอแอดมินตรวจสอบและยืนยัน',
            slipUrl: borrow.returnSlipUrl
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// === Admin: Get All Slips ===
app.post('/api/admin/slips', (req, res) => {
    try {
        const { adminUsername } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: true, slips: [] });
        
        const slips = borrowData.borrows
            .filter(b => b.slipUrl && b.status === 'slip_uploaded')
            .sort((a, b) => new Date(b.slipUploadDate) - new Date(a.slipUploadDate));
        
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Get Pending Borrows ===
app.post('/api/admin/pending-borrows', (req, res) => {
    try {
        const { adminUsername } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: true, borrows: [] });
        
        const pending = borrowData.borrows
            .filter(b => b.status === 'pending')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(borrow => {
                // Add user info (fullName and verified wallet)
                const user = userData.users.find(u => u.username === borrow.username);
                return {
                    ...borrow,
                    userFullName: user?.fullName || 'ไม่ระบุ',
                    userVerifiedWallet: user?.wallet || 'ไม่ระบุ',
                    userVerified: user?.verified || false
                };
            });
        
        res.json({ success: true, borrows: pending });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Approve Borrow Request ===
app.post('/api/admin/approve-borrow', (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) {
            return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        }
        
        const now = new Date();
        const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        borrow.status = 'approved';
        borrow.approvedDate = now.toISOString();
        borrow.dueDate = dueDate.toISOString();
        borrow.approvedBy = adminUsername;
        
        writeJSON(BORROWS_FILE, borrowData);
        
        // Create notification for user
        const notifData = readJSON(NOTIFICATIONS_FILE) || { notifications: [] };
        notifData.notifications.push({
            id: 'notif' + Date.now(),
            username: borrow.username,
            type: 'approved',
            title: '✅ ได้รับเงินแล้ว!',
            message: `คำขอยืม ${borrow.amount.toFixed(2)} บาท ได้รับการอนุมัติแล้ว`,
            amount: borrow.amount,
            borrowId: borrow.id,
            date: now.toISOString(),
            read: false
        });
        writeJSON(NOTIFICATIONS_FILE, notifData);
        
        // Notify user
        io.emit('borrow-approved', {
            borrowId: borrow.id,
            username: borrow.username,
            amount: borrow.amount,
            walletNumber: borrow.walletNumber,
            dueDate: borrow.dueDate
        });
        
        res.json({ success: true, message: 'อนุมัติคำขอยืมสำเร็จ! เวลานับถอยหลัง 24 ชม. เริ่มแล้ว!', borrow });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Reject Borrow Request ===
app.post('/api/admin/reject-borrow', (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) {
            return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        }
        
        borrow.status = 'rejected';
        borrow.rejectedDate = new Date().toISOString();
        borrow.rejectedBy = adminUsername;
        
        writeJSON(BORROWS_FILE, borrowData);
        
        // Notify user
        io.emit('borrow-rejected', {
            borrowId: borrow.id,
            username: borrow.username
        });
        
        res.json({ success: true, message: 'ปฏิเสธคำขอยืมสำเร็จ!' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Register User (DEV only) ===
app.post('/api/admin/register-user', (req, res) => {
    try {
        const { adminUsername, username, password } = req.body;
        
        // Check if admin/dev
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        }
        
        if (!username || !password) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        if (userData.users.find(u => u.username === username)) {
            return res.json({ success: false, message: 'มีชื่อผู้ใช้นี้แล้ว' });
        }
        
        const newUser = {
            userId: 'user' + Date.now(),
            username,
            password,
            phone: '',
            wallet: '',
            fullName: '',
            verified: false,
            role: 'user',
            createdAt: new Date().toISOString(),
            points: 50,
            level: 1,
            maxDailyBorrow: 100,
            totalBorrowed: 0,
            pendingBorrows: 0,
            approvedBorrows: 0,
            completedBorrows: 0
        };
        
        userData.users.push(newUser);
        writeJSON(USERS_FILE, userData);
        
        res.json({ success: true, message: `สมัครสำเร็จ! ชื่อผู้ใช้: ${username} (50 แต้ม, เลเวล 1)` });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Get All Users ===
app.post('/api/admin/users', (req, res) => {
    try {
        const { adminUsername } = req.body;
        
        // Check if admin/dev
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        // Return all users with safe info (no passwords)
        const users = userData.users.map(u => ({
            userId: u.userId,
            username: u.username,
            role: u.role,
            level: u.level || 1,
            points: u.points || 50,
            maxDailyBorrow: u.maxDailyBorrow || 100,
            verified: u.verified || false,
            fullName: u.fullName || '',
            wallet: u.wallet || '',
            createdAt: u.createdAt
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Payment Config APIs ===

// Get Payment Config (Public - ทุกคนดูได้)
app.get('/api/payment/config', (req, res) => {
    try {
        const config = readJSON(PAYMENT_CONFIG_FILE);
        if (!config) {
            return res.json({ 
                success: false, 
                message: 'ไม่พบข้อมูลการชำระเงิน' 
            });
        }
        res.json({ success: true, config });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Update Payment Config (DEV only)
app.post('/api/admin/payment/config', (req, res) => {
    try {
        const { adminUsername, truemoney, bank } = req.body;
        
        // Check if admin/dev
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        }
        
        const config = readJSON(PAYMENT_CONFIG_FILE) || {
            truemoney: { accountNumber: '0000000000', accountName: 'TRUEMONEY', qrCodeUrl: null },
            bank: { accountNumber: '0000000000', accountName: '', bankName: 'ธนาคารกรุงเทพ', qrCodeUrl: null }
        };
        
        if (truemoney) {
            config.truemoney = { ...config.truemoney, ...truemoney };
        }
        
        if (bank) {
            config.bank = { ...config.bank, ...bank };
        }
        
        writeJSON(PAYMENT_CONFIG_FILE, config);
        
        res.json({ success: true, message: 'อัพเดตข้อมูลการชำระเงินสำเร็จ', config });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Upload Payment QR Code (DEV only)
app.post('/api/admin/payment/upload-qr', upload.single('qrImage'), (req, res) => {
    try {
        const { adminUsername, paymentType } = req.body; // paymentType: 'truemoney' or 'bank'
        
        if (!req.file) {
            return res.json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' });
        }
        
        // Check if admin/dev
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ DEV)' });
        }
        
        if (!['truemoney', 'bank'].includes(paymentType)) {
            return res.json({ success: false, message: 'ประเภทการชำระเงินไม่ถูกต้อง' });
        }
        
        const config = readJSON(PAYMENT_CONFIG_FILE);
        if (!config) {
            return res.json({ success: false, message: 'ไม่พบข้อมูลการชำระเงิน' });
        }
        
        const qrCodeUrl = `/uploads/${req.file.filename}`;
        config[paymentType].qrCodeUrl = qrCodeUrl;
        
        writeJSON(PAYMENT_CONFIG_FILE, config);
        
        res.json({ 
            success: true, 
            message: 'อัพโหลด QR Code สำเร็จ',
            qrCodeUrl 
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// === Admin: Upload Slip (for approved borrow) ===
app.post('/api/admin/upload-slip', upload.single('slip'), (req, res) => {
    try {
        const { borrowId, adminUsername } = req.body;
        
        if (!req.file) {
            return res.json({ success: false, message: 'กรุณาเลือกไฟล์สลิป' });
        }
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) {
            return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        }
        
        borrow.adminSlipUrl = `/uploads/${req.file.filename}`;
        borrow.adminSlipUploadDate = new Date().toISOString();
        borrow.adminSlipUploadedBy = adminUsername;
        
        writeJSON(BORROWS_FILE, borrowData);
        
        res.json({ 
            success: true, 
            message: 'อัปโหลดสลิปสำเร็จ!',
            slipUrl: borrow.adminSlipUrl
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
});

// === User: Get Admin Slips ===
app.post('/api/user/admin-slips', (req, res) => {
    try {
        const { username } = req.body;
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: true, slips: [] });
        
        // Get all borrows with admin slips for this user
        const slips = borrowData.borrows
            .filter(b => b.username === username && b.adminSlipUrl)
            .sort((a, b) => new Date(b.adminSlipUploadDate) - new Date(a.adminSlipUploadDate))
            .map(b => ({
                id: b.id,
                amount: b.amount,
                status: b.status,
                slipUrl: b.adminSlipUrl,
                uploadDate: b.adminSlipUploadDate,
                uploadedBy: b.adminSlipUploadedBy || 'Admin',
                borrowDate: b.date,
                approvedDate: b.approvedDate
            }));
        
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Get All Return Slips ===
app.post('/api/admin/return-slips', (req, res) => {
    try {
        const { adminUsername } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: true, slips: [] });
        
        // Get all borrows with user-uploaded return slips (pending and completed)
        const slips = borrowData.borrows
            .filter(b => b.returnSlipUrl && (b.status === 'return_pending' || b.status === 'completed'))
            .sort((a, b) => new Date(b.returnSlipUploadDate) - new Date(a.returnSlipUploadDate))
            .map(b => ({
                id: b.id,
                username: b.username,
                amount: b.amount,
                status: b.status,
                slipUrl: b.returnSlipUrl,
                slipUploadDate: b.returnSlipUploadDate,
                borrowDate: b.date,
                approvedDate: b.approvedDate,
                dueDate: b.dueDate,
                completedDate: b.completedDate,
                returnedOnTime: b.returnedOnTime
            }));
        
        res.json({ success: true, slips });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin: Approve Return Slip (Confirm Return) ===
app.post('/api/admin/approve-return-slip', (req, res) => {
    try {
        const { adminUsername, borrowId } = req.body;
        
        // Check if admin
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'dev')) {
            return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const borrow = borrowData.borrows.find(b => b.id === borrowId);
        if (!borrow) {
            return res.json({ success: false, message: 'ไม่พบรายการยืม' });
        }
        
        if (borrow.status !== 'return_pending') {
            return res.json({ success: false, message: 'รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบ' });
        }
        
        const now = new Date();
        const dueDate = new Date(borrow.dueDate);
        const returnedOnTime = now <= dueDate;
        
        borrow.status = 'completed';
        borrow.completedDate = now.toISOString();
        borrow.returnedOnTime = returnedOnTime;
        borrow.approvedBy = adminUsername;
        
        writeJSON(BORROWS_FILE, borrowData);
        
        // Update user points
        const user = userData.users.find(u => u.username === borrow.username);
        if (user) {
            if (user.points === undefined) user.points = 50;
            
            if (returnedOnTime) {
                user.points += 1;  // +1 แต้ม (คืนตรงเวลา)
            } else {
                // คืนช้า - หักแต้มตามจำนวนวันที่เกิน
                const timeDiff = now - dueDate;
                const daysLate = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
                const pointsToDeduct = daysLate;
                user.points = Math.max(0, user.points - pointsToDeduct); // หักแต้ม แต่ไม่ให้ติดลบ
                borrow.pointsDeducted = pointsToDeduct; // บันทึกจำนวนแต้มที่หัก
            }
            
            // Recalculate level
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
            
            const oldLevel = user.level || 1;
            user.level = calculateLevel(user.points);
            user.maxDailyBorrow = 50 + (user.level * 50);
            
            writeJSON(USERS_FILE, userData);
            
            // Notify user about level up
            if (user.level > oldLevel) {
                io.emit('level-up', {
                    username: user.username,
                    newLevel: user.level,
                    newLimit: user.maxDailyBorrow
                });
            }
        }
        
        // Create notification for user
        const notifData = readJSON(NOTIFICATIONS_FILE) || { notifications: [] };
        const pointsDeducted = borrow.pointsDeducted || 0;
        notifData.notifications.push({
            id: 'notif' + Date.now(),
            username: borrow.username,
            type: 'return_approved',
            title: returnedOnTime ? '🎉 คืนเงินสำเร็จ! (ตรงเวลา)' : '⚠️ คืนเงินสำเร็จ! (คืนช้า)',
            message: returnedOnTime ? 
                `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! คุณได้รับ +1 แต้ม 🎉` : 
                `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! (คืนช้า ${pointsDeducted} วัน หัก ${pointsDeducted} แต้ม)`,
            amount: borrow.amount,
            borrowId: borrow.id,
            pointsAwarded: returnedOnTime ? 1 : 0,
            pointsDeducted: returnedOnTime ? 0 : pointsDeducted,
            date: now.toISOString(),
            read: false
        });
        writeJSON(NOTIFICATIONS_FILE, notifData);
        
        // Notify user
        io.emit('return-approved', {
            borrowId: borrow.id,
            username: borrow.username,
            returnedOnTime: returnedOnTime,
            pointsAwarded: returnedOnTime ? 1 : 0,
            pointsDeducted: returnedOnTime ? 0 : pointsDeducted
        });
        
        res.json({ 
            success: true, 
            message: returnedOnTime ? 
                'ยืนยันการคืนเงินสำเร็จ! ผู้ใช้ได้รับ +1 แต้ม (คืนตรงเวลา) 🎉' : 
                `ยืนยันการคืนเงินสำเร็จ! (คืนช้า ${pointsDeducted} วัน หัก ${pointsDeducted} แต้ม)`
        });
    } catch (error) {
        console.error('Approve return slip error:', error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Admin/DEV: Adjust User Balance ===
app.post('/api/admin/adjust-balance', (req, res) => {
    try {
        const { adminUsername, targetUsername, amount, reason } = req.body;
        
        // Check if DEV
        const userData = readJSON(USERS_FILE);
        const admin = userData?.users.find(u => u.username === adminUsername);
        if (!admin || admin.role !== 'dev') {
            return res.json({ success: false, message: 'เฉพาะ DEV เท่านั้น!' });
        }
        
        const targetUser = userData.users.find(u => u.username === targetUsername);
        if (!targetUser) {
            return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
        
        // Initialize balance if not exists
        if (targetUser.balance === undefined) targetUser.balance = 0;
        
        const oldBalance = targetUser.balance;
        targetUser.balance = parseFloat((targetUser.balance + parseFloat(amount)).toFixed(2));
        
        writeJSON(USERS_FILE, userData);
        
        // Create notification for user
        const notifData = readJSON(NOTIFICATIONS_FILE) || { notifications: [] };
        notifData.notifications.push({
            id: 'notif' + Date.now(),
            username: targetUsername,
            type: amount > 0 ? 'balance_added' : 'balance_deducted',
            title: amount > 0 ? '💰 ได้รับเงินเข้ากระเป๋า' : '💸 เงินถูกหักออกจากกระเป๋า',
            message: `${amount > 0 ? '+' : ''}${parseFloat(amount).toFixed(2)} บาท${reason ? ` (${reason})` : ''}\nยอดคงเหลือ: ${targetUser.balance.toFixed(2)} บาท`,
            amount: parseFloat(amount),
            reason: reason || '',
            oldBalance: oldBalance,
            newBalance: targetUser.balance,
            date: new Date().toISOString(),
            read: false
        });
        writeJSON(NOTIFICATIONS_FILE, notifData);
        
        // Notify user
        io.emit('balance-updated', {
            username: targetUsername,
            oldBalance: oldBalance,
            newBalance: targetUser.balance,
            amount: parseFloat(amount)
        });
        
        res.json({ 
            success: true, 
            message: `ปรับยอดเงินสำเร็จ! ${targetUsername}: ${oldBalance.toFixed(2)} → ${targetUser.balance.toFixed(2)} บาท`,
            oldBalance: oldBalance,
            newBalance: targetUser.balance
        });
    } catch (error) {
        console.error('Adjust balance error:', error);
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === User: Get Return History ===
app.post('/api/user/return-history', (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        }
        
        const borrowData = readJSON(BORROWS_FILE);
        if (!borrowData) return res.json({ success: true, history: [] });
        
        // Get completed returns only
        const history = borrowData.borrows
            .filter(b => b.username === username && b.status === 'completed')
            .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
            .map(b => ({
                id: b.id,
                amount: b.amount,
                borrowDate: b.date,
                approvedDate: b.approvedDate,
                dueDate: b.dueDate,
                returnSlipUrl: b.returnSlipUrl,
                returnSlipUploadDate: b.returnSlipUploadDate,
                completedDate: b.completedDate,
                returnedOnTime: b.returnedOnTime,
                pointsAwarded: b.returnedOnTime ? 1 : 0,
                status: b.status
            }));
        
        res.json({ success: true, history });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Notifications API ===
app.post('/api/user/notifications', (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        }
        
        const notifData = readJSON(NOTIFICATIONS_FILE);
        if (!notifData) return res.json({ success: true, notifications: [], unreadCount: 0 });
        
        // Get user notifications
        const notifications = notifData.notifications
            .filter(n => n.username === username)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/user/notifications/mark-read', (req, res) => {
    try {
        const { username, notificationId } = req.body;
        
        if (!username) {
            return res.json({ success: false, message: 'ไม่พบชื่อผู้ใช้' });
        }
        
        const notifData = readJSON(NOTIFICATIONS_FILE);
        if (!notifData) return res.json({ success: false, message: 'ไม่พบข้อมูล' });
        
        if (notificationId) {
            // Mark specific notification as read
            const notif = notifData.notifications.find(n => n.id === notificationId && n.username === username);
            if (notif) notif.read = true;
        } else {
            // Mark all notifications as read
            notifData.notifications
                .filter(n => n.username === username)
                .forEach(n => n.read = true);
        }
        
        writeJSON(NOTIFICATIONS_FILE, notifData);
        res.json({ success: true, message: 'อัพเดตสถานะสำเร็จ' });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === System Updates API ===
app.get('/api/system/updates', (req, res) => {
    try {
        const data = readJSON(UPDATES_FILE);
        if (!data) return res.json({ success: true, updates: [] });
        
        const updates = data.updates.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ success: true, updates });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/system/update', (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        const data = readJSON(UPDATES_FILE) || { updates: [] };
        
        const newUpdate = {
            id: 'upd' + Date.now(),
            title,
            description,
            date: new Date().toISOString()
        };
        
        data.updates.push(newUpdate);
        writeJSON(UPDATES_FILE, data);
        
        // Broadcast update via socket
        io.emit('system-update', newUpdate);
        
        res.json({ success: true, message: 'เพิ่มอัพเดตสำเร็จ!', update: newUpdate });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Daily Spin ===
app.post('/api/user/daily-spin', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });

        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });

        const today = new Date().toDateString();
        if (user.lastSpinDate === today) {
            return res.json({ success: false, message: 'คุณหมุนวันนี้แล้ว กลับมาหมุนใหม่วันพรุ่งนี้' });
        }

        const rewards = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.10];
        const index = Math.floor(Math.random() * rewards.length);
        const reward = rewards[index];

        user.balance = (parseFloat(user.balance) || 0) + reward;
        user.lastSpinDate = today;
        user.totalSpinRewards = (parseFloat(user.totalSpinRewards) || 0) + reward;

        writeJSON(USERS_FILE, data);

        res.json({ success: true, reward, index, balance: user.balance, message: `🎉 ได้รับ ${reward} บาท` });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/user/spin-status', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });

        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });

        const today = new Date().toDateString();
        const canSpin = user.lastSpinDate !== today;

        res.json({ success: true, canSpin, lastSpinDate: user.lastSpinDate || null });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Main Page ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// === Socket.IO ===
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`✓ นาย ชาเย็น ระบบยืมเงิน`);
    console.log(`✓ URL: http://localhost:${PORT}`);
});
