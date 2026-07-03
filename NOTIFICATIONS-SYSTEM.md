# ระบบการแจ้งเตือน - Notifications System

## วันที่: 3 กรกฎาคม 2026

---

## 🎯 ฟีเจอร์ใหม่

### ✅ ระบบการแจ้งเตือนแบบสมบูรณ์:
1. **เก็บประวัติการแจ้งเตือน** - บันทึกทุกการแจ้งเตือนพร้อมวันที่ เวลา
2. **แจ้งเตือนอัตโนมัติเมื่อ**:
   - ✅ ได้รับเงินแล้ว (แอดมินอนุมัติ)
   - 🎉 คืนเงินสำเร็จแล้ว (แอดมินยืนยัน)
3. **ดูประวัติย้อนหลัง** - ดูการแจ้งเตือนทั้งหมด
4. **Badge แสดงจำนวน** - จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
5. **ทำเครื่องหมายอ่านแล้ว** - คลิกเพื่ออ่าน หรือทำเครื่องหมายทั้งหมด

---

## 📁 ไฟล์ที่สร้าง/แก้ไข

### 1. **notifications.json** (ใหม่)
ไฟล์เก็บข้อมูลการแจ้งเตือนทั้งหมด:
```json
{
  "notifications": [
    {
      "id": "notif1735896325000",
      "username": "user1",
      "type": "approved",
      "title": "✅ ได้รับเงินแล้ว!",
      "message": "คำขอยืม 15.00 บาท ได้รับการอนุมัติแล้ว",
      "amount": 15.00,
      "borrowId": "borrow1735896300000",
      "date": "2026-07-03T07:25:25.000Z",
      "read": false
    },
    {
      "id": "notif1735896400000",
      "username": "user1",
      "type": "return_approved",
      "title": "🎉 คืนเงินสำเร็จ! (ตรงเวลา)",
      "message": "คืนเงิน 15.00 บาท สำเร็จ! คุณได้รับ +1 แต้ม 🎉",
      "amount": 15.00,
      "borrowId": "borrow1735896300000",
      "pointsAwarded": 1,
      "date": "2026-07-03T07:30:00.000Z",
      "read": false
    }
  ]
}
```

---

### 2. **server.js** (Backend)

#### เพิ่ม NOTIFICATIONS_FILE:
```javascript
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
initFile(NOTIFICATIONS_FILE, { notifications: [] });
```

#### อัพเดต `/api/admin/approve-borrow`:
```javascript
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
```

#### อัพเดต `/api/admin/approve-return-slip`:
```javascript
// Create notification for user
const notifData = readJSON(NOTIFICATIONS_FILE) || { notifications: [] };
notifData.notifications.push({
    id: 'notif' + Date.now(),
    username: borrow.username,
    type: 'return_approved',
    title: returnedOnTime ? '🎉 คืนเงินสำเร็จ! (ตรงเวลา)' : '✅ คืนเงินสำเร็จ! (คืนช้า)',
    message: returnedOnTime ? 
        `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! คุณได้รับ +1 แต้ม 🎉` : 
        `คืนเงิน ${borrow.amount.toFixed(2)} บาท สำเร็จ! (คืนช้า ไม่ได้แต้ม)`,
    amount: borrow.amount,
    borrowId: borrow.id,
    pointsAwarded: returnedOnTime ? 1 : 0,
    date: now.toISOString(),
    read: false
});
writeJSON(NOTIFICATIONS_FILE, notifData);
```

#### API ใหม่:

**1. `/api/user/notifications` - ดึงการแจ้งเตือน**
```javascript
app.post('/api/user/notifications', (req, res) => {
    const { username } = req.body;
    const notifData = readJSON(NOTIFICATIONS_FILE);
    
    // Get user notifications
    const notifications = notifData.notifications
        .filter(n => n.username === username)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    res.json({ success: true, notifications, unreadCount });
});
```

**2. `/api/user/notifications/mark-read` - ทำเครื่องหมายอ่าน**
```javascript
app.post('/api/user/notifications/mark-read', (req, res) => {
    const { username, notificationId } = req.body;
    const notifData = readJSON(NOTIFICATIONS_FILE);
    
    if (notificationId) {
        // Mark specific notification as read
        const notif = notifData.notifications.find(
            n => n.id === notificationId && n.username === username
        );
        if (notif) notif.read = true;
    } else {
        // Mark all notifications as read
        notifData.notifications
            .filter(n => n.username === username)
            .forEach(n => n.read = true);
    }
    
    writeJSON(NOTIFICATIONS_FILE, notifData);
    res.json({ success: true });
});
```

