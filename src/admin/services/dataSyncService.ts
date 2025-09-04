import { db } from '../db/db';
import { thanhPhanHoSoTTHCRepository } from '../repository/ThanhPhanHoSoTTHCRepository';

import { linhVucApiService } from './linhVucService';
import { thanhPhanHoSoTTHCApiService } from './thanhPhanHoSoService';
import { thuTucHanhChinhApiService } from './thuTucHanhChinh';

export interface SyncStatus {
    isSyncing: boolean;
    lastSyncTime: number | null;
    syncProgress: {
        linhVuc: { completed: boolean; total: number; current: number };
        thuTucHanhChinh: { completed: boolean; total: number; current: number };
        thanhPhanHoSoTTHC: { completed: boolean; total: number; current: number };
        files: { completed: boolean; total: number; current: number };
    };
    errors: string[];
}

export interface SyncOptions {
    forceRefresh?: boolean;
    downloadFiles?: boolean;
    batchSize?: number;
    onProgress?: (status: SyncStatus) => void;
}

class DataSyncService {
    private syncStatus: SyncStatus = {
        isSyncing: false,
        lastSyncTime: null,
        syncProgress: {
            linhVuc: { completed: false, total: 0, current: 0 },
            thuTucHanhChinh: { completed: false, total: 0, current: 0 },
            thanhPhanHoSoTTHC: { completed: false, total: 0, current: 0 },
            files: { completed: false, total: 0, current: 0 }
        },
        errors: []
    };

    /**
     * Kiểm tra xem dữ liệu đã được đồng bộ chưa
     */
    async isDataSynced(): Promise<boolean> {
        try {
            const [linhVucCount, thuTucCount, thanhPhanCount] = await Promise.all([
                db.linhVuc.count(),
                db.thuTucHanhChinh.count(),
                db.thanhPhanHoSoTTHC.count()
            ]);

            return linhVucCount > 0 && thuTucCount > 0 && thanhPhanCount > 0;
        } catch (error) {
            console.error('❌ Error checking sync status:', error);
            return false;
        }
    }

    /**
     * Lấy thông tin trạng thái đồng bộ
     */
    getSyncStatus(): SyncStatus {
        return { ...this.syncStatus };
    }

    /**
     * Đồng bộ toàn bộ dữ liệu từ API vào IndexedDB
     */
    async syncAllData(options: SyncOptions = {}): Promise<SyncStatus> {
        const { forceRefresh = false, downloadFiles = true, batchSize = 100, onProgress } = options;

        // Kiểm tra nếu đã đồng bộ và không force refresh
        if (!forceRefresh && (await this.isDataSynced())) {
            console.log('✅ Data already synced, skipping sync process');
            return this.syncStatus;
        }

        this.syncStatus.isSyncing = true;
        this.syncStatus.errors = [];
        this.syncStatus.syncProgress = {
            linhVuc: { completed: false, total: 0, current: 0 },
            thuTucHanhChinh: { completed: false, total: 0, current: 0 },
            thanhPhanHoSoTTHC: { completed: false, total: 0, current: 0 },
            files: { completed: false, total: 0, current: 0 }
        };

        try {
            console.log('🚀 Starting full data sync...');
            onProgress?.(this.syncStatus);

            // 1. Đồng bộ Lĩnh vực
            await this.syncLinhVucData(onProgress);

            // 2. Đồng bộ Thủ tục hành chính
            await this.syncThuTucHanhChinhData(onProgress);

            // 3. Đồng bộ Thành phần hồ sơ TTHC
            await this.syncThanhPhanHoSoTTHCData(onProgress);

            // 4. Tải xuống files (nếu được yêu cầu)
            if (downloadFiles) {
                await this.syncFilesData(onProgress);
            }

            this.syncStatus.isSyncing = false;
            this.syncStatus.lastSyncTime = Date.now();

            console.log('✅ Full data sync completed successfully');
            onProgress?.(this.syncStatus);

            return this.syncStatus;
        } catch (error) {
            console.error('❌ Error during full data sync:', error);
            this.syncStatus.isSyncing = false;
            this.syncStatus.errors.push(error instanceof Error ? error.message : 'Unknown error');
            onProgress?.(this.syncStatus);
            throw error;
        }
    }

