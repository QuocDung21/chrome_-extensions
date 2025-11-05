import axios from 'axios';

import { ConfigConstant } from '../constant/config.constant';
import { ThanhPhanHoSoTTHC, ThanhPhanHoSoTTHCLocal, db } from '../db/db';
import { thanhPhanHoSoTTHCApiService } from '../services/thanhPhanHoSoService';

class ThanhPhanHoSoTTHCRepository {
    private baseDownloadUrl = 'http://laptrinhid.qlns.vn/uploads/tthc/';
    private alternativeBaseUrls = [
        'http://laptrinhid.qlns.vn/uploads/',
        'http://laptrinhid.qlns.vn/',
        'https://laptrinhid.qlns.vn/uploads/tthc/',
        'https://laptrinhid.qlns.vn/uploads/'
    ];

    private getCandidateBaseUrls(): string[] {
        const bases = [this.baseDownloadUrl, ...this.alternativeBaseUrls];
        const unique = Array.from(new Set(bases.filter(Boolean)));
        return unique.sort((a, b) => {
            const aHttps = a.startsWith('https');
            const bHttps = b.startsWith('https');
            if (aHttps === bHttps) return 0;
            return aHttps ? -1 : 1;
        });
    }

    private combineUrl(base: string, path: string): string {
        const normalizedBase = base.replace(/\/+$/, '');
        const normalizedPath = path.replace(/^\/+/, '').replace(/^\\+/, '');
        if (/^https?:\/\//i.test(path)) return path;
        return `${normalizedBase}/${normalizedPath}`;
    }

    /**
     * Download and store file locally in IndexedDB
     * @param item ThanhPhanHoSoTTHC item containing file information
     * @returns Promise<string | null> - Returns local file ID if successful, null if failed
     */
    async downloadAndStoreFile(item: ThanhPhanHoSoTTHC): Promise<string | null> {
        try {
            // Check if file already exists locally
            const existingFile = await db.thanhPhanHoSoTTHCLocal
                .where('thanhPhanHoSoTTHCID')
                .equals(item.thanhPhanHoSoTTHCID)
                .first();

            if (existingFile) {
                console.log(`✅ File already exists locally for ID: ${item.thanhPhanHoSoTTHCID}`);
                return existingFile.id?.toString() || null;
            }

            const urlsToTry = [
                `${this.baseDownloadUrl}${item.duongDanTepDinhKem}`,
                ...this.alternativeBaseUrls.map(base => `${base}${item.duongDanTepDinhKem}`)
            ];

            console.log(`📋 File details:`, {
                thanhPhanHoSoTTHCID: item.thanhPhanHoSoTTHCID,
                tenTepDinhKem: item.tenTepDinhKem,
                duongDanTepDinhKem: item.duongDanTepDinhKem,
                urlsToTry
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let response: any = null;
            let successfulUrl = '';

            for (const downloadUrl of urlsToTry) {
                try {
                    response = await axios.get(downloadUrl, {
                        responseType: 'blob',
                        timeout: 10000,
                        onDownloadProgress: progressEvent => {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / (progressEvent.total || 1)
                            );
                            console.log(`📊 Download progress: ${percentCompleted}%`);
                        }
                    });

                    if (response.status === 200) {
                        successfulUrl = downloadUrl;
                        console.log(`✅ Successfully downloaded from: ${downloadUrl}`);
                        break;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    console.log(
                        `❌ Failed to download from ${downloadUrl}: ${error.response?.status || error.message}`
                    );
                    continue;
                }
            }

            if (!response || response.status !== 200) {
                throw new Error(`All download attempts failed for file: ${item.tenTepDinhKem}`);
            }

            const blob = response.data;
            const contentType = response.headers['content-type'] || 'application/octet-stream';

            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (blob.size > maxSize) {
                throw new Error(`File too large: ${blob.size} bytes (max: ${maxSize} bytes)`);
            }

            // Validate file type
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'application/msword', // .doc
                'application/pdf', // .pdf
                'text/plain' // .txt
            ];

            if (!allowedTypes.includes(contentType)) {
                console.warn(
                    `⚠️ Unexpected file type: ${contentType} for file: ${item.tenTepDinhKem}`
                );
            }

            // Create local file record
            const localFileRecord: ThanhPhanHoSoTTHCLocal = {
                thanhPhanHoSoTTHCID: item.thanhPhanHoSoTTHCID,
                duongDanTepDinhKem: item.duongDanTepDinhKem,
                tenTepDinhKem: item.tenTepDinhKem,
                downloadUrl: successfulUrl,
                blob: blob,
                mimeType: contentType,
                downloadedAt: Date.now(),
                fileSize: blob.size
            };

            // Store in IndexedDB
            const fileId = await db.thanhPhanHoSoTTHCLocal.add(localFileRecord);
            console.log(
                `✅ File stored locally with ID: ${fileId}, size: ${blob.size} bytes, downloaded from: ${successfulUrl}`
            );

            // Update the original record with local reference
            await db.thanhPhanHoSoTTHC.update(item.thanhPhanHoSoTTHCID, {
                duongDanTepDinhKemLocal: fileId.toString()
            });

            return fileId.toString();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 404) {
                console.error(`❌ File not found (404) for ${item.thanhPhanHoSoTTHCID}:`, {
                    url: `${this.baseDownloadUrl}${item.duongDanTepDinhKem}`,
                    duongDanTepDinhKem: item.duongDanTepDinhKem,
                    tenTepDinhKem: item.tenTepDinhKem
                });
            } else {
                console.error(`❌ Failed to download file for ${item.thanhPhanHoSoTTHCID}:`, error);
            }
            return null;
        }
    }

    /**
     * Download all files for a list of ThanhPhanHoSoTTHC items
     * @param items Array of ThanhPhanHoSoTTHC items
     * @returns Promise<void>
     */
    async downloadAllFiles(items: ThanhPhanHoSoTTHC[]): Promise<void> {
        console.log(`Starting download of ${items.length} files...`);

        const downloadPromises = items.map(item => this.downloadAndStoreFile(item));

        try {
            const results = await Promise.allSettled(downloadPromises);

            const successful = results.filter(
                result => result.status === 'fulfilled' && result.value !== null
            ).length;

            const failed = results.length - successful;

            console.log(`✅ Download completed: ${successful} successful, ${failed} failed`);
        } catch (error) {
            console.error('❌ Error during batch file download:', error);
        }
    }

    /**
     * Get locally stored file blob by ThanhPhanHoSoTTHCID
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<Blob | null>
     */
    async getLocalFileBlob(thanhPhanHoSoTTHCID: string): Promise<Blob | null> {
        try {
            const localFile = await db.thanhPhanHoSoTTHCLocal
                .where('thanhPhanHoSoTTHCID')
                .equals(thanhPhanHoSoTTHCID)
                .first();

            return localFile?.blob || null;
        } catch (error) {
            console.error(`❌ Failed to get local file blob for ${thanhPhanHoSoTTHCID}:`, error);
            return null;
        }
    }

    /**
     * Check if file exists locally
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<boolean>
     */
    async hasLocalFile(thanhPhanHoSoTTHCID: string): Promise<boolean> {
        try {
            const count = await db.thanhPhanHoSoTTHCLocal
                .where('thanhPhanHoSoTTHCID')
                .equals(thanhPhanHoSoTTHCID)
                .count();

            return count > 0;
        } catch (error) {
            console.error(
                `❌ Failed to check local file existence for ${thanhPhanHoSoTTHCID}:`,
                error
            );
            return false;
        }
    }

    /**
     * Clear all locally stored files
     * @returns Promise<void>
     */
    async clearAllLocalFiles(): Promise<void> {
        try {
            await db.thanhPhanHoSoTTHCLocal.clear();

            // Also clear local references in main table
            const allItems = await db.thanhPhanHoSoTTHC.toArray();
            const updatePromises = allItems.map(item =>
                db.thanhPhanHoSoTTHC.update(item.thanhPhanHoSoTTHCID, {
                    duongDanTepDinhKemLocal: undefined
                })
            );

            await Promise.all(updatePromises);
            console.log('✅ All local files cleared');
        } catch (error) {
            console.error('❌ Failed to clear local files:', error);
        }
    }

    async getThanhPhanHoSoList(): Promise<ThanhPhanHoSoTTHC[]> {
        const cachedCount = await db.thanhPhanHoSoTTHC.count();

        // Check exist local storage
        if (cachedCount > 0) {
            const cachedItems = await db.thanhPhanHoSoTTHC.toArray();
            console.log(`✅ Using cached ThanhPhanHoSoTTHC data: ${cachedItems.length} items`);
            // Start background download for items without local files
            this.downloadMissingFiles(cachedItems);
            return cachedItems;
        }

        console.log('📡 No cached data found, fetching from API...');
        const apiResponse = await thanhPhanHoSoTTHCApiService.getAllThanhPhanHoSoTTHC(1, 100, '');
        if (apiResponse.success && apiResponse.data && apiResponse.data.items.length > 0) {
            const thanhPhanHoSoItems = apiResponse.data.items;
            try {
                await db.thanhPhanHoSoTTHC.bulkPut(thanhPhanHoSoItems);
                console.log(
                    `✅ Cached ${thanhPhanHoSoItems.length} ThanhPhanHoSoTTHC items to IndexedDB`
                );
                // Start background download of all files
                this.downloadAllFiles(thanhPhanHoSoItems);
                return thanhPhanHoSoItems;
            } catch (error) {
                console.error('❌ Error caching data to IndexedDB:', error);
                // Even if storage fails, still download files in background
                this.downloadAllFiles(thanhPhanHoSoItems);
                return thanhPhanHoSoItems;
            }
        } else {
            throw new Error(apiResponse.error?.message || 'Lỗi không xác định từ API');
        }
    }

    async getThanhPhanHoSoByMaTTHC(maTTHC: string) {
        // Kiểm tra xem có dữ liệu trong IndexedDB chưa
        const existingCount = await db.thanhPhanHoSoTTHC.count();

        if (existingCount === 0) {
            // Nếu chưa có dữ liệu, tải từ API trước
            await this.getThanhPhanHoSoList();
        }

        // Tìm kiếm trong IndexedDB theo thuTucHanhChinhID (nếu maTTHC là ID)
        let filteredItems = await db.thanhPhanHoSoTTHC
            .where('thuTucHanhChinhID')
            .equals(maTTHC)
            .toArray();

        // Nếu không tìm thấy, thử tìm theo maThuTucHanhChinh thông qua bảng thuTucHanhChinh
        if (filteredItems.length === 0) {
            console.log(`🔍 No direct match found, searching by maThuTucHanhChinh: ${maTTHC}`);

            // Tìm thuTucHanhChinhID từ bảng thuTucHanhChinh
            const thuTucRecord = await db.thuTucHanhChinh
                .where('maThuTucHanhChinh')
                .equals(maTTHC)
                .first();

            if (thuTucRecord) {
                console.log(`✅ Found TTHC record with ID: ${thuTucRecord.thuTucHanhChinhID}`);
                filteredItems = await db.thanhPhanHoSoTTHC
                    .where('thuTucHanhChinhID')
                    .equals(thuTucRecord.thuTucHanhChinhID)
                    .toArray();
            }
        }

        if (filteredItems.length > 0) {
            console.log(
                `✅ Found ${filteredItems.length} templates for TTHC ${maTTHC} in IndexedDB`
            );
            return filteredItems;
        }

        // Fallback: tải từ API nếu không tìm thấy trong IndexedDB
        console.log(`📡 No data found in IndexedDB for TTHC ${maTTHC}, fetching from API...`);
        const response = await thanhPhanHoSoTTHCApiService.getAllThanhPhanHoSoTTHC(1, 100, maTTHC);
        if (response.success && response.data) {
            await db.thanhPhanHoSoTTHC.bulkPut(response.data.items);
            // Start background download for new items
            this.downloadAllFiles(response.data.items);
            return response.data.items;
        }
        return [];
    }

    /**
     * Download and store a specific file by ThanhPhanHoSoTTHCID
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<boolean> - Returns true if successful, false if failed
     */
    async downloadFileById(thanhPhanHoSoTTHCID: string): Promise<boolean> {
        try {
            // Get the item from database first
            const item = await db.thanhPhanHoSoTTHC.get(thanhPhanHoSoTTHCID);
            if (!item) {
                console.error(`❌ Item not found in database: ${thanhPhanHoSoTTHCID}`);
                return false;
            }

            // Check if file already exists locally
            const hasLocal = await this.hasLocalFile(thanhPhanHoSoTTHCID);
            if (hasLocal) {
                console.log(`✅ File already exists locally: ${thanhPhanHoSoTTHCID}`);
                return true;
            }

            // Download and store the file
            const fileId = await this.downloadAndStoreFile(item);
            return fileId !== null;
        } catch (error) {
            console.error(`❌ Failed to download file by ID ${thanhPhanHoSoTTHCID}:`, error);
            return false;
        }
    }

    /**
     * Get file blob for immediate use (downloads if not available locally)
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<Blob | null>
     */
    async getFileBlobForUse(thanhPhanHoSoTTHCID: string): Promise<Blob | null> {
        try {
            // First try to get from local storage
            let blob = await this.getLocalFileBlob(thanhPhanHoSoTTHCID);

            if (blob) {
                console.log(`✅ Using local file for: ${thanhPhanHoSoTTHCID}`);
                return blob;
            }

            // If not available locally, download it
            console.log(`📥 File not available locally, downloading: ${thanhPhanHoSoTTHCID}`);
            const downloadSuccess = await this.downloadFileById(thanhPhanHoSoTTHCID);

            if (downloadSuccess) {
                // Try to get the blob again after download
                blob = await this.getLocalFileBlob(thanhPhanHoSoTTHCID);
                if (blob) {
                    console.log(`✅ File downloaded and ready for use: ${thanhPhanHoSoTTHCID}`);
                    return blob;
                }
            }

            console.error(`❌ Failed to get file blob for: ${thanhPhanHoSoTTHCID}`);
            return null;
        } catch (error) {
            console.error(`❌ Error getting file blob for ${thanhPhanHoSoTTHCID}:`, error);
            return null;
        }
    }

    /**
     * Get all locally stored files information
     * @returns Promise<ThanhPhanHoSoTTHCLocal[]>
     */
    async getAllLocalFiles(): Promise<ThanhPhanHoSoTTHCLocal[]> {
        try {
            return await db.thanhPhanHoSoTTHCLocal.toArray();
        } catch (error) {
            console.error('❌ Failed to get all local files:', error);
            return [];
        }
    }

    /**
     * Get local file information by ThanhPhanHoSoTTHCID
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<ThanhPhanHoSoTTHCLocal | null>
     */
    async getLocalFileInfo(thanhPhanHoSoTTHCID: string): Promise<ThanhPhanHoSoTTHCLocal | null> {
        try {
            const localFile = await db.thanhPhanHoSoTTHCLocal
                .where('thanhPhanHoSoTTHCID')
                .equals(thanhPhanHoSoTTHCID)
                .first();

            return localFile || null;
        } catch (error) {
            console.error(`❌ Failed to get local file info for ${thanhPhanHoSoTTHCID}:`, error);
            return null;
        }
    }

    /**
     * Create a download URL for a locally stored file (blob URL)
     * @param thanhPhanHoSoTTHCID ID of the ThanhPhanHoSoTTHC item
     * @returns Promise<string | null> - Returns blob URL or null if file not found
     */
    async createLocalFileUrl(thanhPhanHoSoTTHCID: string): Promise<string | null> {
        try {
            const blob = await this.getLocalFileBlob(thanhPhanHoSoTTHCID);
            if (blob) {
                return URL.createObjectURL(blob);
            }
            return null;
        } catch (error) {
            console.error(`❌ Failed to create local file URL for ${thanhPhanHoSoTTHCID}:`, error);
            return null;
        }
    }

    private extractFileNameFromDisposition(disposition?: string | null): string | null {
        if (!disposition) return null;
        const matches = disposition.match(/filename\*?=(?:UTF-8'')?"?([^;"\n]+)/i);
        if (!matches || matches.length < 2) return null;
        try {
            const value = matches[1].trim().replace(/^"(.*)"$/, '$1');
            return decodeURIComponent(value);
        } catch {
            return matches[1].trim();
        }
    }

    private ensureDocxFileName(original?: string | null): string {
        const base = (original || 'document').replace(/\.[^.]+$/, '');
        return `${base || 'document'}.docx`;
    }

    // Xóa for khỏi test (Notes)
    async convertRemoteFileToDocx(
        sourceUrl: string,
        originalFileName?: string
    ): Promise<{ blob: Blob; fileName: string } | null> {
        const endpoints = [ConfigConstant.SOCKET_URL, ConfigConstant.API_URL]
            .filter(Boolean)
            .map(base => `${base.replace(/\/$/, '')}/template/render-docx`);

        for (const endpoint of endpoints) {
            try {
                const response = await axios.post(
                    endpoint,
                    {
                        templateUrl: sourceUrl,
                        context: {},
                        inline: true,
                        clean: false
                    },
                    {
                        responseType: 'blob',
                        withCredentials: true
                    }
                );

                if (response.status >= 200 && response.status < 300 && response.data) {
                    const contentType = response.headers['content-type'] || '';
                    if (
                        !contentType
                            .toLowerCase()
                            .includes(
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            )
                    ) {
                        const text = await response.data.text();
                        console.warn('⚠️ DOCX conversion endpoint returned unexpected payload', {
                            endpoint,
                            contentType,
                            text
                        });
                        continue;
                    }

                    const disposition = response.headers['content-disposition'];
                    const detectedName =
                        this.extractFileNameFromDisposition(
                            Array.isArray(disposition) ? disposition[0] : disposition
                        ) || this.ensureDocxFileName(originalFileName);

                    return { blob: response.data, fileName: detectedName };
                }

                console.warn('⚠️ Unexpected DOCX conversion response', {
                    endpoint,
                    status: response.status,
                    data: response.data
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                const status = error?.response?.status;
                const data = error?.response?.data;
                console.error(`❌ Failed to convert DOC to DOCX via ${endpoint}:`, {
                    status,
                    data,
                    message: error?.message
                });
            }
        }

        return null;
    }

    async getFileUrlForUse(
        thanhPhanHoSoTTHCID: string,
        duongDanTepDinhKem?: string
    ): Promise<string | null> {
        try {
            const localInfo = await this.getLocalFileInfo(thanhPhanHoSoTTHCID);
            if (localInfo?.downloadUrl) return localInfo.downloadUrl;

            const dbItem = await db.thanhPhanHoSoTTHC.get(thanhPhanHoSoTTHCID);
            const relativePath = duongDanTepDinhKem || dbItem?.duongDanTepDinhKem;
            if (!relativePath) return null;

            if (/^https?:\/\//i.test(relativePath)) return relativePath;

            const candidateBases = this.getCandidateBaseUrls();
            if (!candidateBases.length) return null;

            return this.combineUrl(candidateBases[0], relativePath);
        } catch (error) {
            console.error(`❌ Failed to get file URL for ${thanhPhanHoSoTTHCID}:`, error);
            return null;
        }
    }

    /**
     * Get storage statistics
     * @returns Promise<{totalFiles: number, totalSize: number}>
     */
    async getStorageStats(): Promise<{ totalFiles: number; totalSize: number }> {
        try {
            const allFiles = await this.getAllLocalFiles();
            const totalFiles = allFiles.length;
            const totalSize = allFiles.reduce((sum, file) => sum + file.fileSize, 0);

            return { totalFiles, totalSize };
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error);
            return { totalFiles: 0, totalSize: 0 };
        }
    }

    /**
     * Download files that are missing locally (background operation)
     * @param items Array of ThanhPhanHoSoTTHC items to check
     * @returns Promise<void>
     */
    private async downloadMissingFiles(items: ThanhPhanHoSoTTHC[]): Promise<void> {
        try {
            const itemsNeedingDownload: ThanhPhanHoSoTTHC[] = [];

            for (const item of items) {
                const hasLocal = await this.hasLocalFile(item.thanhPhanHoSoTTHCID);
                if (!hasLocal) {
                    itemsNeedingDownload.push(item);
                }
            }
            if (itemsNeedingDownload.length > 0) {
                console.log(`Found ${itemsNeedingDownload.length} files to download`);
                await this.downloadAllFiles(itemsNeedingDownload);
            }
        } catch (error) {
            console.error('❌ Error in downloadMissingFiles:', error);
        }
    }

    async renderPdfFromBlob(blob: Blob): Promise<Blob | null> {
        const createPayload = async () => {
            const fd = new FormData();
            const arrayBuf = await blob.arrayBuffer();
            const fileName = 'document.docx';
            const file = new File([arrayBuf], fileName, {
                type:
                    blob.type ||
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            fd.append('file', file);
            fd.append('inline', 'true');
            return fd;
        };

        const endpoints = [ConfigConstant.API_URL, ConfigConstant.SOCKET_URL]
            .filter(Boolean)
            .map(base => `${base.replace(/\/$/, '')}/convert/pdf`);

        for (const endpoint of endpoints) {
            try {
                const formData = await createPayload();
                const response = await axios.post(endpoint, formData, {
                    responseType: 'blob',
                    withCredentials: true
                });
                if (response.status >= 200 && response.status < 300 && response.data) {
                    const contentType = response.headers['content-type'] || '';
                    if (!contentType.toLowerCase().includes('pdf')) {
                        const text = await response.data.text();
                        console.warn('⚠️ PDF endpoint returned non-PDF payload', {
                            endpoint,
                            contentType,
                            text
                        });
                        continue;
                    }
                    return response.data;
                }
                console.warn('⚠️ Unexpected PDF render response', {
                    endpoint,
                    status: response.status,
                    data: response.data
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                const status = error?.response?.status;
                const data = error?.response?.data;
                console.error(`❌ Failed to render PDF from blob via ${endpoint}:`, {
                    status,
                    data,
                    message: error?.message
                });
            }
        }

        return null;
    }
}

export const thanhPhanHoSoTTHCRepository = new ThanhPhanHoSoTTHCRepository();