---

### 3. **dashboard.html** (Frontend)

#### เพิ่มเมนู "การแจ้งเตือน":
```html
<button class="menu-item" onclick="showSection('notifications')">
    <i class="fas fa-bell"></i> การแจ้งเตือน
    <span class="badge" id="notifBadge" style="display:none;">0</span>
</button>
```

#### เพิ่ม Section:
```html
<div class="section" id="section-notifications">
    <div class="section-header">
        <h2><i class="fas fa-bell"></i> การแจ้งเตือน</h2>
        <p>การแจ้งเตือนทั้งหมดของคุณ</p>
    </div>
    <div class="card">
        <div style="display:flex;justify-content:space-between;">
            <div class="card-title">ทั้งหมด</div>
            <button onclick="markAllAsRead()">
                <i class="fas fa-check-double"></i> ทำเครื่องหมายอ่านทั้งหมด
            </button>
        </div>
        <div id="notificationsGrid"></div>
    </div>
</div>
```

#### ฟังก์ชัน JavaScript:

**1. `loadNotifications()` - โหลดการแจ้งเตือน**
```javascript
async function loadNotifications() {
    const username = sessionStorage.getItem('username');
    const res = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    
    // Update badge
    const badge = document.getElementById('notifBadge');
    if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
    
    // Render notifications
    // ...
}
```

**2. `markAsRead(notificationId)` - ทำเครื่องหมายอ่าน**
```javascript
async function markAsRead(notificationId) {
    const username = sessionStorage.getItem('username');
    await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, notificationId })
    });
    loadNotifications();
}
```

**3. `markAllAsRead()` - ทำเครื่องหมายอ่านทั้งหมด**
```javascript
async function markAllAsRead() {
    const username = sessionStorage.getItem('username');
    await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    showToast('ทำเครื่องหมายอ่านทั้งหมดแล้ว', 'success');
    loadNotifications();
}
```

#### Auto-Refresh:
```javascript
setInterval(() => {
    loadActiveBorrows();
    loadUserData();
    loadRecentReturnHistory();
    loadNotifications(); // ← เพิ่มบรรทัดนี้
}, 5000);
```

---

## 🎨 การแสดงผล

### เมนู "การแจ้งเตือน":
```
┌──────────────────────────────────────┐
│ 🔔 การแจ้งเตือน           [Badge: 2]│
└──────────────────────────────────────┘
```

### หน้าการแจ้งเตือน:
```
┌──────────────────────────────────────────────────┐
│ 📬 ทั้งหมด          [ทำเครื่องหมายอ่านทั้งหมด] │
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌──────────────────────────────────────────┐ ● │ ← จุดสีฟ้า = ยังไม่อ่าน
│ │ ✅ ได้รับเงินแล้ว!                       │   │
│ │ คำขอยืม 15.00 บาท ได้รับการอนุมัติแล้ว  │   │
│ │ 📅 3 กรกฎาคม 2026  ⏰ 14:25             │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐ ● │
│ │ 🎉 คืนเงินสำเร็จ! (ตรงเวลา)             │   │
│ │ คืนเงิน 15.00 บาท สำเร็จ! +1 แต้ม 🎉   │   │
│ │ 📅 3 กรกฎาคม 2026  ⏰ 14:30             │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │ ← อ่านแล้ว (โปร่งใส)
│ │ ✅ ได้รับเงินแล้ว!                       │   │
│ │ คำขอยืม 20.00 บาท ได้รับการอนุมัติแล้ว  │   │
│ │ 📅 2 กรกฎาคม 2026  ⏰ 10:15             │   │
│ └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### ประเภทการแจ้งเตือน:

#### 1. ได้รับเงินแล้ว (approved):
```
┌────────────────────────────────────┐
│ ✅ ได้รับเงินแล้ว!               │
│ คำขอยืม 15.00 บาท ได้รับการอนุมัติ│
│ 📅 3 กรกฎาคม 2026 ⏰ 14:25       │
└────────────────────────────────────┘
สีพื้นหลัง: ฟ้า (gradient)
เส้นขอบ: #00d4ff
```

#### 2. คืนเงินสำเร็จ - ตรงเวลา:
```
┌────────────────────────────────────┐
│ 🎉 คืนเงินสำเร็จ! (ตรงเวลา)      │
│ คืนเงิน 15.00 บาท +1 แต้ม 🎉    │
│ 📅 3 กรกฎาคม 2026 ⏰ 14:30       │
└────────────────────────────────────┘
สีพื้นหลัง: เขียว (gradient)
เส้นขอบ: #2ecc71
```

#### 3. คืนเงินสำเร็จ - คืนช้า:
```
┌────────────────────────────────────┐
│ ✅ คืนเงินสำเร็จ! (คืนช้า)       │
│ คืนเงิน 20.00 บาท (ไม่ได้แต้ม)  │
│ 📅 2 กรกฎาคม 2026 ⏰ 10:15       │
└────────────────────────────────────┘
สีพื้นหลัง: เขียว (gradient)
เส้นขอบ: #2ecc71
```

---

## 🔄 Flow การทำงาน

### 1. แอดมินอนุมัติคำขอยืม:
```
1. DEV กด "อนุมัติ"
   ↓
