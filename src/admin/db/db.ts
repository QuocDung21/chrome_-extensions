import Dexie, { Table } from 'dexie';

// --- TYPE DEFINITIONS ---

// Định nghĩa interface cho Lĩnh Vực
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

        // Khai báo schema cho database.
        // Chỉ cần version 1 vì chúng ta đang bắt đầu.
        this.version(1).stores({
            // 'maLinhVuc' là khóa chính (primary key).
            // 'tenLinhVuc' là một trường được đánh chỉ mục (index) để tìm kiếm nhanh hơn.
            linhVuc: 'maLinhVuc, tenLinhVuc'
        });
    }
}

// Khởi tạo và export một instance của database để dùng trong toàn bộ ứng dụng
export const db = new AppDatabase();
