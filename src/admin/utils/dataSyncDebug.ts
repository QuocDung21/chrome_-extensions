import { db } from '../db/db';
import { dataSyncService } from '../services/dataSyncService';

/**
 * Utility functions để debug và test việc đồng bộ dữ liệu
 */
export class DataSyncDebug {
    /**
     * Kiểm tra dữ liệu đã đồng bộ
     */
    static async checkSyncStatus() {
        console.log('🔍 Checking sync status...');

        const isSynced = await dataSyncService.isDataSynced();
        console.log('📊 Is data synced:', isSynced);

        if (isSynced) {
            const stats = await dataSyncService.getDataStats();
            console.log('📈 Data stats:', stats);
        }

        return isSynced;
    }

    /**
     * Kiểm tra dữ liệu trong IndexedDB
     */
    static async checkIndexedDBData() {
        console.log('🔍 Checking IndexedDB data...');

        const [linhVucCount, thuTucCount, thanhPhanCount, localFilesCount] = await Promise.all([
            db.linhVuc.count(),
            db.thuTucHanhChinh.count(),
            db.thanhPhanHoSoTTHC.count(),
            db.thanhPhanHoSoTTHCLocal.count()
        ]);

        console.log('📊 IndexedDB counts:', {
            linhVuc: linhVucCount,
            thuTucHanhChinh: thuTucCount,
            thanhPhanHoSoTTHC: thanhPhanCount,
            localFiles: localFilesCount
        });

        return { linhVucCount, thuTucCount, thanhPhanCount, localFilesCount };
    }

    /**
     * Tìm kiếm mẫu đơn theo maThuTucHanhChinh
     */
    static async findTemplatesByMaTTHC(maTTHC: string) {
        console.log(`🔍 Finding templates for maTTHC: ${maTTHC}`);

        // Tìm thuTucHanhChinhID từ bảng thuTucHanhChinh
        const thuTucRecord = await db.thuTucHanhChinh
            .where('maThuTucHanhChinh')
            .equals(maTTHC)
            .first();

        if (!thuTucRecord) {
            console.log('❌ No TTHC record found for maTTHC:', maTTHC);
            return [];
        }

        console.log('✅ Found TTHC record:', {
            thuTucHanhChinhID: thuTucRecord.thuTucHanhChinhID,
            tenThuTucHanhChinh: thuTucRecord.tenThuTucHanhChinh,
            maThuTucHanhChinh: thuTucRecord.maThuTucHanhChinh
        });

        // Tìm templates theo thuTucHanhChinhID
        const templates = await db.thanhPhanHoSoTTHC
            .where('thuTucHanhChinhID')
            .equals(thuTucRecord.thuTucHanhChinhID)
            .toArray();

        console.log(`✅ Found ${templates.length} templates for TTHC ${maTTHC}`);
        console.log(
            '📋 Templates:',
            templates.map(t => ({
                thanhPhanHoSoTTHCID: t.thanhPhanHoSoTTHCID,
                tenThanhPhanHoSoTTHC: t.tenThanhPhanHoSoTTHC,
                tenTepDinhKem: t.tenTepDinhKem
            }))
        );

        return templates;
    }

    /**
     * Kiểm tra tất cả mẫu đơn có sẵn
     */
    static async listAllTemplates() {
        console.log('🔍 Listing all templates...');

        const allTemplates = await db.thanhPhanHoSoTTHC.toArray();
        console.log(`📊 Total templates in IndexedDB: ${allTemplates.length}`);

        // Nhóm theo thuTucHanhChinhID
        const groupedByTTHC = allTemplates.reduce(
            (acc, template) => {
                const tthcId = template.thuTucHanhChinhID;
                if (!acc[tthcId]) {
                    acc[tthcId] = [];
                }
                acc[tthcId].push(template);
                return acc;
            },
            {} as { [key: string]: any[] }
        );

        console.log(
            '📋 Templates grouped by TTHC ID:',
            Object.keys(groupedByTTHC).length,
            'groups'
        );

        // Log một số nhóm mẫu
        const sampleGroups = Object.entries(groupedByTTHC).slice(0, 5);
        for (const [tthcId, templates] of sampleGroups) {
            console.log(`📁 TTHC ID ${tthcId}: ${templates.length} templates`);
        }

        return { allTemplates, groupedByTTHC };
    }

    /**
     * Test việc tìm kiếm mẫu đơn
     */
    static async testTemplateSearch() {
        console.log('🧪 Testing template search...');

        // Lấy một số maTTHC để test
        const thuTucRecords = await db.thuTucHanhChinh.limit(5).toArray();

        for (const record of thuTucRecords) {
            console.log(`\n🔍 Testing search for: ${record.maThuTucHanhChinh}`);
            await this.findTemplatesByMaTTHC(record.maThuTucHanhChinh);
        }
    }

    /**
     * Kiểm tra files offline
     */
    static async checkOfflineFiles() {
        console.log('🔍 Checking offline files...');

        const localFiles = await db.thanhPhanHoSoTTHCLocal.toArray();
        console.log(`📊 Total offline files: ${localFiles.length}`);

        if (localFiles.length > 0) {
            const totalSize = localFiles.reduce((sum, file) => sum + file.fileSize, 0);
            console.log(`📈 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

            // Log một số file mẫu
            const sampleFiles = localFiles.slice(0, 3);
            console.log(
                '📋 Sample offline files:',
                sampleFiles.map(f => ({
                    thanhPhanHoSoTTHCID: f.thanhPhanHoSoTTHCID,
                    tenTepDinhKem: f.tenTepDinhKem,
                    fileSize: f.fileSize,
                    downloadedAt: new Date(f.downloadedAt).toLocaleString()
                }))
            );
        }

        return localFiles;
    }

    /**
     * Chạy tất cả các test
     */
    static async runAllTests() {
        console.log('🚀 Running all data sync tests...\n');

        try {
            await this.checkSyncStatus();
            console.log('\n');

            await this.checkIndexedDBData();
            console.log('\n');

            await this.listAllTemplates();
            console.log('\n');

            await this.testTemplateSearch();
            console.log('\n');

            await this.checkOfflineFiles();
            console.log('\n');

            console.log('✅ All tests completed successfully!');
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
}

// Export để sử dụng trong console
(window as any).DataSyncDebug = DataSyncDebug;
