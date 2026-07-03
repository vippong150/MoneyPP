# 🧮 ตารางคำนวณ 1-15 วัน - สวยงามทันสมัย!

## ✨ **ฟีเจอร์ใหม่:**

### 📊 **ตารางแสดงผล 1-15 วัน แบบเต็ม**
ผู้ใช้สามารถดูตารางเต็มที่แสดงดอกเบี้ยและยอดชำระสำหรับวันที่ 1-15 แบบเรียลไทม์!

---

## 🎯 **วิธีใช้งาน:**

### ขั้นตอนที่ 1: กรอกจำนวนเงิน
```
กรอกจำนวนเงิน เช่น: 100 บาท
(หรือเลือกจากแพ็กเกจ: 10฿ / 50฿ / 100฿)
```

### ขั้นตอนที่ 2: คลิกปุ่ม "แสดงตารางคำนวณ 1-15 วัน"
```
[📊 แสดงตารางคำนวณ 1-15 วัน ▼]
```

### ขั้นตอนที่ 3: ดูตารางเต็ม
```
┌──────────────────────────────────────────┐
│ จำนวนเงินที่ยืม: 100 บาท                │
├──────┬──────────┬───────────┬────────────┤
│ วัน  │ ดอกเบี้ย │ ยอดชำระ   │ สถานะ      │
├──────┼──────────┼───────────┼────────────┤
│  1   │ 0% (0฿)  │ 100.00 ฿  │ ✓ ไม่มีดอก │ 🟢
│  2   │ 1% (1฿)  │ 101.00 ฿  │ ⚠️ ดอกต่ำ  │ 🟡
│  3   │ 2% (2฿)  │ 102.00 ฿  │ ⚠️ ดอกต่ำ  │ 🟡
│  4   │ 3% (3฿)  │ 103.00 ฿  │ ⚠️ ดอกปานกลาง │ 🟠
│  5   │ 4% (4฿)  │ 104.00 ฿  │ ⚠️ ดอกปานกลาง │ 🟠
│  6   │ 5% (5฿)  │ 105.00 ฿  │ ⚠️ ดอกปานกลาง │ 🟠
│  7   │ 6% (6฿)  │ 106.00 ฿  │ ⚠️ ดอกปานกลาง │ 🟠
│  8   │ 7% (7฿)  │ 107.00 ฿  │ ❌ ดอกสูง  │ 🔴
│  9   │ 8% (8฿)  │ 108.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 10   │ 9% (9฿)  │ 109.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 11   │ 10% (10฿)│ 110.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 12   │ 11% (11฿)│ 111.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 13   │ 12% (12฿)│ 112.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 14   │ 13% (13฿)│ 113.00 ฿  │ ❌ ดอกสูง  │ 🔴
│ 15   │ 14% (14฿)│ 114.00 ฿  │ ❌ ดอกสูง  │ 🔴
└──────┴──────────┴───────────┴────────────┘
```

---

## 🎨 **สีสันและสถานะ:**

### 🟢 วันที่ 1 - ไม่มีดอกเบี้ย
```
สีเขียว (rgba(46,204,113,0.08))
✓ ไม่มีดอก
ดอกเบี้ย: 0%
```

### 🟡 วันที่ 2-3 - ดอกเบี้ยต่ำ
```
สีเหลือง (rgba(255,193,7,0.05))
⚠️ ดอกต่ำ
ดอกเบี้ย: 1-2%
```

### 🟠 วันที่ 4-7 - ดอกเบี้ยปานกลาง
```
สีชมพู (rgba(255,107,157,0.05))
⚠️ ดอกปานกลาง
ดอกเบี้ย: 3-6%
```

### 🔴 วันที่ 8-15 - ดอกเบี้ยสูง
```
สีแดง (rgba(255,71,87,0.08))
❌ ดอกสูง
ดอกเบี้ย: 7-14%
```

---

## 💡 **ฟีเจอร์พิเศษ:**

### 1. ⚡ อัพเดตแบบเรียลไทม์
```javascript
// เมื่อเปลี่ยนจำนวนเงิน ตารางจะอัพเดตทันที!
เปลี่ยนจาก 100฿ → 50฿ = ตารางคำนวณใหม่ทันที
เปลี่ยนจาก 50฿ → 200฿ = ตารางคำนวณใหม่ทันที
```

### 2. 🎭 Hover Effect
```css
/* เมื่อเมาส์ชี้ที่แถว จะเปลี่ยนสี */
row:hover {
    background: rgba(0,212,255,0.1);
    transition: all 0.3s;
}
```

### 3. 📱 Mobile Responsive
```
✅ ตารางเลื่อนได้ (overflow-x: auto)
✅ ฟอนต์ขนาดเหมาะสม (0.8em)
✅ Padding กำลังดี (10px)
✅ ดูง่ายบนมือถือ
```

### 4. 🔄 Toggle เปิด/ปิด
```
ปิด: [📊 แสดงตารางคำนวณ 1-15 วัน ▼]
      สีฟ้า-ม่วง gradient

เปิด: [📊 ซ่อนตารางคำนวณ ▲]
      สีชมพู-แดง gradient
      + แสดงตารางด้วย animation slideDown
```

