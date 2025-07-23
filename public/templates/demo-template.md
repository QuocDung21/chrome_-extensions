# Demo Word Template

## Hướng dẫn tạo file Word template để test

### 1. Tạo file Word (.docx) với nội dung sau:

```
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

ĐƠN ĐĂNG KÝ KINH DOANH

Kính gửi: Phòng Đăng ký kinh doanh

Tôi là: {ho_ten}
Sinh ngày: {ngay_sinh}
CCCD/CMND số: {so_cccd} cấp ngày: {ngay_cap_cccd} tại: {noi_cap_cccd}
Địa chỉ thường trú: {dia_chi_thuong_tru}
Số điện thoại: {so_dien_thoai}
Email: {email}

Tôi có nhu cầu đăng ký kinh doanh với các thông tin sau:

Tên doanh nghiệp: {ten_cong_ty}
Địa chỉ kinh doanh: {dia_chi_cong_ty}
Ngành nghề kinh doanh: {nghe_nghiep}

Ngày lập đơn: {current_date}
Thời gian: {current_time}

                                    Người làm đơn
                                    (Ký và ghi rõ họ tên)




                                    {ho_ten}
```

### 2. Lưu file với tên `demo-template.docx`

### 3. Upload file vào trang Word Mapper

### 4. Drag & drop để map các fields:
- `{ho_ten}` → ho_ten
- `{ngay_sinh}` → ngay_sinh  
- `{so_cccd}` → so_cccd
- `{ngay_cap_cccd}` → ngay_cap_cccd
- `{noi_cap_cccd}` → noi_cap_cccd
- `{dia_chi_thuong_tru}` → dia_chi_thuong_tru
- `{so_dien_thoai}` → so_dien_thoai
- `{email}` → email
- `{ten_cong_ty}` → ten_cong_ty
- `{dia_chi_cong_ty}` → dia_chi_cong_ty
- `{nghe_nghiep}` → nghe_nghiep
- `{current_date}` → current_date
- `{current_time}` → current_time

### 5. Test generate document

Hệ thống sẽ tự động điền dữ liệu mẫu và tạo file Word hoàn chỉnh.
