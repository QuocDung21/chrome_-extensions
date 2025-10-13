import Dexie, { Table } from 'dexie';

// --- TYPE DEFINITIONS ---

export interface LinhVuc {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

export interface DoiTuongThucHien {
    maDoiTuongThucHien: string;   // primary key
    tenDoiTuongThucHien: string;
}



// Định nghĩa interface cho tài liệu làm việc được lưu theo Mã TTHC
export interface WorkingDocument {
    id?: number; // primary key (auto)
    maTTHC: string; // code key for grouping
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

export interface ThuTucHanhChinh {
    thuTucHanhChinhID: string;
    maThuTucHanhChinh: string;
    tenThuTucHanhChinh: string;
    maCapHanhChinh: string;
    loaiThuTucHanhChinh: number;
    maLinhVuc: string;
    trinhTuThucHien: string;
    cachThucHien: string;
    doiTuongThucHien: string;
    diaChiTiepNhan: string;
    yeuCau: string;
    ketQuaThucHien: string;
    moTa: string;
    canCuPhapLy: string;
    vanBanID: string;
}

export interface ThanhPhanHoSoTTHC {
    thanhPhanHoSoTTHCID: string;
    thuTucHanhChinhID: string;
    tenThanhPhanHoSoTTHC: string;
    tenTepDinhKem: string;
    duongDanTepDinhKem: string;
    duongDanTepDinhKemLocal?: string; // Local file path/ID for offline access
    soBanChinh: string;
    soBanSao: string;
    ghiChu: string | null;
}

// Interface for storing downloaded file data locally
export interface ThanhPhanHoSoTTHCLocal {
    id?: number; // Auto-increment primary key
    thanhPhanHoSoTTHCID: string; // Reference to ThanhPhanHoSoTTHC
    duongDanTepDinhKem: string; // Original file path from API
    tenTepDinhKem: string; // Original file name
    downloadUrl: string; // Complete download URL
    blob: Blob; // File content as blob
    mimeType: string; // File MIME type
    downloadedAt: number; // Timestamp when downloaded
    fileSize: number; // File size in bytes
}

// --- DATABASE CLASS ---
export class AppDatabase extends Dexie {
    linhVuc!: Table<LinhVuc, string>;
    workingDocuments!: Table<WorkingDocument, string>;
    workingDocumentsV2!: Table<WorkingDocument, number>;
    thuTucHC!: Table<ThuTucHC, string>;
    thuTucHanhChinh!: Table<ThuTucHanhChinh, string>;
    thanhPhanHoSoTTHC!: Table<ThanhPhanHoSoTTHC, string>;
    thanhPhanHoSoTTHCLocal!: Table<ThanhPhanHoSoTTHCLocal, number>;
    doiTuongThucHien!: Table<DoiTuongThucHien, string>;
    constructor() {
        super('DocumentAI_DB');
        this.version(1).stores({
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

        // V2: Cho phép lưu nhiều tài liệu làm việc theo cùng một Mã TTHC
        this.version(4)
            .stores({
                // id tự tăng làm khóa chính, maTTHC để nhóm, updatedAt để sắp xếp mới nhất
                workingDocumentsV2: '++id, maTTHC, updatedAt'
            })
            .upgrade(async tx => {
                try {
                    const old = await (
                        tx.table('workingDocuments') as Table<WorkingDocument, any>
                    ).toArray();
                    for (const d of old) {
                        await (tx.table('workingDocumentsV2') as Table<WorkingDocument, any>).add({
                            maTTHC: d.maTTHC,
                            fileName: d.fileName,
                            mimeType: d.mimeType,
                            blob: d.blob,
                            updatedAt: d.updatedAt
                        });
                    }
                } catch { }
            });

        this.version(5).stores({
            thuTucHanhChinh: 'thuTucHanhChinhID, tenThuTucHanhChinh, maLinhVuc, maThuTucHanhChinh'
        });
        this.version(6).stores({
            thanhPhanHoSoTTHC: 'thanhPhanHoSoTTHCID, thuTucHanhChinhID'
        });

        // Version 7: Add table for locally stored files
        this.version(7).stores({
            thanhPhanHoSoTTHCLocal: '++id, thanhPhanHoSoTTHCID, duongDanTepDinhKem, downloadedAt'
        });

        this.version(8).stores({
            doiTuongThucHien: 'maDoiTuongThucHien, tenDoiTuongThucHien'
        });
    }
}

// Khởi tạo và export một instance của database để dùng trong toàn bộ ứng dụng
export const db = new AppDatabase();
//