---

## 📊 **ตัวอย่างการใช้งาน:**

### สถานการณ์ที่ 1: ต้องการยืม 100 บาท
```
1. กรอก: 100 บาท
2. คลิก: [แสดงตารางคำนวณ 1-15 วัน]
3. ดู:
   - วันที่ 1: จ่าย 100฿ (ไม่มีดอก) ✅
   - วันที่ 3: จ่าย 102฿ (ดอก 2%) ⚠️
   - วันที่ 7: จ่าย 106฿ (ดอก 6%) ⚠️
   - วันที่ 10: จ่าย 109฿ (ดอก 9%) ❌
   - วันที่ 15: จ่าย 114฿ (ดอก 14%) ❌
```

### สถานการณ์ที่ 2: ต้องการยืม 50 บาท
```
1. เลือกแพ็กเกจ: 50฿
2. ตารางอัพเดตทันที!
3. ดู:
   - วันที่ 1: จ่าย 50.00฿ (ไม่มีดอก)
   - วันที่ 5: จ่าย 52.00฿ (ดอก 4%)
   - วันที่ 10: จ่าย 54.50฿ (ดอก 9%)
   - วันที่ 15: จ่าย 57.00฿ (ดอก 14%)
```

### สถานการณ์ที่ 3: เปลี่ยนจำนวนเงินแบบเรียลไทม์
```
กรอก 100 → ตารางแสดง 100, 101, 102, ... 114
เปลี่ยนเป็น 200 → ตารางอัพเดต: 200, 202, 204, ... 228
เปลี่ยนเป็น 75 → ตารางอัพเดต: 75, 75.75, 76.50, ... 85.50
```

---

## 💻 **ฟังก์ชัน JavaScript:**

### 1. toggleCalcTable()
```javascript
function toggleCalcTable() {
    const container = document.getElementById('calcTableContainer');
    const icon = document.getElementById('calcToggleIcon');
    const txt = document.getElementById('calcToggleTxt');
    const btn = document.getElementById('calcToggleBtn');
    
    if (container.style.display === 'none') {
        // แสดงตาราง
        container.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        txt.textContent = 'ซ่อนตารางคำนวณ';
        btn.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.15),rgba(255,71,87,0.15))';
        btn.style.borderColor = 'rgba(255,107,157,0.3)';
        
        generateCalcTable(); // สร้างตาราง
    } else {
        // ซ่อนตาราง
        container.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        txt.textContent = 'แสดงตารางคำนวณ 1-15 วัน';
        btn.style.background = 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(168,85,247,0.15))';
        btn.style.borderColor = 'rgba(0,212,255,0.3)';
    }
}
```

### 2. generateCalcTable()
```javascript
function generateCalcTable() {
    const amount = parseFloat(document.getElementById('borrowAmount').value) || 100;
    document.getElementById('tableAmount').textContent = amount.toLocaleString() + ' บาท';
    
    const tbody = document.getElementById('calcTableBody');
    tbody.innerHTML = '';
    
    // สร้าง 15 แถว
    for (let day = 1; day <= 15; day++) {
        let interestAmount = 0;
        let interestPercent = 0;
        let total = amount;
        let status = '';
        let statusColor = '';
        let rowBg = '';
        
        if (day === 1) {
            // วันที่ 1: ไม่มีดอก
            status = '✓ ไม่มีดอก';
            statusColor = '#2ecc71';
            rowBg = 'rgba(46,204,113,0.08)';
        } else if (day <= 3) {
            // วันที่ 2-3: ดอกต่ำ
            const daysOverdue = day - 1;
            interestAmount = amount * 0.01 * daysOverdue; // 1% per day
            interestPercent = 1.0 * daysOverdue;
            total = amount + interestAmount;
            status = '⚠️ ดอกต่ำ';
            statusColor = '#ffc107';
            rowBg = 'rgba(255,193,7,0.05)';
        } else if (day <= 7) {
            // วันที่ 4-7: ดอกปานกลาง
            const daysOverdue = day - 1;
            interestAmount = amount * 0.01 * daysOverdue;
            interestPercent = 1.0 * daysOverdue;
            total = amount + interestAmount;
            status = '⚠️ ดอกปานกลาง';
            statusColor = '#ff6b9d';
            rowBg = 'rgba(255,107,157,0.05)';
        } else {
            // วันที่ 8-15: ดอกสูง
            const daysOverdue = day - 1;
            interestAmount = amount * 0.01 * daysOverdue;
            interestPercent = 1.0 * daysOverdue;
            total = amount + interestAmount;
            status = '❌ ดอกสูง';
            statusColor = '#ff4757';
            rowBg = 'rgba(255,71,87,0.08)';
        }
        
        // สร้างแถว
        const row = document.createElement('tr');
        row.style.background = rowBg;
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.style.transition = 'all 0.3s';
        
        // Hover effect
        row.onmouseenter = function() { this.style.background = 'rgba(0,212,255,0.1)'; };
        row.onmouseleave = function() { this.style.background = rowBg; };
        
        row.innerHTML = `
            <td style="padding:10px;font-weight:600;color:#fff;">${day}</td>
            <td style="padding:10px;color:${interestAmount > 0 ? '#ff6b9d' : '#2ecc71'};">
                ${interestPercent.toFixed(0)}% (${interestAmount.toFixed(2)}฿)
            </td>
            <td style="padding:10px;font-weight:700;color:var(--primary);font-size:1.05em;">
                ${total.toFixed(2)} ฿
            </td>
            <td style="padding:10px;color:${statusColor};font-weight:600;font-size:0.9em;">
                ${status}
            </td>
        `;
        
        tbody.appendChild(row);
    }
}
```

