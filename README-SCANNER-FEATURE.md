# Tính năng Máy quét QR - Hướng dẫn sử dụng

## Tổng quan

Hệ thống đã được nâng cấp để hỗ trợ **nhiều nguồn dữ liệu** và **xử lý thông minh** dữ liệu từ máy quét QR, tương tự như cách xử lý dữ liệu từ Socket App Mobile.

## Tính năng mới

### 🎯 **Chọn nguồn dữ liệu**
- **Socket App Mobile**: Nhận dữ liệu từ ứng dụng mobile qua socket
- **Máy quét QR**: Nhận dữ liệu từ máy quét QR hoặc nhập thủ công

### 🧠 **Phát hiện định dạng thông minh**
Hệ thống tự động phát hiện và xử lý các định dạng dữ liệu:

1. **QR CCCD/CMND**: `CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp`
2. **QR Tùy chỉnh**: Dữ liệu JSON
3. **Nhập thủ công**: `CCCD,CMND,Họ tên,Ngày sinh,Giới tính,Địa chỉ,Ngày cấp`
4. **Máy quét QR**: `CCCD:xxx|CMND:xxx|Họ tên:xxx|...`

### 📊 **Hiển thị real-time**
- Phát hiện định dạng ngay khi nhập
- Hiển thị dữ liệu đã được xử lý
- Thông báo lỗi rõ ràng

## Cách sử dụng

### Bước 1: Chọn nguồn dữ liệu
1. Vào trang Word Mapper
2. Chọn **"Máy quét QR"** thay vì "Socket App Mobile"

### Bước 2: Chọn mẫu đơn
1. Sử dụng bộ lọc để tìm mẫu đơn phù hợp
2. Chọn mẫu đơn từ danh sách

### Bước 3: Nhập dữ liệu
Copy một trong các định dạng sau vào ô input:

#### Định dạng 1: CCCD/CMND chuẩn
```
123456789012|123456789|Nguyễn Văn A|01/01/1990|Nam|123 Đường ABC, Quận 1, TP.HCM|01/01/2020
```

#### Định dạng 2: Máy quét QR có nhãn
```
CCCD:123456789012|CMND:123456789|Họ tên:Nguyễn Văn A|Ngày sinh:01/01/1990|Giới tính:Nam|Địa chỉ:123 Đường ABC Quận 1 TP.HCM|Ngày cấp:01/01/2020
```

#### Định dạng 3: JSON
```json
{
  "cccd": "123456789012",
  "cmnd": "123456789",
  "hoTen": "Nguyễn Văn A",
  "ngaySinh": "01/01/1990",
  "gioiTinh": "Nam",
  "diaChi": "123 Đường ABC, Quận 1, TP.HCM",
  "ngayCap": "01/01/2020"
}
```

#### Định dạng 4: Nhập thủ công
```
123456789012,123456789,Nguyễn Văn A,01/01/1990,Nam,123 Đường ABC Quận 1 TP.HCM,01/01/2020
```

### Bước 4: Xử lý dữ liệu
1. Hệ thống sẽ tự động phát hiện định dạng
2. Hiển thị dữ liệu đã được xử lý
3. Nhấn **Enter** để tạo tài liệu

## Tính năng nổi bật

### ✅ **Tự động phát hiện**
- Phân tích cấu trúc dữ liệu real-time
- Hỗ trợ nhiều định dạng khác nhau
- Thông báo định dạng được phát hiện

### ✅ **Xử lý thông minh**
- Trích xuất dữ liệu từ nhãn (CCCD:, CMND:, etc.)
- Xử lý JSON linh hoạt
- Hỗ trợ các ký tự đặc biệt

### ✅ **Hiển thị trực quan**
- Preview dữ liệu đã xử lý
- Thông báo lỗi chi tiết
- Giao diện thân thiện

### ✅ **Tương thích ngược**
- Vẫn hỗ trợ Socket App Mobile
- Chuyển đổi dễ dàng giữa các nguồn
- Không ảnh hưởng đến tính năng cũ

## Lưu ý

- Đảm bảo dữ liệu có đủ 7 trường: CCCD, CMND, Họ tên, Ngày sinh, Giới tính, Nơi cư trú, Ngày cấp
- Hệ thống sẽ tự động làm sạch dữ liệu và trích xuất giá trị
- Có thể chuyển đổi giữa các nguồn dữ liệu bất cứ lúc nào 