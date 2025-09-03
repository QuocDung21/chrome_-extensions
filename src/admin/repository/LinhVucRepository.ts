import { db } from '../db/db';
import { LinhVuc, linhVucApiService } from '../services/linhVucService';

class LinhVucRepository {
    async getLinhVucList(): Promise<LinhVuc[]> {
        const cachedCount = await db.linhVuc.count();
        if (cachedCount > 0) {
            return db.linhVuc.toArray();
        }
        const apiResponse = await linhVucApiService.getAllLinhVuc(1, 300);
        if (apiResponse.success && apiResponse.data && apiResponse.data.items.length > 0) {
            const linhVucItems = apiResponse.data.items;
            try {
                await db.linhVuc.bulkAdd(linhVucItems);
                return linhVucItems;
            } catch (error) {
                return linhVucItems;
            }
        } else {
            throw new Error(apiResponse.error?.message || 'Lỗi không xác định từ API');
        }
    }
}

export const linhVucRepository = new LinhVucRepository();
