# Test Dữ liệu Máy quét QR

## Các ví dụ dữ liệu để test:

### 1. Định dạng CCCD/CMND chuẩn
```
123456789012|123456789|Nguyễn Văn A|01/01/1990|Nam|123 Đường ABC, Quận 1, TP.HCM|01/01/2020
```

### 2. Định dạng máy quét QR có nhãn
```
CCCD:123456789012|CMND:123456789|Họ tên:Nguyễn Văn A|Ngày sinh:01/01/1990|Giới tính:Nam|Địa chỉ:123 Đường ABC Quận 1 TP.HCM|Ngày cấp:01/01/2020
```

### 3. Định dạng JSON
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

### 4. Định dạng nhập thủ công
```
123456789012,123456789,Nguyễn Văn A,01/01/1990,Nam,123 Đường ABC Quận 1 TP.HCM,01/01/2020
```

## Cách test:

1. **Chọn "Máy quét QR"** làm nguồn dữ liệu
2. **Copy một trong các dữ liệu trên** vào ô input
3. **Kiểm tra xem hệ thống có phát hiện đúng định dạng không**
4. **Kiểm tra preview dữ liệu đã được xử lý**
5. **Nhấn Enter để tạo tài liệu**
6. **Kiểm tra xem dữ liệu có được chèn vào template không**

## Debug info:

- Console sẽ hiển thị: "Phát hiện định dạng: [tên định dạng]"
- Console sẽ hiển thị: "Dữ liệu đã được phân tích: [object]"
- Console sẽ hiển thị: "Dữ liệu đã được chuyển đổi cho template: [object]"
- Console sẽ hiển thị: "Dữ liệu đã được chuẩn bị cho template: [object]"

## Các trường dữ liệu được hỗ trợ:

### Định dạng camelCase:
- cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap

### Định dạng snake_case:
- ho_ten, ngay_sinh, gioi_tinh, dia_chi, ngay_cap

### Các trường bổ sung:
- ten, hoten, ho_va_ten
- so_cccd, so_cmnd
- ngay_thang_nam_sinh, noi_cu_tru, ngay_thang_nam_cap 