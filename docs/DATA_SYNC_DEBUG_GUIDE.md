# Hướng dẫn Debug và Test Data Sync

## Tổng quan

Tài liệu này hướng dẫn cách debug và test tính năng đồng bộ dữ liệu để đảm bảo `ApiTemplateCard` hoạt động offline hoàn toàn.

## Vấn đề đã được giải quyết

### 1. Vấn đề ban đầu
- `ApiTemplateCard` vẫn gọi API `http://laptrinhid.qlns.vn/api/ThanhPhanHoSoTTHC/getall?pageNumber=1&pageSize=300&maThuTucHanhChinh=` khi chọn mẫu đơn
- Không hoạt động offline sau khi đồng bộ dữ liệu

### 2. Giải pháp đã triển khai
- Cập nhật `ApiTemplateCard` để kiểm tra trạng thái đồng bộ trước khi gọi API
- Sử dụng dữ liệu từ IndexedDB khi đã đồng bộ
- Fallback về API chỉ khi chưa đồng bộ
- Cải thiện logic tìm kiếm trong repository

## Các thay đổi chính

### 1. ApiTemplateCard.tsx
```typescript
// Kiểm tra xem dữ liệu đã được đồng bộ chưa
const isDataSynced = await dataSyncService.isDataSynced();

if (isDataSynced) {
    // Sử dụng dữ liệu từ IndexedDB - tìm theo thuTucHanhChinhID
    templates = await db.thanhPhanHoSoTTHC
        .where('thuTucHanhChinhID')
        .equals(record.thuTucHanhChinhID)
        .toArray();
} else {
    // Fallback: sử dụng repository (có thể gọi API)
    templates = await thanhPhanHoSoTTHCRepository.getThanhPhanHoSoByMaTTHC(
        record.maThuTucHanhChinh
    );
}
```

### 2. ThanhPhanHoSoTTHCRepository.ts
```typescript
// Tìm kiếm trong IndexedDB theo thuTucHanhChinhID (nếu maTTHC là ID)
let filteredItems = await db.thanhPhanHoSoTTHC
    .where('thuTucHanhChinhID')
    .equals(maTTHC)
    .toArray();

// Nếu không tìm thấy, thử tìm theo maThuTucHanhChinh thông qua bảng thuTucHanhChinh
if (filteredItems.length === 0) {
    const thuTucRecord = await db.thuTucHanhChinh
        .where('maThuTucHanhChinh')
        .equals(maTTHC)
        .first();
    
    if (thuTucRecord) {
        filteredItems = await db.thanhPhanHoSoTTHC
            .where('thuTucHanhChinhID')
            .equals(thuTucRecord.thuTucHanhChinhID)
            .toArray();
    }
}
```

### 3. DataSyncService.ts
- Thêm logging chi tiết để debug
- Đảm bảo tải tất cả dữ liệu từ API (không truyền `maThuTucHanhChinh`)

## Cách test và debug

### 1. Sử dụng Debug Panel
1. Mở trang Template Filler
2. Nhấn nút "🔄 Đồng bộ dữ liệu"
3. Chọn "Đồng bộ" để tải dữ liệu
4. Sau khi hoàn tất, nhấn nút "🔍 Debug" để chạy các test

### 2. Sử dụng Console Debug
Mở Developer Console và chạy:

```javascript
// Kiểm tra trạng thái đồng bộ
await DataSyncDebug.checkSyncStatus();

// Kiểm tra dữ liệu trong IndexedDB
await DataSyncDebug.checkIndexedDBData();

// Tìm mẫu đơn theo maTTHC
await DataSyncDebug.findTemplatesByMaTTHC('MÃ_TTHC_CỦA_BẠN');

// Chạy tất cả test
await DataSyncDebug.runAllTests();
```

### 3. Test thủ công
1. **Test đồng bộ dữ liệu:**
   - Mở Network tab trong DevTools
   - Đồng bộ dữ liệu
   - Kiểm tra xem có gọi API `getall` không có `maThuTucHanhChinh`

2. **Test offline:**
   - Sau khi đồng bộ, tắt mạng
   - Thử chọn mẫu đơn trong `ApiTemplateCard`
   - Kiểm tra xem có gọi API không

3. **Test tìm kiếm:**
   - Mở Console
   - Chạy `DataSyncDebug.findTemplatesByMaTTHC('MÃ_TTHC')`
   - Kiểm tra kết quả trả về

## Các test case quan trọng

