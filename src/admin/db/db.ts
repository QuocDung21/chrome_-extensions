import Dexie, { Table } from 'dexie';

// --- TYPE DEFINITIONS ---

// Định nghĩa interface cho Lĩnh Vực
export interface LinhVuc {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

// Định nghĩa interface cho tài liệu làm việc được lưu theo Mã TTHC
export interface WorkingDocument {
    maTTHC: string; // primary key
    fileName: string;
    mimeType: string;
    blob: Blob;
    updatedAt: number; // epoch millis
}

// Định nghĩa interface cho ThuTucHC (Thủ tục hành chính)
export interface ThuTucHC {
    maTTHC: string;
    tenTTHC: string;
    qdCongBo: string;
    doiTuong: string;
    linhVuc: string;
    coQuanCongKhai: string;
    capThucHien: string;
    tinhTrang: string;
    tenGiayTo: string;
    mauDon: string;
    tenFile: string;
}

// --- DATABASE CLASS ---
export class AppDatabase extends Dexie {
    linhVuc!: Table<LinhVuc, string>; 
    workingDocuments!: Table<WorkingDocument, string>;
    thuTucHC!: Table<ThuTucHC, string>;

    constructor() {
        super('DocumentAI_DB');

        // Khai báo schema cho database.
        // Chỉ cần version 1 vì chúng ta đang bắt đầu.
        this.version(1).stores({
            // 'maLinhVuc' là khóa chính (primary key).
            // 'tenLinhVuc' là một trường được đánh chỉ mục (index) để tìm kiếm nhanh hơn.
            linhVuc: 'maLinhVuc, tenLinhVuc'
        });

        // Thêm store cho tài liệu làm việc theo Mã TTHC
        this.version(2).stores({
            // 'maTTHC' là khóa chính. 'updatedAt' làm chỉ mục phụ giúp truy vấn theo thời gian
            workingDocuments: 'maTTHC, updatedAt'
        });

        // Thêm store cho ThuTucHC (TTHC)
        this.version(3).stores({
            // Khóa chính là 'maTTHC'. Đánh chỉ mục phụ theo 'tenTTHC' và 'linhVuc' để truy vấn nhanh
            thuTucHC: 'maTTHC, tenTTHC, linhVuc'
        });
    }
}

// Khởi tạo và export một instance của database để dùng trong toàn bộ ứng dụng
export const db = new AppDatabase();
