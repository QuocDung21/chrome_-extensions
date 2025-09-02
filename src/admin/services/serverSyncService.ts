// --- CẤU HÌNH ---
// !!! QUAN TRỌNG: Thay thế URL này bằng địa chỉ server của bạn
const SERVER_BASE_URL = 'http://laptrinhid.qlns.vn';
const API_ENDPOINT_GET_FILES = '/uploads/files/'; // Thay thế bằng API endpoint thật để lấy danh sách file

// --- TYPE DEFINITIONS ---
// Định nghĩa cấu trúc dữ liệu sau khi đã được xử lý, sẵn sàng cho việc đồng bộ
interface ProcessedFile {
    maTTHC: string;
    originalName: string;
    downloadUrl: string;
}

// --- BỘ ĐỆM (CACHE) ---
// Tạo một bộ đệm để lưu trữ bản đồ ánh xạ, tránh việc phải đọc và xử lý file JSON mỗi lần đồng bộ
let fileNameToCodeMap: Map<string, string> | null = null;

/**
 * Tải và tạo bản đồ ánh xạ từ tenFile sang maTTHC.
 * Kết quả sẽ được lưu vào cache để tăng tốc cho những lần gọi sau.
 */
const getFileNameToCodeMap = async (): Promise<Map<string, string>> => {
    if (fileNameToCodeMap) {
        return fileNameToCodeMap;
    }

    console.log('🗺️ Creating file name to procedure code map...');
    const response = await fetch('/DanhSachTTHC.json');
    if (!response.ok) {
        throw new Error('Không thể tải file DanhSachTTHC.json để ánh xạ.');
    }
    const procedureList: any[] = await response.json();

    const newMap = new Map<string, string>();
    for (const procedure of procedureList) {
        if (procedure.tenFile && procedure.maTTHC) {
            newMap.set(procedure.tenFile, procedure.maTTHC);
        }
    }

    fileNameToCodeMap = newMap;
    console.log(`🗺️ Map created with ${newMap.size} entries.`);
    return fileNameToCodeMap;
};

/**
 * Tách tên file gốc ra khỏi tên file đã được server thay đổi.
 * Ví dụ: "18.TK...[uuid].docx" -> "18.TK....docx"
 */
const getOriginalFileName = (serverFileName: string): string | null => {
    // Regex này tìm và loại bỏ một chuỗi UUID (có hoặc không có gạch nối) đứng trước phần đuôi file
    const uuidRegex = /[\da-f]{8}-?[\da-f]{4}-?[\da-f]{4}-?[\da-f]{4}-?[\da-f]{12}/i;
    const extensionRegex = /(\.docx|\.doc)$/i;

    const extensionMatch = serverFileName.match(extensionRegex);
    if (!extensionMatch) return null; // Không phải file word
    const extension = extensionMatch[0];

    const nameWithoutExtension = serverFileName.replace(extensionRegex, '');
    const originalNameWithoutExtension = nameWithoutExtension.replace(uuidRegex, '');

    // Nếu không có gì thay đổi, trả về tên gốc. Điều này xử lý trường hợp server không đổi tên file.
    if (
        nameWithoutExtension === originalNameWithoutExtension &&
        !uuidRegex.test(nameWithoutExtension)
    ) {
        return serverFileName;
    }

    // Nếu có sự thay đổi (đã loại bỏ UUID), trả về tên file đã được khôi phục
    if (originalNameWithoutExtension) {
        return originalNameWithoutExtension + extension;
    }

    return null;
};

/**
 * Gọi API server, nhận danh sách file và xử lý chúng thành một định dạng chuẩn.
 */
