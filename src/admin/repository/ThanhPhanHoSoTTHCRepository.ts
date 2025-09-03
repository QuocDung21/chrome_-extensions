import { db } from '../db/db';
import { thanhPhanHoSoTTHCApiService } from '../services/thanhPhanHoSoService';

class ThanhPhanHoSoTTHCRepository {
    async getThanhPhanHoSoByMaTTHC(maTTHC: string) {
        const response = await thanhPhanHoSoTTHCApiService.getAllThanhPhanHoSoTTHC(1, 100, maTTHC);

        if (response.success && response.data) {
            await db.thanhPhanHoSoTTHC.bulkPut(response.data.items);
            return response.data.items;
        }
        return [];
    }
}

export const thanhPhanHoSoTTHCRepository = new ThanhPhanHoSoTTHCRepository();
