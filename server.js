const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8080;
const HOST = '0.0.0.0';

app.use(express.json());
app.use(express.static('public'));
app.use('/VIEDD', express.static('VIEDD'));

// === Data Files ===
const USERS_FILE = path.join(__dirname, 'users.json');
const BORROWS_FILE = path.join(__dirname, 'borrows.json');
const UPDATES_FILE = path.join(__dirname, 'updates.json');

function initFile(file, defaultData) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData));
    }
}

initFile(USERS_FILE, { users: [] });
initFile(BORROWS_FILE, { borrows: [] });
initFile(UPDATES_FILE, { updates: [
    {
        id: 'upd1',
        title: 'เปิดตัวระบบยืมเงิน',
        description: 'ระบบยืมเงินอัจฉริยะ พร้อมให้บริการแล้ววันนี้!',
        date: new Date().toISOString()
    }
] });

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
            role: 'user',
            createdAt: new Date().toISOString(),
            points: 50,
            totalBorrowed: 0,
            pendingBorrows: 0,
            approvedBorrows: 0
        };
        
        data.users.push(newUser);
        writeJSON(USERS_FILE, data);
        
        res.json({ success: true, message: 'สมัครสำเร็จ!', user: { username: newUser.username, role: newUser.role } });
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

// === User Info API ===
app.post('/api/user/info', (req, res) => {
    try {
        const { username } = req.body;
        const data = readJSON(USERS_FILE);
        if (!data) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = data.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        // Calculate stats from borrows
        const borrowData = readJSON(BORROWS_FILE);
        let totalBorrowed = 0, pendingBorrows = 0, approvedBorrows = 0;
        if (borrowData && borrowData.borrows) {
            const userBorrows = borrowData.borrows.filter(b => b.username === username);
            totalBorrowed = userBorrows.reduce((sum, b) => sum + b.amount, 0);
            pendingBorrows = userBorrows.filter(b => b.status === 'pending').length;
            approvedBorrows = userBorrows.filter(b => b.status === 'approved' || b.status === 'completed').length;
        }
        
        res.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                points: user.points || 0,
                totalBorrowed,
                pendingBorrows,
                approvedBorrows
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Borrow API ===
app.post('/api/borrow/request', (req, res) => {
    try {
        const { username, amount, days, interest, total } = req.body;
        if (!username || !amount || !days) {
            return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        const usersData = readJSON(USERS_FILE);
        if (!usersData) return res.json({ success: false, message: 'เกิดข้อผิดพลาด' });
        
        const user = usersData.users.find(u => u.username === username);
        if (!user) return res.json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        const borrowData = readJSON(BORROWS_FILE) || { borrows: [] };
        if (!borrowData.borrows) borrowData.borrows = [];
        
        const newBorrow = {
            id: 'borrow' + Date.now(),
            username,
            amount: parseFloat(amount),
            days: parseInt(days),
            interest: interest !== undefined ? parseFloat(interest) : 0,
            total: total !== undefined ? parseFloat(total) : parseFloat(amount),
            status: 'pending',
            date: new Date().toISOString()
        };
        
        borrowData.borrows.push(newBorrow);
        writeJSON(BORROWS_FILE, borrowData);
        
        res.json({ success: true, message: 'ส่งคำขอยืมเงินสำเร็จ!', borrow: newBorrow });
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