    /**
     * Đồng bộ dữ liệu Lĩnh vực
     */
    private async syncLinhVucData(onProgress?: (status: SyncStatus) => void): Promise<void> {
        try {
            console.log('📋 Syncing LinhVuc data...');

            const response = await linhVucApiService.getAllLinhVuc(1, 1000);
            if (response.success && response.data) {
                const items = response.data.items;
                this.syncStatus.syncProgress.linhVuc.total = items.length;
                onProgress?.(this.syncStatus);

                // Xóa dữ liệu cũ nếu có
                await db.linhVuc.clear();

                // Lưu dữ liệu mới theo batch
                const batches = this.createBatches(items, 100);
                for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i];
                    await db.linhVuc.bulkAdd(batch);

                    this.syncStatus.syncProgress.linhVuc.current = (i + 1) * batch.length;
                    onProgress?.(this.syncStatus);
                }

                this.syncStatus.syncProgress.linhVuc.completed = true;
                console.log(`✅ LinhVuc synced: ${items.length} items`);
            } else {
                throw new Error(response.error?.message || 'Failed to fetch LinhVuc data');
            }
        } catch (error) {
            console.error('❌ Error syncing LinhVuc:', error);
            this.syncStatus.errors.push(
                `LinhVuc sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    /**
     * Đồng bộ dữ liệu Thủ tục hành chính
     */
    private async syncThuTucHanhChinhData(
        onProgress?: (status: SyncStatus) => void
    ): Promise<void> {
        try {
            console.log('📋 Syncing ThuTucHanhChinh data...');

            const response = await thuTucHanhChinhApiService.getAllThuTucHanhChinh(1, 1000);
            if (response.success && response.data) {
                const items = response.data.items;
                this.syncStatus.syncProgress.thuTucHanhChinh.total = items.length;
                onProgress?.(this.syncStatus);

                // Xóa dữ liệu cũ nếu có
                await db.thuTucHanhChinh.clear();

                // Lưu dữ liệu mới theo batch
                const batches = this.createBatches(items, 100);
                for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i];
                    await db.thuTucHanhChinh.bulkAdd(batch);

                    this.syncStatus.syncProgress.thuTucHanhChinh.current = (i + 1) * batch.length;
                    onProgress?.(this.syncStatus);
                }

                this.syncStatus.syncProgress.thuTucHanhChinh.completed = true;
                console.log(`✅ ThuTucHanhChinh synced: ${items.length} items`);
            } else {
                throw new Error(response.error?.message || 'Failed to fetch ThuTucHanhChinh data');
            }
        } catch (error) {
            console.error('❌ Error syncing ThuTucHanhChinh:', error);
            this.syncStatus.errors.push(
                `ThuTucHanhChinh sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    /**
     * Đồng bộ dữ liệu Thành phần hồ sơ TTHC
     */
    private async syncThanhPhanHoSoTTHCData(
        onProgress?: (status: SyncStatus) => void
    ): Promise<void> {
        try {
            console.log('📋 Syncing ThanhPhanHoSoTTHC data...');

            const response = await thanhPhanHoSoTTHCApiService.getAllThanhPhanHoSoTTHC(1, 1000, '');
            if (response.success && response.data) {
                const items = response.data.items;
                this.syncStatus.syncProgress.thanhPhanHoSoTTHC.total = items.length;
                onProgress?.(this.syncStatus);

                console.log(`📊 Fetched ${items.length} ThanhPhanHoSoTTHC items from API`);

                // Xóa dữ liệu cũ nếu có
                await db.thanhPhanHoSoTTHC.clear();

                // Lưu dữ liệu mới theo batch
                const batches = this.createBatches(items, 100);
                for (let i = 0; i < batches.length; i++) {
                    const batch = batches[i];
                    await db.thanhPhanHoSoTTHC.bulkAdd(batch);

                    this.syncStatus.syncProgress.thanhPhanHoSoTTHC.current = (i + 1) * batch.length;
                    onProgress?.(this.syncStatus);
                }

                this.syncStatus.syncProgress.thanhPhanHoSoTTHC.completed = true;
                console.log(`✅ ThanhPhanHoSoTTHC synced: ${items.length} items`);

                // Log một số mẫu để debug
                if (items.length > 0) {
                    console.log(
                        '📋 Sample ThanhPhanHoSoTTHC items:',
                        items.slice(0, 3).map(item => ({
                            thanhPhanHoSoTTHCID: item.thanhPhanHoSoTTHCID,
                            thuTucHanhChinhID: item.thuTucHanhChinhID,
                            tenThanhPhanHoSoTTHC: item.tenThanhPhanHoSoTTHC
                        }))
                    );
                }
            } else {
                throw new Error(
                    response.error?.message || 'Failed to fetch ThanhPhanHoSoTTHC data'
                );
            }
        } catch (error) {
            console.error('❌ Error syncing ThanhPhanHoSoTTHC:', error);
            this.syncStatus.errors.push(
                `ThanhPhanHoSoTTHC sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    /**
     * Đồng bộ files (tải xuống tất cả files)
     */
    private async syncFilesData(onProgress?: (status: SyncStatus) => void): Promise<void> {
        try {
            console.log('📁 Syncing files...');

            // Lấy tất cả thành phần hồ sơ để tải files
            const allItems = await db.thanhPhanHoSoTTHC.toArray();
            this.syncStatus.syncProgress.files.total = allItems.length;
            onProgress?.(this.syncStatus);

            let completed = 0;
            for (const item of allItems) {
                try {
                    // Kiểm tra xem file đã tồn tại chưa
                    const hasLocal = await thanhPhanHoSoTTHCRepository.hasLocalFile(
                        item.thanhPhanHoSoTTHCID
                    );
                    if (!hasLocal) {
                        await thanhPhanHoSoTTHCRepository.downloadFileById(
                            item.thanhPhanHoSoTTHCID
                        );
                    }
                } catch (error) {
                    console.warn(
                        `⚠️ Failed to download file for ${item.thanhPhanHoSoTTHCID}:`,
                        error
                    );
                }

                completed++;
                this.syncStatus.syncProgress.files.current = completed;
                onProgress?.(this.syncStatus);
            }

            this.syncStatus.syncProgress.files.completed = true;
            console.log(`✅ Files sync completed: ${completed}/${allItems.length} files processed`);
        } catch (error) {
            console.error('❌ Error syncing files:', error);
            this.syncStatus.errors.push(
                `Files sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    /**
     * Tạo các batch từ array
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Làm mới dữ liệu (force sync)
     */
    async refreshData(options: SyncOptions = {}): Promise<SyncStatus> {
        return this.syncAllData({ ...options, forceRefresh: true });
    }

    /**
     * Xóa tất cả dữ liệu đã đồng bộ
     */
    async clearAllData(): Promise<void> {
        try {
            console.log('🗑️ Clearing all synced data...');

            await Promise.all([
                db.linhVuc.clear(),
                db.thuTucHanhChinh.clear(),
                db.thanhPhanHoSoTTHC.clear(),
                db.thanhPhanHoSoTTHCLocal.clear()
            ]);

            this.syncStatus.lastSyncTime = null;
            this.syncStatus.syncProgress = {
                linhVuc: { completed: false, total: 0, current: 0 },
                thuTucHanhChinh: { completed: false, total: 0, current: 0 },
                thanhPhanHoSoTTHC: { completed: false, total: 0, current: 0 },
                files: { completed: false, total: 0, current: 0 }
            };

            console.log('✅ All synced data cleared');
        } catch (error) {
            console.error('❌ Error clearing data:', error);
            throw error;
        }
    }

    /**
     * Lấy thống kê dữ liệu đã đồng bộ
     */
    async getDataStats(): Promise<{
        linhVuc: number;
        thuTucHanhChinh: number;
        thanhPhanHoSoTTHC: number;
        localFiles: number;
        totalFileSize: number;
    }> {
        try {
            const [linhVucCount, thuTucCount, thanhPhanCount, localFiles, stats] =
                await Promise.all([
                    db.linhVuc.count(),
                    db.thuTucHanhChinh.count(),
                    db.thanhPhanHoSoTTHC.count(),
                    db.thanhPhanHoSoTTHCLocal.count(),
                    thanhPhanHoSoTTHCRepository.getStorageStats()
                ]);

            return {
                linhVuc: linhVucCount,
                thuTucHanhChinh: thuTucCount,
                thanhPhanHoSoTTHC: thanhPhanCount,
                localFiles: localFiles,
                totalFileSize: stats.totalSize
            };
        } catch (error) {
            console.error('❌ Error getting data stats:', error);
            return {
                linhVuc: 0,
                thuTucHanhChinh: 0,
                thanhPhanHoSoTTHC: 0,
                localFiles: 0,
                totalFileSize: 0
            };
        }
    }
}

export const dataSyncService = new DataSyncService();