### 3. updateCalcTable()
```javascript
function updateCalcTable() {
    // เมื่อจำนวนเงินเปลี่ยน ถ้าตารางเปิดอยู่ให้อัพเดต
    if (document.getElementById('calcTableContainer').style.display === 'block') {
        generateCalcTable();
    }
}
```

### 4. selectPackage() - อัพเดตแล้ว
```javascript
function selectPackage(amount, el) {
    // ... โค้ดเดิม ...
    
    // อัพเดตตารางถ้าเปิดอยู่
    if (document.getElementById('calcTableContainer').style.display === 'block') {
        generateCalcTable();
    }
    
    showToast(`เลือกแพ็กเกจ ${amount} บาท`, 'success');
}
```

---

## 🎨 **CSS Animation:**

```css
@keyframes slideDown {
    from { 
        opacity: 0; 
        transform: translateY(-10px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}

#calcTableContainer {
    animation: slideDown 0.3s ease;
}
```

---

## 📋 **ตารางสรุป (ยืม 100 บาท):**

| วัน | ดอกเบี้ย (%) | ดอกเบี้ย (฿) | ยอดชำระ | แต้มถูกหัก | สถานะ |
|-----|--------------|--------------|---------|-----------|--------|
| 1   | 0%          | 0.00         | 100.00  | 0         | ✓ ไม่มีดอก |
| 2   | 1%          | 1.00         | 101.00  | 1         | ⚠️ ดอกต่ำ |
| 3   | 2%          | 2.00         | 102.00  | 2         | ⚠️ ดอกต่ำ |
| 4   | 3%          | 3.00         | 103.00  | 3         | ⚠️ ดอกปานกลาง |
| 5   | 4%          | 4.00         | 104.00  | 4         | ⚠️ ดอกปานกลาง |
| 6   | 5%          | 5.00         | 105.00  | 5         | ⚠️ ดอกปานกลาง |
| 7   | 6%          | 6.00         | 106.00  | 6         | ⚠️ ดอกปานกลาง |
| 8   | 7%          | 7.00         | 107.00  | 7         | ❌ ดอกสูง |
| 9   | 8%          | 8.00         | 108.00  | 8         | ❌ ดอกสูง |
| 10  | 9%          | 9.00         | 109.00  | 9         | ❌ ดอกสูง |
| 11  | 10%         | 10.00        | 110.00  | 10        | ❌ ดอกสูง |
| 12  | 11%         | 11.00        | 111.00  | 11        | ❌ ดอกสูง |
| 13  | 12%         | 12.00        | 112.00  | 12        | ❌ ดอกสูง |
| 14  | 13%         | 13.00        | 113.00  | 13        | ❌ ดอกสูง |
| 15  | 14%         | 14.00        | 114.00  | 14        | ❌ ดอกสูง |

---

## ✅ **ข้อดี:**

1. **มองเห็นภาพรวม** - ดูได้ครบ 15 วันในหน้าเดียว
2. **เข้าใจง่าย** - มีสีและไอคอนบอกสถานะ
3. **อัพเดตเรียลไทม์** - เปลี่ยนจำนวนเงิน ตารางเปลี่ยนทันที
4. **สวยงาม** - สีสันทันสมัย มี hover effect
5. **โปร่งใส** - ผู้ใช้รู้ล่วงหน้าว่าถ้าคืนช้าต้องจ่ายเท่าไหร่
6. **Mobile Friendly** - เลื่อนดูได้ ไม่พังบนมือถือ

---

## 🚀 **พร้อมใช้งาน!**

### วิธีเทส:
1. เปิด `http://localhost:3000/dashboard.html`
2. ไปเมนู "ยืมเงิน"
3. กรอกจำนวนเงิน เช่น 100 บาท
4. คลิก **[📊 แสดงตารางคำนวณ 1-15 วัน]**
5. ดูตารางเต็มที่แสดงวันที่ 1-15
6. ลองเปลี่ยนจำนวนเงินเป็น 50 หรือ 200 → ตารางอัพเดตทันที!
7. Hover เมาส์ไปที่แถวต่างๆ → เห็น effect เปลี่ยนสี
8. คลิกปิดตาราง → เห็นปุ่มเปลี่ยนสี + animation

---

**อัพเดตเสร็จสมบูรณ์!** 🎉

**รีเฟรชหน้าเว็บ (Ctrl+F5) แล้วลองใช้งานได้เลย!**
