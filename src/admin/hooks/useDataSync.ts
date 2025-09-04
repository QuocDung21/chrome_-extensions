import { useCallback, useEffect, useState } from 'react';

import { SyncStatus, dataSyncService } from '@/admin/services/dataSyncService';

export interface DataSyncStats {
    linhVuc: number;
    thuTucHanhChinh: number;
    thanhPhanHoSoTTHC: number;
    localFiles: number;
    totalFileSize: number;
}

export const useDataSync = () => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(dataSyncService.getSyncStatus());
    const [isDataSynced, setIsDataSynced] = useState(false);
    const [dataStats, setDataStats] = useState<DataSyncStats>({
        linhVuc: 0,
        thuTucHanhChinh: 0,
        thanhPhanHoSoTTHC: 0,
        localFiles: 0,
        totalFileSize: 0
    });

    // Check sync status on mount
    useEffect(() => {
        checkSyncStatus();
        loadDataStats();
    }, []);

    const checkSyncStatus = useCallback(async () => {
        try {
            const synced = await dataSyncService.isDataSynced();
            setIsDataSynced(synced);
        } catch (error) {
            console.error('Error checking sync status:', error);
        }
    }, []);

    const loadDataStats = useCallback(async () => {
        try {
            const stats = await dataSyncService.getDataStats();
            setDataStats(stats);
        } catch (error) {
            console.error('Error loading data stats:', error);
        }
    }, []);

    const syncAllData = useCallback(
        async (options?: {
            forceRefresh?: boolean;
            downloadFiles?: boolean;
            onProgress?: (status: SyncStatus) => void;
        }) => {
            try {
                setSyncStatus(dataSyncService.getSyncStatus());

                await dataSyncService.syncAllData({
                    forceRefresh: false,
                    downloadFiles: true,
                    onProgress: status => {
                        setSyncStatus(status);
                        options?.onProgress?.(status);
                    },
                    ...options
                });

                await checkSyncStatus();
                await loadDataStats();

                return true;
            } catch (error) {
                console.error('Error syncing data:', error);
                throw error;
            }
        },
        [checkSyncStatus, loadDataStats]
    );

    const refreshData = useCallback(
        async (options?: {
            downloadFiles?: boolean;
            onProgress?: (status: SyncStatus) => void;
        }) => {
            try {
                setSyncStatus(dataSyncService.getSyncStatus());

                await dataSyncService.refreshData({
                    forceRefresh: true,
                    downloadFiles: true,
                    onProgress: status => {
                        setSyncStatus(status);
                        options?.onProgress?.(status);
                    },
                    ...options
                });

                await checkSyncStatus();
                await loadDataStats();

                return true;
            } catch (error) {
                console.error('Error refreshing data:', error);
                throw error;
            }
        },
        [checkSyncStatus, loadDataStats]
    );

    const clearAllData = useCallback(async () => {
        try {
            await dataSyncService.clearAllData();
            await checkSyncStatus();
            await loadDataStats();
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }, [checkSyncStatus, loadDataStats]);

    return {
        syncStatus,
        isDataSynced,
        dataStats,
        syncAllData,
        refreshData,
        clearAllData,
        checkSyncStatus,
        loadDataStats
    };
};
