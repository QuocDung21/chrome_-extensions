import { db } from '../db/db';
import { LinhVuc, linhVucApiService } from '../services/linhVucService';

class LinhVucRepository {

    async getLinhVucList(): Promise<LinhVuc[]> {
        const cachedCount = await db.linhVuc.count();

        if (cachedCount > 0) {
            console.log('CACHE HIT: Dữ liệu Lĩnh Vực đã có, đọc từ IndexedDB.');
            return db.linhVuc.toArray();
        }

        // 2. Nếu không có dữ liệu, gọi API để fetch
        console.log('CACHE MISS: Bắt đầu tải dữ liệu Lĩnh Vực từ API...');

        // Gọi API để lấy tất cả dữ liệu (ví dụ: trang 1 với 300 mục)
        const apiResponse = await linhVucApiService.getAllLinhVuc(1, 300);

        if (apiResponse.success && apiResponse.data && apiResponse.data.items.length > 0) {
            const linhVucItems = apiResponse.data.items;
            console.log(`API SUCCESS: Tải thành công ${linhVucItems.length} mục Lĩnh Vực.`);

            try {
                // 3. Lưu dữ liệu vừa tải được vào IndexedDB
                console.log('SAVING TO CACHE: Đang lưu dữ liệu vào IndexedDB...');
                await db.linhVuc.bulkAdd(linhVucItems); // Dùng bulkAdd để thêm nhiều mục hiệu quả
                console.log('CACHE SAVED: Lưu dữ liệu thành công!');

                // Trả về dữ liệu vừa lấy được từ API
                return linhVucItems;
            } catch (error) {
                console.error('Lỗi khi lưu dữ liệu vào IndexedDB:', error);
                // Dù lưu lỗi, vẫn trả về dữ liệu để UI có thể hiển thị
                return linhVucItems;
            }
        } else {
            // Xử lý trường hợp API gọi thất bại
            console.error('API FAILED: Không thể tải dữ liệu Lĩnh Vực.', apiResponse.error);
            // Trả về mảng rỗng hoặc throw lỗi tùy theo cách bạn muốn UI xử lý
            throw new Error(apiResponse.error?.message || 'Lỗi không xác định từ API');
        }
    }
}

// Xuất một instance duy nhất của repository (singleton pattern)
export const linhVucRepository = new LinhVucRepository();
