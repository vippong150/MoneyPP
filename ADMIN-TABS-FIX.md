# แก้ไขแท็บแอดมิน - Admin Tabs Fix

## วันที่: 3 กรกฎาคม 2026

---

## 🎯 ปัญหาที่แก้ไข

**ปัญหา**: สลิปคืนเงินที่ผู้เล่นแนบมาไปแสดงใน "คลังสลิปคืนเงิน" แทนที่จะแสดงใน "สลิปรอตรวจสอบ"

**สาเหตุ**: แท็บ "สลิปรอตรวจสอบ" โหลดข้อมูลจาก API เก่าที่ไม่มีสลิปคืนเงิน

---

## ✅ การแก้ไข

### 1. เปลี่ยนชื่อแท็บให้ชัดเจน

#### แท็บที่ 2: "สลิปรอตรวจสอบ" → "สลิปคืนเงินรอตรวจสอบ"
```html
<!-- เดิม -->
<div class="tab" onclick="switchTab('slips')">
    <i class="fas fa-receipt"></i> สลิปรอตรวจสอบ
    <span class="badge" id="slipCount">0</span>
</div>

<!-- ใหม่ -->
<div class="tab" onclick="switchTab('slips')">
    <i class="fas fa-receipt"></i> สลิปคืนเงินรอตรวจสอบ
    <span class="badge" id="slipCount">0</span>
</div>
```

#### แท็บที่ 3: "คลังสลิปคืนเงิน" → "คลังสลิป (ทั้งหมด)"
```html
<!-- เดิม -->
<div class="tab" onclick="switchTab('returnSlips')">
    <i class="fas fa-images"></i> คลังสลิปคืนเงิน
</div>

<!-- ใหม่ -->
<div class="tab" onclick="switchTab('returnSlips')">
    <i class="fas fa-images"></i> คลังสลิป (ทั้งหมด)
</div>
```

---

### 2. อัพเดตฟังก์ชัน `loadSlips()`

#### เดิม: โหลดจาก `/api/admin/slips` (ไม่มีสลิปคืนเงิน)
```javascript
async function loadSlips() {
    const res = await fetch('/api/admin/slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername })
    });
    const data = await res.json();
    // แสดงทั้งหมด
}
```

#### ใหม่: โหลดจาก `/api/admin/return-slips` + กรอง return_pending เท่านั้น
```javascript
async function loadSlips() {
    const res = await fetch('/api/admin/return-slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername })
    });
    const data = await res.json();
    
    // Filter only pending return slips
    const pendingSlips = data.slips?.filter(s => s.status === 'return_pending') || [];
    document.getElementById('slipCount').textContent = pendingSlips.length;
    
    if (data.success && pendingSlips.length > 0) {
        renderSlips(pendingSlips);
    } else {
        document.getElementById('slipGrid').innerHTML = 
            '<p>ไม่มีสลิปคืนเงินรออนุมัติ</p>';
    }
}
```

---

### 3. อัพเดตฟังก์ชัน `renderSlips()`

#### ใหม่: แสดงข้อมูลสลิปคืนเงิน + ปุ่มยืนยัน
```javascript
function renderSlips(slips) {
    const grid = document.getElementById('slipGrid');
    grid.innerHTML = slips.map(slip => {
        const borrowDate = new Date(slip.borrowDate);
        const uploadDate = new Date(slip.slipUploadDate);
        const dueDate = new Date(slip.dueDate);
        const now = new Date();
        const isOverdue = now > dueDate;
        const hoursLeft = Math.max(0, (dueDate - now) / (1000 * 60 * 60));
        
        return `
        <div class="slip-item">
            <img src="${slip.slipUrl}" alt="Slip" class="slip-image">
            <div class="slip-info">
                <h3><i class="fas fa-user"></i> ${slip.username}</h3>
                <p><i class="fas fa-money-bill-wave"></i> ${slip.amount.toFixed(2)} บาท</p>
                <p><i class="fas fa-calendar"></i> วันที่ยืม: ${borrowDate.toLocaleDateString('th-TH')}</p>
                <p><i class="fas fa-clock"></i> อัปโหลดสลิป: ${uploadDate.toLocaleString('th-TH')}</p>
                <p><i class="fas fa-hourglass-end"></i> กำหนดคืน: ${dueDate.toLocaleString('th-TH')}</p>
                <p style="color:${isOverdue ? '#ff4757' : '#ffc107'};">
                    ${isOverdue ? 'เกินเวลาแล้ว!' : `เหลือเวลา ${hoursLeft.toFixed(1)} ชม.`}
                </p>
                <p><i class="fas fa-hashtag"></i> ID: ${slip.id}</p>
            </div>
            <div>
                <button class="btn btn-success" onclick="approveReturnSlip('${slip.id}')">
                    <i class="fas fa-check-circle"></i> ยืนยันคืนเงิน
                </button>
            </div>
        </div>
        `;
    }).join('');
}
```

**ข้อมูลที่แสดง**:
- ✅ ชื่อผู้ใช้
- ✅ จำนวนเงิน
- ✅ วันที่ยืม
- ✅ วันที่อัปโหลดสลิป
- ✅ กำหนดคืน
- ✅ เวลาคงเหลือ / เกินเวลา
- ✅ ID รายการ
- ✅ ปุ่ม "ยืนยันคืนเงิน"

---

