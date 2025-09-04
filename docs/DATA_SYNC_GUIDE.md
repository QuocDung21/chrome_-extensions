# Hướng dẫn sử dụng tính năng đồng bộ dữ liệu

## Tổng quan

Tính năng đồng bộ dữ liệu cho phép bạn tải và lưu trữ toàn bộ dữ liệu từ API vào IndexedDB một lần, sau đó sử dụng dữ liệu offline mà không cần gọi API liên tục.

## Các thành phần chính

### 1. DataSyncService (`src/admin/services/dataSyncService.ts`)

Service chính để quản lý việc đồng bộ dữ liệu:

- **syncAllData()**: Đồng bộ toàn bộ dữ liệu từ API vào IndexedDB
- **refreshData()**: Làm mới dữ liệu (force sync)
- **clearAllData()**: Xóa tất cả dữ liệu đã đồng bộ
- **isDataSynced()**: Kiểm tra trạng thái đồng bộ
- **getDataStats()**: Lấy thống kê dữ liệu

### 2. DataSyncPanel (`src/admin/components/template-filler/DataSyncPanel.tsx`)

Component UI để quản lý đồng bộ dữ liệu:

- Hiển thị trạng thái đồng bộ
- Thống kê dữ liệu
- Tiến trình đồng bộ
- Các nút điều khiển

### 3. useDataSync Hook (`src/admin/hooks/useDataSync.ts`)

Hook React để sử dụng trong components:

```typescript
const {
    syncStatus,
    isDataSynced,
    dataStats,
    syncAllData,
    refreshData,
    clearAllData
} = useDataSync();
```

## Cách sử dụng

### 1. Đồng bộ dữ liệu lần đầu

1. Mở trang Template Filler
2. Nhấn nút "🔄 Đồng bộ dữ liệu" ở góc phải trên
3. Chọn "Đồng bộ" để tải toàn bộ dữ liệu từ API
4. Chờ quá trình đồng bộ hoàn tất

### 2. Sử dụng dữ liệu offline

Sau khi đồng bộ, hệ thống sẽ tự động:
- Sử dụng dữ liệu từ IndexedDB thay vì gọi API
- Tải nhanh hơn và ổn định hơn
- Hoạt động offline hoàn toàn

### 3. Làm mới dữ liệu

- Nhấn "Làm mới" để cập nhật dữ liệu mới nhất từ API
- Dữ liệu cũ sẽ được thay thế hoàn toàn

### 4. Xóa dữ liệu

- Nhấn "Xóa dữ liệu" để xóa tất cả dữ liệu đã đồng bộ
- Hệ thống sẽ quay lại sử dụng API như trước

## Dữ liệu được đồng bộ

### 1. Lĩnh vực (LinhVuc)
- Mã lĩnh vực
- Tên lĩnh vực
- Mô tả

### 2. Thủ tục hành chính (ThuTucHanhChinh)
- Thông tin thủ tục
- Mã thủ tục
- Tên thủ tục
- Đối tượng thực hiện

### 3. Thành phần hồ sơ (ThanhPhanHoSoTTHC)
- Danh sách mẫu đơn
- Thông tin file đính kèm
- Số bản chính/sao

### 4. Files offline
- Tải xuống tất cả file mẫu đơn
- Lưu trữ local trong IndexedDB
- Sử dụng offline hoàn toàn

## Lợi ích

### 1. Hiệu suất
- Tải dữ liệu nhanh hơn (từ IndexedDB thay vì API)
- Giảm tải cho server
- Phản hồi nhanh hơn

### 2. Ổn định
- Hoạt động offline
- Không phụ thuộc vào kết nối mạng
- Giảm lỗi do mạng

### 3. Trải nghiệm người dùng
- Giao diện mượt mà hơn
- Không cần chờ đợi API
- Làm việc liên tục

## Cấu trúc dữ liệu

### IndexedDB Tables