### 1. Test đồng bộ dữ liệu
```javascript
// Kiểm tra dữ liệu đã được tải
const stats = await dataSyncService.getDataStats();
console.log('Data stats:', stats);

// Kiểm tra có đủ dữ liệu không
const isSynced = await dataSyncService.isDataSynced();
console.log('Is synced:', isSynced);
```

### 2. Test tìm kiếm mẫu đơn
```javascript
// Lấy một số maTTHC để test
const thuTucRecords = await db.thuTucHanhChinh.limit(5).toArray();

for (const record of thuTucRecords) {
    console.log(`Testing: ${record.maThuTucHanhChinh}`);
    const templates = await DataSyncDebug.findTemplatesByMaTTHC(record.maThuTucHanhChinh);
    console.log(`Found ${templates.length} templates`);
}
```

### 3. Test offline hoạt động
```javascript
// Giả lập offline
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
});

// Test chọn mẫu đơn
// Mở một ApiTemplateCard và thử chọn mẫu
// Kiểm tra console xem có gọi API không
```

## Logging và monitoring

### 1. Console logs quan trọng
- `✅ Using offline data from IndexedDB` - Sử dụng dữ liệu offline
- `📡 Data not synced, using repository (may call API)` - Fallback về API
- `✅ Found X templates in IndexedDB for TTHC` - Tìm thấy mẫu đơn
- `🔍 No direct match found, searching by maThuTucHanhChinh` - Tìm kiếm thay thế

### 2. Network monitoring
- Kiểm tra Network tab khi chọn mẫu đơn
- Không nên có request đến API sau khi đồng bộ
- Chỉ có request khi chưa đồng bộ hoặc fallback

### 3. IndexedDB inspection
- Mở DevTools > Application > IndexedDB
- Kiểm tra các bảng: `linhVuc`, `thuTucHanhChinh`, `thanhPhanHoSoTTHC`
- Đảm bảo có đủ dữ liệu

## Troubleshooting

### 1. Không tìm thấy mẫu đơn
**Nguyên nhân:** Dữ liệu chưa được đồng bộ hoặc mapping sai
**Giải pháp:**
```javascript
// Kiểm tra dữ liệu
await DataSyncDebug.checkIndexedDBData();

// Kiểm tra mapping
const thuTucRecord = await db.thuTucHanhChinh
    .where('maThuTucHanhChinh')
    .equals('MÃ_TTHC')
    .first();
console.log('TTHC record:', thuTucRecord);
```

### 2. Vẫn gọi API sau khi đồng bộ
**Nguyên nhân:** Logic kiểm tra `isDataSynced` không đúng
**Giải pháp:**
```javascript
// Kiểm tra trạng thái
const isSynced = await dataSyncService.isDataSynced();
console.log('Is synced:', isSynced);

// Kiểm tra dữ liệu
const count = await db.thanhPhanHoSoTTHC.count();
console.log('Templates count:', count);
```

### 3. Dữ liệu không đầy đủ
**Nguyên nhân:** API không trả về đủ dữ liệu hoặc lỗi đồng bộ
**Giải pháp:**
```javascript
// Chạy debug test
await DataSyncDebug.runAllTests();

// Kiểm tra lỗi đồng bộ
const status = dataSyncService.getSyncStatus();
console.log('Sync status:', status);
```

## Best practices

### 1. Luôn kiểm tra trạng thái đồng bộ
```typescript
const isDataSynced = await dataSyncService.isDataSynced();
if (isDataSynced) {
    // Sử dụng IndexedDB
} else {
    // Fallback về API
}
```

### 2. Logging chi tiết
```typescript
console.log('✅ Using offline data from IndexedDB');
console.log(`✅ Found ${templates.length} templates in IndexedDB`);
```

### 3. Error handling
```typescript
try {
    // Logic tìm kiếm
} catch (error) {
    console.error('❌ Error loading templates:', error);
    // Fallback hoặc thông báo lỗi
}
```

### 4. Test thường xuyên
- Chạy debug test sau mỗi lần đồng bộ
- Kiểm tra Network tab khi test offline
- Verify dữ liệu trong IndexedDB

## Kết luận

Với các thay đổi này, `ApiTemplateCard` sẽ hoạt động hoàn toàn offline sau khi đồng bộ dữ liệu. Hệ thống sẽ:

1. Kiểm tra trạng thái đồng bộ trước khi gọi API
2. Sử dụng dữ liệu từ IndexedDB khi đã đồng bộ
3. Fallback về API chỉ khi cần thiết
4. Cung cấp logging chi tiết để debug

Sử dụng các công cụ debug được cung cấp để đảm bảo hệ thống hoạt động đúng như mong đợi.
