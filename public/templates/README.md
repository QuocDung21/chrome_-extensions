# Hướng dẫn tạo mẫu Word Template

## Cách tạo template Word với các trường động

### 1. Tạo file Word (.docx)
- Mở Microsoft Word hoặc Google Docs
- Tạo nội dung mẫu đơn/tờ khai theo yêu cầu

### 2. Đánh dấu các trường cần điền tự động
Sử dụng cú pháp `{field_name}` để đánh dấu các trường cần điền tự động.

#### Ví dụ mẫu đơn đăng ký kinh doanh:

```
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

ĐơN ĐĂNG KÝ KINH DOANH

Kính gửi: Phòng Đăng ký kinh doanh

Tôi là: {ho_ten}
Sinh ngày: {ngay_sinh}
CCCD/CMND số: {so_cccd} cấp ngày: {ngay_cap_cccd} tại: {noi_cap_cccd}
Địa chỉ thường trú: {dia_chi_thuong_tru}
Số điện thoại: {so_dien_thoai}
Email: {email}

Đề nghị đăng ký kinh doanh với các thông tin sau:
- Tên cửa hàng/cơ sở kinh doanh: {ten_cua_hang}
- Địa chỉ kinh doanh: {dia_chi_kinh_doanh}
- Ngành nghề kinh doanh: {nganh_nghe}
- Vốn đăng ký: {von_dang_ky} VNĐ

Ngày {ngay_hien_tai}
                                    Người đăng ký
                                    {ho_ten}
```

### 3. Các trường dữ liệu phổ biến

#### Thông tin cá nhân:
- `{ho_ten}` - Họ và tên
- `{ngay_sinh}` - Ngày sinh
- `{so_cccd}` - Số CCCD/CMND
- `{ngay_cap_cccd}` - Ngày cấp CCCD
- `{noi_cap_cccd}` - Nơi cấp CCCD
- `{dia_chi_thuong_tru}` - Địa chỉ thường trú
- `{so_dien_thoai}` - Số điện thoại
- `{email}` - Email

#### Thông tin kinh doanh:
- `{ten_cua_hang}` - Tên cửa hàng
- `{dia_chi_kinh_doanh}` - Địa chỉ kinh doanh
- `{nganh_nghe}` - Ngành nghề
- `{von_dang_ky}` - Vốn đăng ký

#### Thông tin ngày tháng:
- `{ngay_hien_tai}` - Ngày hiện tại
- `{current_date}` - Ngày hiện tại (định dạng khác)
- `{current_time}` - Giờ hiện tại
- `{current_datetime}` - Ngày giờ hiện tại

### 4. Lưu ý khi tạo template:
1. **Định dạng file**: Chỉ hỗ trợ file .docx
2. **Kích thước**: Tối đa 10MB
3. **Cú pháp**: Sử dụng `{field_name}` (không có khoảng trắng)
4. **Tên trường**: Chỉ sử dụng chữ cái, số và dấu gạch dưới
5. **Kiểm tra**: Đảm bảo tất cả các trường đều có dữ liệu tương ứng

### 5. Cách sử dụng:
1. Tạo file Word theo hướng dẫn trên
2. Vào trang "Mẫu đơn, tờ khai" trong admin
3. Click "Thêm mẫu mới"
4. Điền thông tin và upload file
5. Sử dụng Chrome extension để thu thập dữ liệu
6. Click "Tạo tài liệu" để tạo file Word đã điền sẵn

### 6. Ví dụ mẫu tờ khai thuế:

```
TỜ KHAI THUẾ THU NHẬP CÁ NHÂN

Họ và tên: {ho_ten}
Mã số thuế: {ma_so_thue}
Địa chỉ: {dia_chi}
Thu nhập chịu thuế: {thu_nhap_chiu_thue} VNĐ
Thuế phải nộp: {thue_phai_nop} VNĐ

Ngày {current_date}
                    Người nộp thuế
                    {ho_ten}
```

### 7. Hỗ trợ:
Nếu gặp vấn đề khi tạo template, vui lòng kiểm tra:
- File có đúng định dạng .docx không
- Cú pháp `{field_name}` có chính xác không
- Dữ liệu từ extension có đầy đủ không
