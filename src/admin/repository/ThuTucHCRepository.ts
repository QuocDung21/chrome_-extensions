import { db, ThuTucHC } from '../db/db';

class ThuTucHCRepository {
    async getAllThuTucHC(): Promise<ThuTucHC[]> {
        const cachedCount = await db.thuTucHC.count();

        if (cachedCount > 0) {
            console.log('CACHE HIT: Dữ liệu ThuTucHC đã có, đọc từ IndexedDB.');
            return db.thuTucHC.toArray();
        }

        console.log('CACHE MISS: Bắt đầu tải dữ liệu ThuTucHC từ nguồn JSON...');
        try {
            const response = await fetch('/DanhSachTTHC.json');
            if (!response.ok) {
                throw new Error('Không thể tải dữ liệu ThuTucHC từ JSON');
            }
            const jsonArray = await response.json();

            // Map dữ liệu JSON (theo cấu trúc hiện có trong routes) sang ThuTucHC
            const mapped: ThuTucHC[] = Array.isArray(jsonArray)
                ? jsonArray.map((item: any) => ({
                      maTTHC: item['Mã TTHC'] ?? '',
                      tenTTHC: item['Tên TTHC'] ?? '',
                      qdCongBo: item['QĐ Công bố'] ?? '',
                      doiTuong: item['Đối tượng'] ?? '',
                      linhVuc: item['Lĩnh vực'] ?? '',
                      coQuanCongKhai: item['Cơ quan công khai'] ?? '',
                      capThucHien: item['Cấp thực hiện'] ?? '',
                      tinhTrang: item['Tình trạng'] ?? '',
                      tenGiayTo: item['Tên giấy tờ'] ?? '',
                      mauDon: item['Mẫu đơn, tờ khai'] ?? '',
                      tenFile: item['Tên File'] ?? ''
                  }))
                : [];

            if (mapped.length > 0) {
                try {
                    console.log('SAVING TO CACHE: Lưu ThuTucHC vào IndexedDB...');
                    await db.thuTucHC.bulkPut(mapped);
                    console.log('CACHE SAVED: ThuTucHC đã được lưu.');
                } catch (error) {
                    console.error('Lỗi khi lưu ThuTucHC vào IndexedDB:', error);
                }
            }

            return mapped;
        } catch (error) {
            console.error('API FAILED: Không thể tải ThuTucHC từ nguồn JSON.', error);
            throw error;
        }
    }
}

export const thuTucHCRepository = new ThuTucHCRepository();