```typescript
// Lĩnh vực
linhVuc: {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

// Thủ tục hành chính
thuTucHanhChinh: {
    thuTucHanhChinhID: string;
    maThuTucHanhChinh: string;
    tenThuTucHanhChinh: string;
    // ... các trường khác
}

// Thành phần hồ sơ
thanhPhanHoSoTTHC: {
    thanhPhanHoSoTTHCID: string;
    thuTucHanhChinhID: string;
    tenThanhPhanHoSoTTHC: string;
    // ... các trường khác
}

// Files offline
thanhPhanHoSoTTHCLocal: {
    thanhPhanHoSoTTHCID: string;
    blob: Blob;
    mimeType: string;
    downloadedAt: number;
    fileSize: number;
}
```

## Xử lý lỗi

### 1. Lỗi đồng bộ
- Hiển thị thông báo lỗi chi tiết
- Cho phép thử lại
- Fallback về API nếu cần

### 2. Lỗi tải file
- Bỏ qua file lỗi, tiếp tục với file khác
- Ghi log chi tiết
- Thông báo số file thành công/thất bại

### 3. Lỗi IndexedDB
- Fallback về API
- Thông báo lỗi rõ ràng
- Hướng dẫn khắc phục

## Monitoring

### 1. Console logs
- Theo dõi quá trình đồng bộ
- Thông tin chi tiết về lỗi
- Thống kê hiệu suất

### 2. UI indicators
- Thanh tiến trình
- Trạng thái đồng bộ
- Thống kê dữ liệu

### 3. Error reporting
- Danh sách lỗi chi tiết
- Thông tin debug
- Hướng dẫn khắc phục

## Best Practices

### 1. Đồng bộ định kỳ
- Đồng bộ dữ liệu mới mỗi ngày
- Kiểm tra cập nhật thường xuyên
- Làm mới khi cần thiết

### 2. Quản lý dung lượng
- Theo dõi dung lượng IndexedDB
- Xóa dữ liệu cũ khi cần
- Tối ưu hóa file size

### 3. Backup dữ liệu
- Xuất dữ liệu quan trọng
- Sao lưu định kỳ
- Khôi phục khi cần

## Troubleshooting

### 1. Dữ liệu không đồng bộ
- Kiểm tra kết nối mạng
- Thử làm mới dữ liệu
- Xóa và đồng bộ lại

### 2. File không tải được
- Kiểm tra URL file
- Thử tải thủ công
- Báo cáo lỗi

### 3. Hiệu suất chậm
- Kiểm tra dung lượng IndexedDB
- Xóa dữ liệu cũ
- Tối ưu hóa queries

## API Reference

### DataSyncService

```typescript
class DataSyncService {
    // Đồng bộ toàn bộ dữ liệu
    async syncAllData(options?: SyncOptions): Promise<SyncStatus>
    
    // Làm mới dữ liệu
    async refreshData(options?: SyncOptions): Promise<SyncStatus>
    
    // Xóa tất cả dữ liệu
    async clearAllData(): Promise<void>
    
    // Kiểm tra trạng thái đồng bộ
    async isDataSynced(): Promise<boolean>
    
    // Lấy thống kê dữ liệu
    async getDataStats(): Promise<DataSyncStats>
}
```

### useDataSync Hook

```typescript
const useDataSync = () => {
    return {
        syncStatus: SyncStatus,
        isDataSynced: boolean,
        dataStats: DataSyncStats,
        syncAllData: (options?) => Promise<boolean>,
        refreshData: (options?) => Promise<boolean>,
        clearAllData: () => Promise<boolean>
    };
};
```

## Kết luận

Tính năng đồng bộ dữ liệu giúp cải thiện đáng kể hiệu suất và trải nghiệm người dùng của ứng dụng Template Filler. Hãy sử dụng tính năng này để tận dụng tối đa khả năng offline và hiệu suất cao của ứng dụng.
