import { DoiTuongThucHien, db } from '@/admin/db/db';

import { doiTuongThucHienApiService } from '../services/doiTuongService';

class DoiTuongThucHienRepository {
    async getCombo(): Promise<{ value: string; label: string }[]> {
        const list = await this.getAll();
        return list.map(it => ({
            value: it.maDoiTuongThucHien,
            label: it.tenDoiTuongThucHien
        }));
    }

    async getDict(codes?: string[]): Promise<Record<string, string> | string[]> {
        const dict: Record<string, string> = {};
        const list = await this.getAll();

        for (const it of list) {
            dict[it.maDoiTuongThucHien] = it.tenDoiTuongThucHien;
        }
        if (codes && Array.isArray(codes)) {
            return codes.map(code => dict[code] || code);
        }
        return dict;
    }

    async getAll(): Promise<DoiTuongThucHien[]> {
        const cachedCount = await db.doiTuongThucHien.count();
        if (cachedCount > 0) {
            return db.doiTuongThucHien.orderBy('maDoiTuongThucHien').toArray();
        }
        const apiResp = await doiTuongThucHienApiService.getAllDoiTuongThucHien();
        if (apiResp.success && apiResp.data && apiResp.data.length > 0) {
            const items = apiResp.data;
            try {
                await db.transaction('rw', db.doiTuongThucHien, async () => {
                    await db.doiTuongThucHien.clear();
                    await db.doiTuongThucHien.bulkAdd(items);
                });
            } catch {
                // fallback upsert
                await db.doiTuongThucHien.bulkPut(items);
            }
            return items;
        }
        throw new Error(apiResp.error?.message || 'Lỗi không xác định từ API');
    }
}

export const doiTuongThucHienRepository = new DoiTuongThucHienRepository();