const fetchAndProcessFileList = async (): Promise<ProcessedFile[]> => {
    console.log(`📞 Calling API: ${SERVER_BASE_URL}${API_ENDPOINT_GET_FILES}`);

    // Trong thực tế, bạn sẽ bỏ comment đoạn code fetch này
    /*
    const response = await fetch(`${SERVER_BASE_URL}${API_ENDPOINT_GET_FILES}`);
    if (!response.ok) {
        throw new Error("Không thể kết nối tới server để lấy danh sách file.");
    }
    const serverResponse = await response.json();

    if (!serverResponse.success || !Array.isArray(serverResponse.data)) {
        throw new Error("Dữ liệu trả về từ server không hợp lệ.");
    }
    const serverFilePaths: string[] = serverResponse.data;
    */

    // --- PHẦN GIẢ LẬP ĐỂ TEST ---
    // Sử dụng dữ liệu bạn cung cấp để giả lập
    const serverResponse = {
        success: true,
        data: [
            '18.TKyeucaubansaotrichluchotich5eb55ed7-e7fa-4609-80c2-5d665d60887c_edited_2025-08-27T04-05-07.docx8cfbed39-fc57-467a-9f2d-f66e4425a157.docx'
        ]
    };
    const serverFilePaths: string[] = serverResponse.data;
    // --- KẾT THÚC PHẦN GIẢ LẬP ---

    const map = await getFileNameToCodeMap();
    const processedFiles: ProcessedFile[] = [];

    for (const filePath of serverFilePaths) {
        const fileNameFromServer = filePath.split('/').pop();
        if (!fileNameFromServer) continue;

        const originalName = getOriginalFileName(fileNameFromServer);
        if (!originalName) {
            console.warn(`⚠️ Không thể xác định tên gốc cho file: ${fileNameFromServer}. Bỏ qua.`);
            continue;
        }

        const maTTHC = map.get(originalName);
        if (!maTTHC) {
            console.warn(`🗺️ Không tìm thấy Mã TTHC cho file: "${originalName}". Bỏ qua.`);
            continue;
        }

        processedFiles.push({
            maTTHC,
            originalName,
            downloadUrl: `${SERVER_BASE_URL}${filePath}`
        });
    }

    console.log(
        `✅ Processed ${processedFiles.length}/${serverFilePaths.length} files successfully.`
    );
    return processedFiles;
};

/**
 * Tải nội dung một file từ URL
 */
const downloadFile = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Tải file thất bại từ ${url}: ${response.statusText}`);
    }
    return response.blob();
};

/**
 * Hàm chính để thực hiện đồng bộ
 */
export const syncTemplatesFromServer = async (
    syncDirHandle: FileSystemDirectoryHandle,
    onProgress: (progress: { message: string; value: number }) => void
) => {
    try {
        onProgress({ message: 'Đang lấy và xử lý danh sách file từ server...', value: 0 });
        const filesToSync = await fetchAndProcessFileList();
        const totalFiles = filesToSync.length;

        if (totalFiles === 0) {
            onProgress({ message: 'Không tìm thấy file hợp lệ nào để đồng bộ.', value: 100 });
            return;
        }

        for (let i = 0; i < totalFiles; i++) {
            const fileInfo = filesToSync[i];
            const progress = Math.round(((i + 1) / totalFiles) * 100);
            const displayName = `${fileInfo.maTTHC}/${fileInfo.originalName}`;
            onProgress({
                message: `(${i + 1}/${totalFiles}) Đang tải: ${displayName}`,
                value: progress
            });

            try {
                // Tạo thư mục [MaTTHC]
                const procedureDirHandle = await syncDirHandle.getDirectoryHandle(fileInfo.maTTHC, {
                    create: true
                });
                // Tạo thư mục 'docx' bên trong
                const docxDirHandle = await procedureDirHandle.getDirectoryHandle('docx', {
                    create: true
                });

                // Tải file
                const fileBlob = await downloadFile(fileInfo.downloadUrl);

                // Ghi file vào thư mục
                const fileHandle = await docxDirHandle.getFileHandle(fileInfo.originalName, {
                    create: true
                });
                const writable = await fileHandle.createWritable();
                await writable.write(fileBlob);
                await writable.close();
            } catch (fileError) {
                console.error(`Lỗi khi xử lý file ${displayName}:`, fileError);
            }
        }
        onProgress({ message: 'Đồng bộ hoàn tất!', value: 100 });
    } catch (error) {
        console.error('Lỗi nghiêm trọng trong quá trình đồng bộ:', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        onProgress({ message: `Đồng bộ thất bại: ${errorMessage}`, value: 100 });
        throw error;
    }
};
