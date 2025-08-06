# Demo Data Formats

## 1. Định dạng CCCD/CMND (dấu |)
```
123456789012|123456789|Nguyễn Văn A|01/01/1990|Nam|123 Đường ABC, Quận 1, TP.HCM|01/01/2020
```

## 2. Định dạng JSON
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

## 3. Định dạng nhập thủ công (dấu ,)
```
123456789012,123456789,Nguyễn Văn A,01/01/1990,Nam,123 Đường ABC Quận 1 TP.HCM,01/01/2020
```

## 4. Định dạng từ máy quét QR (có thể có ký tự đặc biệt)
```
CCCD:123456789012|CMND:123456789|Họ tên:Nguyễn Văn A|Ngày sinh:01/01/1990|Giới tính:Nam|Địa chỉ:123 Đường ABC Quận 1 TP.HCM|Ngày cấp:01/01/2020
``` 