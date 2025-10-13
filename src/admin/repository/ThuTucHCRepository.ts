import { ThuTucHC as ThuTucHCLocal, db } from '../db/db';
import { ThuTucHanhChinh, thuTucHanhChinhApiService } from '../services/thuTucHanhChinh';

class ThuTucHCRepository {
    async getAllThuTucHC(): Promise<ThuTucHCLocal[]> {
        const cachedCount = await db.thuTucHC.count();

        if (cachedCount > 0) {
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
            const mapped: ThuTucHCLocal[] = Array.isArray(jsonArray)
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
    async getAllThuTucHCApi(): Promise<ThuTucHanhChinh[]> {
        const cachedCount = await db.thuTucHanhChinh.count();
        if (cachedCount > 0) {
            return db.thuTucHanhChinh.toArray();
        }
        const apiResponse = await thuTucHanhChinhApiService.getAllThuTucHanhChinh(1, 300);
        if (apiResponse.success && apiResponse.data && apiResponse.data.items.length > 0) {
            const thuTucItems = apiResponse.data.items;
            try {
                await db.thuTucHanhChinh.bulkAdd(thuTucItems);
                return thuTucItems;
            } catch (error) {
                return thuTucItems;
            }
        } else {
            const errorMessage = apiResponse.error?.message || 'Lỗi không xác định từ API';
            throw new Error(errorMessage);
        }
    }
}

export const thuTucHCRepository = new ThuTucHCRepository();
