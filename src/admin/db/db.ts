import Dexie, { Table } from 'dexie';

// --- TYPE DEFINITIONS ---

export interface LinhVuc {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

// --- DATABASE CLASS ---
export class AppDatabase extends Dexie {
    linhVuc!: Table<LinhVuc, string>;
    constructor() {
        super('DocumentAI_DB');
        this.version(1).stores({
            linhVuc: 'maLinhVuc, tenLinhVuc'
        });
    }
}

// Khởi tạo và export một instance của database để dùng trong toàn bộ ứng dụng
export const db = new AppDatabase();