2. Server สร้างการแจ้งเตือน (type: approved)
   ↓
3. บันทึกใน notifications.json
   ↓
4. ผู้เล่นเห็น Badge (1) ที่เมนู "การแจ้งเตือน"
   ↓
5. ผู้เล่นคลิกเข้าหน้า "การแจ้งเตือน"
   ↓
6. แสดง "✅ ได้รับเงินแล้ว!" พร้อมวันที่ เวลา
```

### 2. แอดมินยืนยันการคืนเงิน:
```
1. DEV กด "ยืนยันคืนเงิน"
   ↓
2. Server ตรวจสอบคืนตรงเวลาหรือไม่
   ↓
3. สร้างการแจ้งเตือน (type: return_approved)
   ↓
4. บันทึกใน notifications.json
   ↓
5. ผู้เล่นเห็น Badge (2)
   ↓
6. แสดง "🎉 คืนเงินสำเร็จ!" พร้อมแต้มที่ได้
```

### 3. ทำเครื่องหมายอ่าน:
```
1. ผู้เล่นคลิกที่การแจ้งเตือน
   ↓
2. เรียก API /api/user/notifications/mark-read
   ↓
3. อัพเดต read: true
   ↓
4. Badge ลดลง (2 → 1)
   ↓
5. การแจ้งเตือนเปลี่ยนเป็นโปร่งใส (opacity: 0.6)
   ↓
6. จุดสีฟ้าหาย
```

---

## ✅ คุณสมบัติ

### การแจ้งเตือน:
- ✅ เก็บประวัติย้อนหลังทั้งหมด
- ✅ แสดงวันที่ + เวลาที่แจ้งเตือน
- ✅ จำแนกประเภท (ได้รับเงิน / คืนเงิน)
- ✅ แสดงจำนวนเงิน
- ✅ แสดงแต้มที่ได้ (สำหรับคืนเงิน)
- ✅ สีสันสวยงาม (ฟ้า / เขียว)
- ✅ Hover effect (เลื่อนขึ้น + เงา)

### Badge:
- ✅ แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
- ✅ สีแดง (#ff6b9d)
- ✅ อัพเดตอัตโนมัติทุก 5 วินาที
- ✅ ซ่อนเมื่อไม่มีการแจ้งเตือน

### สถานะอ่าน/ยังไม่อ่าน:
- ✅ ยังไม่อ่าน: opacity 1.0 + จุดสีฟ้า
- ✅ อ่านแล้ว: opacity 0.6 + ไม่มีจุด
- ✅ คลิกเพื่อทำเครื่องหมายอ่าน
- ✅ ปุ่ม "ทำเครื่องหมายอ่านทั้งหมด"

### Auto-Refresh:
- ✅ รีเฟรชทุก 5 วินาที
- ✅ อัพเดต Badge อัตโนมัติ
- ✅ แสดงการแจ้งเตือนใหม่ทันที

---

## 🎯 สรุป

### ก่อนอัพเดต:
- ❌ ไม่มีระบบการแจ้งเตือน
- ❌ ไม่รู้ว่าคำขอถูกอนุมัติหรือยัง
- ❌ ไม่รู้ว่าคืนเงินสำเร็จหรือยัง

### หลังอัพเดต:
- ✅ มีระบบการแจ้งเตือนแบบสมบูรณ์
- ✅ เก็บประวัติการแจ้งเตือนทั้งหมด
- ✅ แสดงวันที่ + เวลา
- ✅ แยกประเภท (ได้รับเงิน / คืนเงิน)
- ✅ Badge แสดงจำนวน
- ✅ ทำเครื่องหมายอ่าน/ยังไม่อ่าน
- ✅ สวยงาม สบายตา
- ✅ Auto-Refresh ทุก 5 วินาที

---

**สร้างโดย**: Kiro AI  
**วันที่**: 3 กรกฎาคม 2026  
**สถานะ**: ✅ เสร็จสมบูรณ์