### 4. อัพเดตส่วน "คลังสลิป (ทั้งหมด)"

แสดงทั้งที่:
- ⏳ **รอตรวจสอบ** (`return_pending`) - มีปุ่มยืนยัน
- ✅ **อนุมัติแล้ว** (`completed`) - ไม่มีปุ่ม

```javascript
const statusColor = slip.status === 'completed' ? '#2ecc71' : '#ffc107';
const showApproveBtn = slip.status === 'return_pending';

// แสดงสถานะ
<div style="color:${statusColor};">
    ${showApproveBtn ? '⏳ รอตรวจสอบ' : '✅ อนุมัติแล้ว'}
</div>

// แสดงปุ่มเฉพาะที่รอตรวจสอบ
${showApproveBtn ? `
    <button onclick="approveReturnSlip('${slip.id}')">
        <i class="fas fa-check-circle"></i> ยืนยันคืนเงิน
    </button>
` : ''}
```

---

## 📊 การแสดงผลหลังแก้ไข

### แท็บที่ 2: "สลิปคืนเงินรอตรวจสอบ"

**แสดงเฉพาะ**: สลิปที่ผู้เล่นแนบมา สถานะ `return_pending`

```
┌────────────────────────────────────────────────────┐
│ สลิปคืนเงินรอตรวจสอบ                    [Badge: 2] │
├────────────────────────────────────────────────────┤
│                                                    │
│  [รูปสลิป]  👤 user1                    [ยืนยัน]  │
│              💰 15.00 บาท                          │
│              📅 วันที่ยืม: 3/7/2026                │
│              ⏰ อัปโหลด: 3/7/2026 14:20            │
│              ⏳ กำหนดคืน: 4/7/2026 06:25          │
│              ⏱️ เหลือเวลา 16.1 ชม.                │
│              #️⃣ ID: borrow123                     │
│                                                    │
├────────────────────────────────────────────────────┤
│  [รูปสลิป]  👤 user2                    [ยืนยัน]  │
│              💰 20.00 บาท                          │
│              ...                                   │
└────────────────────────────────────────────────────┘
```

### แท็บที่ 3: "คลังสลิป (ทั้งหมด)"

**แสดงทั้งหมด**: รอตรวจสอบ + อนุมัติแล้ว

```
┌──────────────┬──────────────┬──────────────┐
│  [รูปสลิป]  │  [รูปสลิป]  │  [รูปสลิป]  │
│  user1       │  user2       │  user3       │
│  15.00 บาท   │  20.00 บาท   │  10.00 บาท   │
│  3 ก.ค. 66   │  2 ก.ค. 66   │  1 ก.ค. 66   │
│  14:20       │  10:15       │  09:30       │
│              │              │              │
│ ⏳ รอตรวจสอบ│ ⏳ รอตรวจสอบ│ ✅ อนุมัติแล้ว│
│ [ยืนยัน]    │ [ยืนยัน]    │              │
└──────────────┴──────────────┴──────────────┘
```

---

## 🔄 Flow การทำงานที่ถูกต้อง

```
1. ผู้เล่นแนบสลิปคืนเงิน
   ↓
2. แสดงใน "สลิปคืนเงินรอตรวจสอบ" (แท็บ 2)
   - สถานะ: return_pending
   - Badge: แสดงจำนวน
   - มีปุ่ม "ยืนยันคืนเงิน"
   ↓
3. DEV กดยืนยัน
   ↓
4. สถานะเปลี่ยนเป็น completed
   ↓
5. หายจาก "สลิปรอตรวจสอบ"
   ↓
6. แสดงใน "คลังสลิป (ทั้งหมด)" (แท็บ 3)
   - สถานะ: ✅ อนุมัติแล้ว
   - ไม่มีปุ่มยืนยัน
```

---

## ✅ สรุปการแก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| **admin.html** | ✅ เปลี่ยนชื่อแท็บ 2 และ 3 |
| **admin.html** | ✅ แก้ `loadSlips()` โหลดจาก `/api/admin/return-slips` |
| **admin.html** | ✅ กรองเฉพาะ `return_pending` |
| **admin.html** | ✅ แก้ `renderSlips()` แสดงข้อมูลครบถ้วน |
| **admin.html** | ✅ เพิ่มข้อมูล: วันที่ยืม, กำหนดคืน, เวลาคงเหลือ |

---

## 🎉 ผลลัพธ์

### ก่อนแก้:
- ❌ สลิปคืนเงินไปอยู่ "คลังสลิป" ทันที
- ❌ ไม่มีที่แสดงสลิปที่รอตรวจสอบ
- ❌ ไม่เห็นว่าใครแนบมาบ้าง

### หลังแก้:
- ✅ สลิปคืนเงินแสดงใน "สลิปคืนเงินรอตรวจสอบ" (แท็บ 2)
- ✅ แสดงเฉพาะที่รอตรวจสอบ (`return_pending`)
- ✅ มี Badge แสดงจำนวน
- ✅ แสดงข้อมูลครบ: ชื่อ, จำนวน, วันที่, เวลาคงเหลือ
- ✅ มีปุ่มยืนยันชัดเจน
- ✅ หลังยืนยันไปแสดงใน "คลังสลิป (ทั้งหมด)"

---

**สร้างโดย**: Kiro AI  
**วันที่**: 3 กรกฎาคม 2026  
**สถานะ**: ✅ เสร็จสมบูรณ์
