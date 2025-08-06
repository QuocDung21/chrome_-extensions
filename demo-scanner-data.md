# Demo Dữ liệu từ Máy quét QR

## Các định dạng dữ liệu được hỗ trợ:

### 1. Định dạng CCCD/CMND chuẩn (dấu |)
```
123456789012|123456789|Nguyễn Văn A|01/01/1990|Nam|123 Đường ABC, Quận 1, TP.HCM|01/01/2020
```

### 2. Định dạng máy quét QR có nhãn (dấu : và |)
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

### 4. Định dạng nhập thủ công (dấu ,)
```
123456789012,123456789,Nguyễn Văn A,01/01/1990,Nam,123 Đường ABC Quận 1 TP.HCM,01/01/2020
```

## Cách sử dụng:

1. **Chọn nguồn dữ liệu**: Chọn "Máy quét QR" thay vì "Socket App Mobile"
2. **Nhập dữ liệu**: Copy một trong các định dạng trên vào ô input
3. **Hệ thống sẽ tự động phát hiện định dạng** và hiển thị thông tin
4. **Nhấn Enter** để xử lý dữ liệu và tạo tài liệu

## Tính năng thông minh:

- ✅ **Tự động phát hiện định dạng** dựa trên cấu trúc dữ liệu
- ✅ **Xử lý dữ liệu có nhãn** từ máy quét QR
- ✅ **Hỗ trợ nhiều định dạng** khác nhau
- ✅ **Hiển thị thông tin real-time** về định dạng được phát hiện
- ✅ **Xử lý lỗi thông minh** với thông báo rõ ràng 