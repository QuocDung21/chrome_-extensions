# Demo Word Template

Để test chức năng Word Mapper mới, bạn cần tạo một file Word (.docx) với các placeholder như sau:

## Ví dụ nội dung Word document:

```
THÔNG TIN CÁ NHÂN

Họ và tên: {ho_ten}
Ngày sinh: {ngay_sinh}
Số CCCD: {so_cccd}
Địa chỉ: {dia_chi}
Số điện thoại: {so_dien_thoai}
Email: {email}

Ngày tạo: {current_date}
```

## Cách sử dụng:

1. **Upload Word File**: Tải lên file Word có chứa các placeholder như {ho_ten}, {ngay_sinh}, v.v.

2. **Setup Placeholder Mappings**: 
   - Hệ thống sẽ tự động phát hiện các placeholder trong file Word
   - Bạn có thể chỉnh sửa mapping giữa placeholder và JSON key
   - Ví dụ: {ho_ten} → ho_ten

3. **JSON Data Input**:
   - Nhập dữ liệu JSON để điền vào document
   - Ví dụ:
   ```json
   {
     "ho_ten": "Nguyễn Văn A",
     "ngay_sinh": "01/01/1990",
     "so_cccd": "123456789012",
     "dia_chi": "123 Đường ABC, Quận 1, TP.HCM",
     "so_dien_thoai": "0123456789",
     "email": "nguyenvana@email.com",
     "current_date": "22/07/2025"
   }
   ```

4. **Preview Document**: Click "Preview Document" để xem text preview ngay trong giao diện

5. **Generate Document**: Click để tạo và download file Word mới với dữ liệu đã điền

## Tính năng mới:

- ✅ Tự động phát hiện placeholder từ Word document
- ✅ Setup mapping linh hoạt giữa placeholder và JSON key
- ✅ Nhập JSON data động
- ✅ **Preview document ngay trong giao diện** (text preview)
- ✅ Tạo document với dữ liệu thực tế
- ✅ Download document để xem full formatting
- ✅ Giao diện đơn giản, dễ sử dụng

## Lưu ý:

- Placeholder trong Word phải có format {tên_field}
- JSON data phải hợp lệ
- Hỗ trợ file .docx
