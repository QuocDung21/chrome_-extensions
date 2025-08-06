import { saveAs } from 'file-saver';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export interface TemplateFile {
    label: string;
    path: string;
    description: string;
    category?: string;
    tags?: string[];
}

export interface ProcessingData {
    [key: string]: any;
}

export interface TemplateProcessingOptions {
    delimiters?: {
        start: string;
        end: string;
    };
    paragraphLoop?: boolean;
    linebreaks?: boolean;
    nullGetter?: () => string;
}

export interface ProcessingResult {
    blob: Blob;
    fileName: string;
    fileSize: number;
    processingTime: number;
}

// Default template processing options
const DEFAULT_OPTIONS: TemplateProcessingOptions = {
    delimiters: {
        start: '{',
        end: '}'
    },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ''
};

/**
 * Process Word template with data
 */
export const processWordTemplate = async (
    templateArrayBuffer: ArrayBuffer,
    data: ProcessingData,
    options: TemplateProcessingOptions = DEFAULT_OPTIONS
): Promise<Blob> => {
    const startTime = performance.now();

    try {
        const zip = new PizZip(templateArrayBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: options.paragraphLoop ?? DEFAULT_OPTIONS.paragraphLoop,
            linebreaks: options.linebreaks ?? DEFAULT_OPTIONS.linebreaks,
            nullGetter: options.nullGetter ?? DEFAULT_OPTIONS.nullGetter,
            delimiters: options.delimiters ?? DEFAULT_OPTIONS.delimiters
        });

        doc.setData(data);
        doc.render();

        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const processingTime = performance.now() - startTime;
        console.log(`Template processed in ${processingTime.toFixed(2)}ms`);

        return blob;
    } catch (error: any) {
        console.error('Template processing error:', error);

        if (error.properties?.id === 'template_error') {
            throw new Error(
                'Lỗi cú pháp trong file mẫu Word. Vui lòng kiểm tra lại các thẻ {placeholder}.'
            );
        }

        throw new Error(`Lỗi xử lý file mẫu: ${error.message}`);
    }
};

/**
 * Load template from URL
 */
export const loadTemplateFromUrl = async (templatePath: string): Promise<ArrayBuffer> => {
    try {
        const response = await fetch(templatePath);

        if (!response.ok) {
            throw new Error(`Không thể tải file mẫu: ${response.statusText} (${response.status})`);
        }

        return await response.arrayBuffer();
    } catch (error) {
        console.error('Error loading template:', error);
        throw new Error(`Lỗi tải template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Prepare data for template processing
 */
export const prepareTemplateData = (rawData: ProcessingData): ProcessingData => {
    const preparedData = { ...rawData };

    // Add current date/time
    const now = new Date();
    preparedData.current_date = now.toLocaleDateString('vi-VN');
    preparedData.current_time = now.toLocaleTimeString('vi-VN');
    preparedData.current_datetime = now.toLocaleString('vi-VN');
    preparedData.current_year = now.getFullYear().toString();
    preparedData.current_month = (now.getMonth() + 1).toString().padStart(2, '0');
    preparedData.current_day = now.getDate().toString().padStart(2, '0');

    // Process date fields
    if (preparedData.ngay_sinh && typeof preparedData.ngay_sinh === 'string') {
        preparedData.ngay_sinh_full = preparedData.ngay_sinh;
        const dateParts = preparedData.ngay_sinh.split('/');
        if (dateParts.length === 3) {
            preparedData.ngay = dateParts[0];
            preparedData.thang = dateParts[1];
            preparedData.nam = dateParts[2];
        }
    }

    // Process common fields
    if (preparedData.ho_ten) {
        preparedData.ho_ten_upper = preparedData.ho_ten.toUpperCase();
        preparedData.ho_ten_title = preparedData.ho_ten
            .split(' ')
            .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // Process address fields
    if (preparedData.dia_chi) {
        preparedData.dia_chi_upper = preparedData.dia_chi.toUpperCase();
    }

    return preparedData;
};

/**
 * Download generated document
 */
export const downloadDocument = (
    blob: Blob,
    templateName: string,
    customFileName?: string
): void => {
    try {
        const baseName = templateName.replace(/\s+/g, '_').replace(/[^\w\s-]/g, '');
        const fileName = customFileName || `${baseName}_da_dien.docx`;

        saveAs(blob, fileName);

        console.log(`Document downloaded: ${fileName}`);
    } catch (error) {
        console.error('Error downloading document:', error);
        throw new Error('Không thể tải xuống tài liệu');
    }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate template file
 */
export const validateTemplateFile = (file: File): boolean => {
    // Check file type
    if (!file.name.endsWith('.docx')) {
        throw new Error('Chỉ hỗ trợ file .docx');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('File quá lớn (tối đa 10MB)');
    }

    return true;
};

/**
 * Extract template placeholders
 */
export const extractTemplatePlaceholders = async (templateArrayBuffer: ArrayBuffer): Promise<string[]> => {
    try {
        const zip = new PizZip(templateArrayBuffer);
        const documentXml = zip.files['word/document.xml']?.asText();

        if (!documentXml) {
            console.warn('Could not extract document XML');
            return [];
        }

        const placeholderRegex = /\{([^}]+)\}/g;
        const placeholders: string[] = [];
        let match;

        while ((match = placeholderRegex.exec(documentXml)) !== null) {
            const placeholder = match[1].trim();
            if (placeholder && !placeholders.includes(placeholder)) {
                placeholders.push(placeholder);
            }
        }

        return placeholders;
    } catch (error) {
        console.error('Error extracting placeholders:', error);
        return [];
    }
};

/**
 * Generate document with progress tracking
 */
export const generateDocumentWithProgress = async (
    templatePath: string,
    data: ProcessingData,
    onProgress?: (progress: number, step: string) => void
): Promise<ProcessingResult> => {
    const startTime = performance.now();

    try {
        // Load template
        onProgress?.(10, 'Đang tải mẫu...');
        const templateArrayBuffer = await loadTemplateFromUrl(templatePath);
        onProgress?.(30, 'Đang chuẩn bị dữ liệu...');

        // Prepare data
        const preparedData = prepareTemplateData(data);
        onProgress?.(50, 'Đang xử lý dữ liệu...');

        // Process template
        onProgress?.(70, 'Đang tạo tài liệu...');
        const blob = await processWordTemplate(templateArrayBuffer, preparedData);
        onProgress?.(100, 'Hoàn thành');

        const processingTime = performance.now() - startTime;

        return {
            blob,
            fileName: 'generated_document.docx',
            fileSize: blob.size,
            processingTime
        };
    } catch (error) {
        onProgress?.(0, 'Lỗi');
        throw error;
    }
};

/**
 * Create print-friendly window
 */
export const createPrintWindow = (content: string, title: string = 'In tài liệu'): Window | null => {
    const printWindow = window.open('', '_blank');

    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        margin: 20px; 
                        line-height: 1.6;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                    }
                    table { 
                        border-collapse: collapse; 
                        width: 100%; 
                        margin-bottom: 16px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 8px 12px; 
                        text-align: left;
                    }
                    th { 
                        background-color: #f5f5f5; 
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        return printWindow;
    }

    return null;
};

/**
 * Print document
 */
export const printDocument = (content: string, title?: string): void => {
    const printWindow = createPrintWindow(content, title);

    if (printWindow) {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
}; 