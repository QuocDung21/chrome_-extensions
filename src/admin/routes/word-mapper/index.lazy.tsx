import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import { Socket, io } from 'socket.io-client';

// --- ICON ---
import {
    CheckCircle as CheckCircleIcon,
    Download as DownloadIcon,
    Error as ErrorIcon,
    HourglassTop as HourglassTopIcon,
    Info as InfoIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Warning as WarningIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    IconButton,
    Input,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Tooltip,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

// --- CẤU HÌNH ---
const API_URL = 'http://103.162.21.146:5003';
const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY = 3000;

// --- TYPE DEFINITIONS ---
interface DocumentState {
    selectedTemplatePath: string;
    isLoading: boolean;
    error: string | null;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
    generatedBlob: Blob | null;
    processingStep:
        | 'idle'
        | 'loading_template'
        | 'processing_data'
        | 'generating_document'
        | 'complete';
    progress: number;
    dataSource: 'socket' | 'scanner'; // Thêm nguồn dữ liệu
}

interface ProcessingData {
    [key: string]: any;
}

type ScannedInfo = {
    cccd: string;
    cmnd: string;
    hoTen: string;
    ngaySinh: string;
    gioiTinh: string;
    diaChi: string;
    ngayCap: string;
};

// Thêm interface cho việc xử lý dữ liệu thông minh
interface DataSourceConfig {
    type: 'socket' | 'scanner';
    name: string;
    description: string;
    icon: React.ReactNode;
}

interface DataFormat {
    type: 'qr_cccd' | 'qr_custom' | 'manual_input' | 'json_data' | 'qr_scanner';
    name: string;
    description: string;
    parser: (data: string) => ScannedInfo;
    validator: (data: string) => boolean;
}

// Cấu hình các nguồn dữ liệu
const DATA_SOURCES: DataSourceConfig[] = [
    {
        type: 'socket',
        name: 'Socket App Mobile',
        description: 'Nhận dữ liệu từ ứng dụng mobile qua socket',
        icon: <WifiIcon />
    },
    {
        type: 'scanner',
        name: 'Máy quét QR',
        description: 'Nhận dữ liệu từ máy quét QR hoặc nhập thủ công',
        icon: <PrintIcon />
    }
];

// Cấu hình các định dạng dữ liệu
const DATA_FORMATS: DataFormat[] = [
    {
        type: 'qr_cccd',
        name: 'QR CCCD/CMND',
        description:
            'Định dạng chuẩn CCCD/CMND: CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp',
        parser: (data: string) => {
            const parts = data.split('|');
            if (parts.length < 7) {
                throw new Error('Dữ liệu không đủ thông tin cho định dạng CCCD/CMND');
            }
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = parts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        },
        validator: (data: string) => {
            const parts = data.split('|');
            return parts.length >= 7;
        }
    },
    {
        type: 'qr_custom',
        name: 'QR Tùy chỉnh',
        description: 'Định dạng QR tùy chỉnh với dữ liệu JSON',
        parser: (data: string) => {
            try {
                const jsonData = JSON.parse(data);
                return {
                    cccd: jsonData.cccd || jsonData.CCCD || '',
                    cmnd: jsonData.cmnd || jsonData.CMND || '',
                    hoTen: jsonData.hoTen || jsonData.ho_ten || jsonData.name || '',
                    ngaySinh: jsonData.ngaySinh || jsonData.ngay_sinh || jsonData.birthDate || '',
                    gioiTinh: jsonData.gioiTinh || jsonData.gioi_tinh || jsonData.gender || '',
                    diaChi: jsonData.diaChi || jsonData.dia_chi || jsonData.address || '',
                    ngayCap: jsonData.ngayCap || jsonData.ngay_cap || jsonData.issueDate || ''
                };
            } catch (error) {
                throw new Error('Dữ liệu JSON không hợp lệ');
            }
        },
        validator: (data: string) => {
            try {
                JSON.parse(data);
                return true;
            } catch {
                return false;
            }
        }
    },
    {
        type: 'manual_input',
        name: 'Nhập thủ công',
        description:
            'Nhập dữ liệu theo định dạng: CCCD,CMND,Họ tên,Ngày sinh,Giới tính,Địa chỉ,Ngày cấp',
        parser: (data: string) => {
            const parts = data.split(',');
            if (parts.length < 7) {
                throw new Error('Dữ liệu không đủ thông tin (cần 7 trường)');
            }
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = parts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        },
        validator: (data: string) => {
            const parts = data.split(',');
            return parts.length >= 7;
        }
    },
    {
        type: 'qr_scanner',
        name: 'Máy quét QR',
        description: 'Định dạng từ máy quét QR với nhãn: CCCD:xxx|CMND:xxx|Họ tên:xxx|...',
        parser: (data: string) => {
            // Xử lý dữ liệu từ máy quét QR có thể có nhãn
            const parts = data.split('|');
            if (parts.length < 7) {
                throw new Error('Dữ liệu không đủ thông tin từ máy quét QR');
            }

            // Hàm trích xuất giá trị từ chuỗi có nhãn
            const extractValue = (str: string): string => {
                const colonIndex = str.indexOf(':');
                if (colonIndex !== -1) {
                    return str.substring(colonIndex + 1).trim();
                }
                return str.trim();
            };

            const [
                cccdPart,
                cmndPart,
                hoTenPart,
                ngaySinhPart,
                gioiTinhPart,
                diaChiPart,
                ngayCapPart
            ] = parts;

            return {
                cccd: extractValue(cccdPart),
                cmnd: extractValue(cmndPart),
                hoTen: extractValue(hoTenPart),
                ngaySinh: extractValue(ngaySinhPart),
                gioiTinh: extractValue(gioiTinhPart),
                diaChi: extractValue(diaChiPart),
                ngayCap: extractValue(ngayCapPart)
            };
        },
        validator: (data: string) => {
            const parts = data.split('|');
            return parts.length >= 7;
        }
    }
];

// Hàm phát hiện định dạng dữ liệu thông minh
const detectDataFormat = (data: string): DataFormat => {
    // Thử phát hiện JSON
    if (DATA_FORMATS.find(f => f.type === 'qr_custom')?.validator(data)) {
        return DATA_FORMATS.find(f => f.type === 'qr_custom')!;
    }

    // Thử phát hiện định dạng máy quét QR (có nhãn với dấu :)
    if (data.includes(':') && data.includes('|')) {
        const parts = data.split('|');
        if (parts.length >= 7 && parts.some(part => part.includes(':'))) {
            return DATA_FORMATS.find(f => f.type === 'qr_scanner')!;
        }
    }

    // Thử phát hiện định dạng CCCD/CMND (dấu |)
    if (DATA_FORMATS.find(f => f.type === 'qr_cccd')?.validator(data)) {
        return DATA_FORMATS.find(f => f.type === 'qr_cccd')!;
    }

    // Thử phát hiện định dạng nhập thủ công (dấu ,)
    if (DATA_FORMATS.find(f => f.type === 'manual_input')?.validator(data)) {
        return DATA_FORMATS.find(f => f.type === 'manual_input')!;
    }

    // Mặc định là định dạng CCCD/CMND
    return DATA_FORMATS.find(f => f.type === 'qr_cccd')!;
};

// Hàm chuyển đổi ScannedInfo sang ProcessingData
const convertScannedInfoToProcessingData = (scannedInfo: ScannedInfo): ProcessingData => {
    return {
        // Định dạng camelCase
        cccd: scannedInfo.cccd,
        cmnd: scannedInfo.cmnd,
        hoTen: scannedInfo.hoTen,
        ngaySinh: scannedInfo.ngaySinh,
        gioiTinh: scannedInfo.gioiTinh,
        diaChi: scannedInfo.diaChi,
        ngayCap: scannedInfo.ngayCap,

        // Định dạng snake_case (cho tương thích)
        ho_ten: scannedInfo.hoTen,
        ngay_sinh: scannedInfo.ngaySinh,
        gioi_tinh: scannedInfo.gioiTinh,
        dia_chi: scannedInfo.diaChi,
        ngay_cap: scannedInfo.ngayCap,

        // Các trường bổ sung cho template
        ten: scannedInfo.hoTen,
        hoten: scannedInfo.hoTen,
        ho_va_ten: scannedInfo.hoTen,
        so_cccd: scannedInfo.cccd,
        so_cmnd: scannedInfo.cmnd,
        ngay_thang_nam_sinh: scannedInfo.ngaySinh,
        noi_cu_tru: scannedInfo.diaChi,
        ngay_thang_nam_cap: scannedInfo.ngayCap
    };
};

// Hàm xử lý dữ liệu thông minh
const processDataIntelligently = (data: string): ScannedInfo => {
    const format = detectDataFormat(data);
    console.log(`Phát hiện định dạng: ${format.name}`);

    try {
        return format.parser(data);
    } catch (error) {
        throw new Error(
            `Lỗi xử lý dữ liệu: ${error instanceof Error ? error.message : 'Không xác định'}`
        );
    }
};

interface TTHCRecord {
    stt: string;
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

interface FilterState {
    linhVuc: string;
    thuTuc: string;
    availability: string; // 'all' | 'available' | 'unavailable'
}

interface FilterOptions {
    linhVuc: string[];
    thuTucByLinhVuc: { [linhVuc: string]: string[] };
}

interface EnhancedTTHCRecord extends TTHCRecord {
    isTemplateAvailable: boolean;
}

// --- CUSTOM HOOKS ---
const useSocketConnection = (apiUrl: string) => {
    const [socketStatus, setSocketStatus] = useState<
        'connected' | 'disconnected' | 'connecting' | 'error'
    >('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        setSocketStatus('connecting');
        socketRef.current = io(apiUrl, {
            transports: ['websocket'],
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
            reconnectionDelay: SOCKET_RECONNECT_DELAY
        });

        socketRef.current.on('connect', () => {
            setSocketStatus('connected');
            setReconnectAttempts(0);
        });

        socketRef.current.on('disconnect', () => {
            setSocketStatus('disconnected');
        });

        socketRef.current.on('connect_error', error => {
            console.error('Socket connection error:', error);
            setSocketStatus('error');
            setReconnectAttempts(prev => prev + 1);
        });

        socketRef.current.on('reconnect', attemptNumber => {
            console.log(`Reconnected after ${attemptNumber} attempts`);
            setSocketStatus('connected');
            setReconnectAttempts(0);
        });

        socketRef.current.on('reconnect_failed', () => {
            setSocketStatus('error');
        });
    }, [apiUrl]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSocketStatus('disconnected');
    }, []);

    const emit = useCallback((event: string, data: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        socketStatus,
        reconnectAttempts,
        connect,
        disconnect,
        emit,
        on,
        off
    };
};

const useDocumentProcessor = () => {
    const [processingStep, setProcessingStep] = useState<
        'idle' | 'loading_template' | 'processing_data' | 'generating_document' | 'complete'
    >('idle');
    const [progress, setProgress] = useState(0);

    const processDocument = useCallback(
        async (templatePath: string, data: ProcessingData): Promise<Blob> => {
            try {
                setProcessingStep('loading_template');
                setProgress(10);

                // Load template
                const response = await fetch(templatePath);
                if (!response.ok) {
                    throw new Error(`Không thể tải file mẫu: ${response.statusText}`);
                }
                const templateArrayBuffer = await response.arrayBuffer();
                setProgress(30);

                setProcessingStep('processing_data');
                setProgress(50);

                // Prepare data
                const augmentedData = { ...data };

                // Xử lý ngày sinh (hỗ trợ cả ngay_sinh và ngaySinh)
                const ngaySinh = data.ngay_sinh || data.ngaySinh;
                if (ngaySinh && typeof ngaySinh === 'string') {
                    augmentedData.ngay_sinh_full = ngaySinh;
                    augmentedData.ngaySinh_full = ngaySinh;
                    const dateParts = ngaySinh.split('/');
                    if (dateParts.length === 3) {
                        augmentedData.ngay = dateParts[0];
                        augmentedData.thang = dateParts[1];
                        augmentedData.nam = dateParts[2];
                    }
                }

                // Xử lý ngày cấp (hỗ trợ cả ngay_cap và ngayCap)
                const ngayCap = data.ngay_cap || data.ngayCap;
                if (ngayCap && typeof ngayCap === 'string') {
                    augmentedData.ngay_cap_full = ngayCap;
                    augmentedData.ngayCap_full = ngayCap;
                    const dateParts = ngayCap.split('/');
                    if (dateParts.length === 3) {
                        augmentedData.ngay_cap_ngay = dateParts[0];
                        augmentedData.ngay_cap_thang = dateParts[1];
                        augmentedData.ngay_cap_nam = dateParts[2];
                    }
                }
                // Đảm bảo tất cả các trường đều có giá trị
                const requiredFields = [
                    'cccd',
                    'cmnd',
                    'hoTen',
                    'ngaySinh',
                    'gioiTinh',
                    'diaChi',
                    'ngayCap',
                    'cccd',
                    'cmnd',
                    'ho_ten',
                    'ngay_sinh',
                    'gioi_tinh',
                    'dia_chi',
                    'ngay_cap',
                    'noi_cu_tru' // Thêm trường noi_cu_tru
                ];

                requiredFields.forEach(field => {
                    if (!augmentedData[field]) {
                        augmentedData[field] = '';
                    }
                });

                console.log('Dữ liệu đã được chuẩn bị cho template:', augmentedData);

                setProcessingStep('generating_document');
                setProgress(70);

                // Generate document
                const blob = await fillWordTemplate(templateArrayBuffer, augmentedData);
                setProgress(100);
                setProcessingStep('complete');

                return blob;
            } catch (error) {
                setProcessingStep('idle');
                setProgress(0);
                throw error;
            }
        },
        []
    );

    const resetProcessing = useCallback(() => {
        setProcessingStep('idle');
        setProgress(0);
    }, []);

    return {
        processingStep,
        progress,
        processDocument,
        resetProcessing
    };
};

// --- UTILITY FUNCTIONS ---
const fillWordTemplate = async (
    templateArrayBuffer: ArrayBuffer,
    jsonData: ProcessingData
): Promise<Blob> => {
    try {
        const zip = new PizZip(templateArrayBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => '',
            delimiters: {
                start: '{',
                end: '}'
            }
        });

        doc.setData(jsonData);
        doc.render();

        return doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    } catch (error: any) {
        console.error('Docxtemplater error:', error);
        if (error.properties?.id === 'template_error') {
            throw new Error(
                'Lỗi cú pháp trong file mẫu Word. Vui lòng kiểm tra lại các thẻ {placeholder}.'
            );
        }
        throw new Error(`Lỗi xử lý file mẫu: ${error.message}`);
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Parse CSV data
const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
};

const parseCSVData = (csvContent: string): TTHCRecord[] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const records: TTHCRecord[] = [];

    // Skip header rows (first 6 lines based on CSV structure)
    for (let i = 6; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const columns = parseCSVLine(line);

        // Check if this row has data (either STT or just template file info)
        const hasSTT = columns[0] && columns[0] !== '';
        const hasTemplateFile = columns[11] && columns[11].includes('.doc');

        if (columns.length >= 11 && (hasSTT || hasTemplateFile)) {
            const record: TTHCRecord = {
                stt: columns[0] || '',
                maTTHC: columns[1] || '',
                tenTTHC: columns[2] || '',
                qdCongBo: columns[3] || '',
                doiTuong: columns[4] || '',
                linhVuc: columns[5] || '',
                coQuanCongKhai: columns[6] || '',
                capThucHien: columns[7] || '',
                tinhTrang: columns[8] || '',
                tenGiayTo: columns[9] || '',
                mauDon: columns[10] || '',
                tenFile: columns[11] || ''
            };

            // Only add records that have template files (using the new tenFile column)
            if (record.tenFile && record.tenFile.includes('.doc')) {
                records.push(record);
            }
        }
    }

    return records;
};

const extractTemplateName = (fullPath: string): string => {
    if (!fullPath || !fullPath.includes('/')) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1]; // Get the last part (filename)
};

const createFilterOptions = (records: TTHCRecord[]): FilterOptions => {
    const linhVucSet = new Set<string>();
    const thuTucByLinhVuc: { [linhVuc: string]: string[] } = {};

    records.forEach(record => {
        if (record.linhVuc && record.tenTTHC) {
            const linhVuc = record.linhVuc.trim();
            const thuTuc = record.tenTTHC.trim();

            linhVucSet.add(linhVuc);

            if (!thuTucByLinhVuc[linhVuc]) {
                thuTucByLinhVuc[linhVuc] = [];
            }

            if (!thuTucByLinhVuc[linhVuc].includes(thuTuc)) {
                thuTucByLinhVuc[linhVuc].push(thuTuc);
            }
        }
    });

    // Sort thủ tục cho mỗi lĩnh vực
    Object.keys(thuTucByLinhVuc).forEach(linhVuc => {
        thuTucByLinhVuc[linhVuc].sort();
    });

    return {
        linhVuc: Array.from(linhVucSet).sort(),
        thuTucByLinhVuc
    };
};

// Load available template files
const loadAvailableTemplates = async (): Promise<string[]> => {
    try {
        // Updated list based on actual files in public/templates/ directory
        const knownTemplates = [
            '1.TKngkkhaisinh.docx',
            '14. TK đăng ký lại khai sinh.docx',
            '17.TKthaydoicaichinhbosunghotichxadinhlaidantoc.docx',
            '18.TKyeucaubansaotrichluchotich.docx',
            '19.TKcpGiyXNTTHN.docx',
            '3.TKngkkhait.docx',
            '6.TKngknhnCMC.docx',
            'Mẫu số 02_84ND2020.docx',
            'Mẫu số 03_84ND2020.docx',
            'Mauso1hkdGiynghngkhkinhdoanh.docx',
            'MAUSO21.docx',
            'Mus01 ( xác định lại khuyết tật).docx',
            'Mus01 (đề nghị hưởng trợ cấp hưu trí xã hội).docx',
            'Mus01.docx',
            'Mus02.docx',
            'Mus04.docx',
            'Mus1.docx',
            'Mus15DKLD.docx',
            'Mus1a.docx',
            'Mus1b.docx',
            'Mus1c.docx',
            'Mus1d.docx',
            'Phụ lục 03.docx'
        ];

        // Verify which templates actually exist by trying to fetch them
        const availableTemplates: string[] = [];
        for (const template of knownTemplates) {
            try {
                const response = await fetch(`/templates/${template}`, { method: 'HEAD' });
                if (response.ok) {
                    availableTemplates.push(template);
                }
            } catch (error) {
                // Template doesn't exist, skip it
                console.warn(`Template ${template} not found`);
            }
        }

        return availableTemplates;
    } catch (error) {
        console.error('Error loading available templates:', error);
        return [];
    }
};

const enhanceRecordsWithAvailability = (
    records: TTHCRecord[],
    availableTemplates: string[]
): EnhancedTTHCRecord[] => {
    return records.map(record => {
        // Use the new tenFile column directly instead of extracting from mauDon
        const templateName = record.tenFile || extractTemplateName(record.mauDon);
        const isTemplateAvailable = availableTemplates.includes(templateName);

        return {
            ...record,
            isTemplateAvailable
        };
    });
};

const filterRecords = (
    records: EnhancedTTHCRecord[],
    filters: FilterState
): EnhancedTTHCRecord[] => {
    return records.filter(record => {
        // Filter by linhVuc
        if (filters.linhVuc && !record.linhVuc.includes(filters.linhVuc)) {
            return false;
        }

        // Filter by thuTuc (tenTTHC)
        if (filters.thuTuc && !record.tenTTHC.includes(filters.thuTuc)) {
            return false;
        }

        // Filter by availability
        if (filters.availability === 'available' && !record.isTemplateAvailable) {
            return false;
        }
        if (filters.availability === 'unavailable' && record.isTemplateAvailable) {
            return false;
        }

        return true;
    });
};

//

// --- COMPONENT CHÍNH ---
function WordFillerComponent() {
    const [state, setState] = useState<DocumentState>({
        selectedTemplatePath: '',
        isLoading: false,
        error: null,
        socketStatus: 'disconnected',
        generatedBlob: null,
        processingStep: 'idle',
        progress: 0,
        dataSource: 'scanner' // Mặc định là scanner
    });

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    // CSV data and filtering states
    const [csvRecords, setCsvRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        thuTucByLinhVuc: {}
    });
    const [filters, setFilters] = useState<FilterState>({
        linhVuc: '',
        thuTuc: '',
        availability: 'all'
    });
    const [filteredRecords, setFilteredRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [csvLoading, setCsvLoading] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);

    const [scannedData, setScannedData] = useState<string>('');
    const [detectedFormat, setDetectedFormat] = useState<DataFormat | null>(null);
    const [processedData, setProcessedData] = useState<ScannedInfo | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const templatePathRef = useRef<string>('');

    // Custom hooks
    const { socketStatus, reconnectAttempts, on, off } = useSocketConnection(API_URL);
    const { processingStep, progress, processDocument, resetProcessing } = useDocumentProcessor();

    // Memoized values
    const isProcessing = useMemo(
        () => processingStep !== 'idle' && processingStep !== 'complete',
        [processingStep]
    );

    // Extract template name from path for display
    const selectedTemplateName = useMemo(() => {
        if (!state.selectedTemplatePath) return '';
        const parts = state.selectedTemplatePath.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(docx?|DOCX?)$/, ''); // Remove extension
    }, [state.selectedTemplatePath]);

    // Get thủ tục options based on selected lĩnh vực
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc];
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setScannedData(value);

        // Phát hiện định dạng dữ liệu real-time
        if (value.trim()) {
            try {
                const format = detectDataFormat(value);
                setDetectedFormat(format);

                // Thử xử lý dữ liệu để hiển thị preview
                try {
                    const processed = processDataIntelligently(value);
                    setProcessedData(processed);
                } catch {
                    setProcessedData(null);
                }
            } catch {
                setDetectedFormat(null);
                setProcessedData(null);
            }
        } else {
            setDetectedFormat(null);
            setProcessedData(null);
        }
    };

    // Xử lý sự kiện nhấn phím (để bắt Enter)
    const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Ngăn hành vi mặc định của Enter

            if (scannedData.trim()) {
                await processScannedData(scannedData.trim());
                setScannedData(''); // Xóa ô input để chuẩn bị cho lần quét tiếp theo
                inputRef.current?.focus(); // Tự động focus lại
            }
        }
    };

    // Hàm xử lý dữ liệu thông minh từ nhiều nguồn
    const processScannedData = async (qrData: string) => {
        // Kiểm tra xem đã chọn mẫu đơn chưa
        if (!templatePathRef.current) {
            setSnackbar({
                open: true,
                message: 'Vui lòng chọn một mẫu đơn trước khi xử lý dữ liệu.',
                severity: 'warning'
            });
            return;
        }

        try {
            console.log(`Đang xử lý dữ liệu từ ${state.dataSource}: "${qrData}"`);

            // Sử dụng hệ thống xử lý thông minh
            const scannedInfo = processDataIntelligently(qrData);
            console.log('Dữ liệu đã được phân tích:', scannedInfo);

            // Chuyển đổi sang định dạng phù hợp với template
            const processingData = convertScannedInfoToProcessingData(scannedInfo);
            console.log('Dữ liệu đã được chuyển đổi cho template:', processingData);

            // Lưu thông tin debug
            setDebugInfo(
                `Định dạng: ${detectedFormat?.name || 'Không xác định'} | Trường: ${Object.keys(processingData).join(', ')}`
            );

            // Reset trạng thái trước khi tạo tài liệu mới
            setState(prev => ({
                ...prev,
                error: null,
                generatedBlob: null
            }));

            // Gọi hàm xử lý và tạo file Word
            const blob = await processDocument(templatePathRef.current, processingData);

            // Cập nhật state với file đã tạo
            setState(prev => ({
                ...prev,
                generatedBlob: blob
            }));

            setSnackbar({
                open: true,
                message: `Đã điền thông tin từ ${state.dataSource === 'socket' ? 'app mobile' : 'máy quét QR'} và tạo tài liệu thành công!`,
                severity: 'success'
            });

            // Reset dữ liệu đã xử lý
            setProcessedData(null);
            setDetectedFormat(null);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Lỗi không xác định khi xử lý dữ liệu.';
            setState(prev => ({ ...prev, error: errorMessage }));
            setSnackbar({
                open: true,
                message: errorMessage,
                severity: 'error'
            });
            setDebugInfo(''); // Reset debug info khi có lỗi
        }
    };

    // Effects
    useEffect(() => {
        templatePathRef.current = state.selectedTemplatePath;
    }, [state.selectedTemplatePath]);

    useEffect(() => {
        setState(prev => ({ ...prev, socketStatus }));
    }, [socketStatus]);

    useEffect(() => {
        setState(prev => ({
            ...prev,
            processingStep,
            progress,
            isLoading: isProcessing
        }));
    }, [processingStep, progress, isProcessing]);

    // Load CSV data and templates on component mount
    useEffect(() => {
        const loadData = async () => {
            setCsvLoading(true);
            try {
                // Load CSV data and available templates in parallel
                const [csvResponse, templates] = await Promise.all([
                    fetch('/DanhSachTTHC.csv'),
                    loadAvailableTemplates()
                ]);

                if (!csvResponse.ok) {
                    throw new Error('Không thể tải dữ liệu CSV');
                }

                const csvContent = await csvResponse.text();
                const rawRecords = parseCSVData(csvContent);
                const enhancedRecords = enhanceRecordsWithAvailability(rawRecords, templates);

                setCsvRecords(enhancedRecords);
                setAvailableTemplates(templates);
                setFilterOptions(createFilterOptions(rawRecords));
                setFilteredRecords(enhancedRecords);

                const availableCount = enhancedRecords.filter(r => r.isTemplateAvailable).length;
                const totalCount = enhancedRecords.length;

                setSnackbar({
                    open: true,
                    message: `Đã tải ${totalCount} thủ tục hành chính, ${availableCount} có mẫu đơn sẵn sàng`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('Error loading data:', error);
                setSnackbar({
                    open: true,
                    message: 'Không thể tải dữ liệu mẫu đơn',
                    severity: 'error'
                });
            } finally {
                setCsvLoading(false);
            }
        };

        loadData();
    }, []);

    // Filter records when filters change
    useEffect(() => {
        const filtered = filterRecords(csvRecords, filters);
        setFilteredRecords(filtered);
    }, [csvRecords, filters]);

    useEffect(() => {
        if (state.generatedBlob && previewContainerRef.current) {
            previewContainerRef.current.innerHTML = '';
            renderAsync(state.generatedBlob, previewContainerRef.current, undefined, {
                className: 'docx-preview-container'
            });
        }
    }, [state.generatedBlob]);

    // Socket event handlers
    useEffect(() => {
        const handleDataReceived = async (data: ProcessingData) => {
            const currentTemplatePath = templatePathRef.current;

            if (!currentTemplatePath) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn một mẫu đơn trước khi nhận dữ liệu.',
                    severity: 'warning'
                });
                return;
            }

            if (data) {
                try {
                    setState(prev => ({
                        ...prev,
                        error: null,
                        generatedBlob: null
                    }));

                    const blob = await processDocument(currentTemplatePath, data);

                    setState(prev => ({
                        ...prev,
                        generatedBlob: blob
                    }));

                    setSnackbar({
                        open: true,
                        message: 'Tài liệu đã được tạo thành công!',
                        severity: 'success'
                    });
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Lỗi không xác định.';
                    setState(prev => ({ ...prev, error: errorMessage }));

                    setSnackbar({
                        open: true,
                        message: errorMessage,
                        severity: 'error'
                    });
                }
            }
        };

        on('data_received', handleDataReceived);

        return () => {
            off('data_received', handleDataReceived);
        };
    }, [on, off, processDocument]);

    // Event handlers

    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [filterType]: value
            };

            // Reset thủ tục khi lĩnh vực thay đổi
            if (filterType === 'linhVuc') {
                newFilters.thuTuc = '';
            }

            return newFilters;
        });
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({
            linhVuc: '',
            thuTuc: '',
            availability: 'all'
        });
    }, []);

    const handleTemplateFromCSV = useCallback(
        (record: EnhancedTTHCRecord) => {
            if (!record.isTemplateAvailable) {
                setSnackbar({
                    open: true,
                    message: `Mẫu đơn "${record.tenFile || extractTemplateName(record.mauDon)}" chưa có sẵn trong hệ thống`,
                    severity: 'warning'
                });
                return;
            }

            const templateName = record.tenFile || extractTemplateName(record.mauDon);
            const templatePath = `/templates/${templateName}`;

            setState(prev => ({
                ...prev,
                selectedTemplatePath: templatePath,
                generatedBlob: null,
                error: null
            }));
            resetProcessing();
            setShowFilters(false);

            setSnackbar({
                open: true,
                message: `Đã chọn mẫu: ${record.tenTTHC}`,
                severity: 'info'
            });
        },
        [resetProcessing]
    );

    const handleDownload = useCallback(() => {
        if (state.generatedBlob) {
            const baseName = selectedTemplateName || 'file';
            const newName = `${baseName.replace(/\s/g, '_')}_da_dien.docx`;
            saveAs(state.generatedBlob, newName);

            setSnackbar({
                open: true,
                message: 'File đã được tải xuống thành công!',
                severity: 'success'
            });
        }
    }, [state.generatedBlob, selectedTemplateName]);

    const handlePrint = useCallback(() => {
        if (!previewContainerRef.current) return;

        const printContent = previewContainerRef.current.innerHTML;
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>In tài liệu</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        @media print {
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    }, []);

    const handleReset = useCallback(() => {
        setState(prev => ({
            ...prev,
            selectedTemplatePath: '',
            generatedBlob: null,
            error: null,
            isLoading: false
        }));
        resetProcessing();

        setSnackbar({
            open: true,
            message: 'Đã reset về trạng thái ban đầu.',
            severity: 'info'
        });
    }, [resetProcessing]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    const handleErrorClose = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Render helpers
    const renderStatusChip = () => {
        const getStatusColor = () => {
            switch (socketStatus) {
                case 'connected':
                    return 'success';
                case 'connecting':
                    return 'warning';
                case 'error':
                    return 'error';
                default:
                    return 'default';
            }
        };

        const getStatusIcon = () => {
            switch (socketStatus) {
                case 'connected':
                    return <WifiIcon />;
                case 'connecting':
                    return <CircularProgress size={16} />;
                case 'error':
                    return <ErrorIcon />;
                default:
                    return <WifiOffIcon />;
            }
        };

        const getStatusText = () => {
            switch (socketStatus) {
                case 'connected':
                    return 'Đã kết nối';
                case 'connecting':
                    return 'Đang kết nối...';
                case 'error':
                    return `Lỗi kết nối (${reconnectAttempts}/${SOCKET_RECONNECT_ATTEMPTS})`;
                default:
                    return 'Đang chờ dữ liệu';
            }
        };

        return (
            <Chip
                icon={getStatusIcon()}
                label={getStatusText()}
                color={getStatusColor()}
                variant={socketStatus === 'error' ? 'outlined' : 'filled'}
            />
        );
    };

    const renderFilterControls = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                    }}
                >
                    <Typography variant="h6">Tìm mẫu đơn theo thủ tục hành chính</Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleClearFilters}
                            sx={{ mr: 1 }}
                        >
                            Xóa bộ lọc
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                        </Button>
                    </Box>
                </Box>

                {showFilters && (
                    <Box
                        sx={{
                            mb: 2,
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            gap: 2
                        }}
                    >
                        <FormControl fullWidth size="small">
                            <InputLabel>Lĩnh vực</InputLabel>
                            <Select
                                value={filters.linhVuc}
                                label="Lĩnh vực"
                                onChange={e => handleFilterChange('linhVuc', e.target.value)}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {filterOptions.linhVuc.map(item => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Thủ tục</InputLabel>
                            <Select
                                value={filters.thuTuc}
                                label="Thủ tục"
                                onChange={e => handleFilterChange('thuTuc', e.target.value)}
                                disabled={!filters.linhVuc}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {availableThuTuc.map(item => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Trạng thái mẫu</InputLabel>
                            <Select
                                value={filters.availability}
                                label="Trạng thái mẫu"
                                onChange={e => handleFilterChange('availability', e.target.value)}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                <MenuItem value="available">Có sẵn mẫu</MenuItem>
                                <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {csvLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        <Box
                            sx={{
                                mb: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Tìm thấy {filteredRecords.length} thủ tục hành chính
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                    icon={<CheckCircleIcon />}
                                    label={`${filteredRecords.filter(r => r.isTemplateAvailable).length} có mẫu`}
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip
                                    icon={<WarningIcon />}
                                    label={`${filteredRecords.filter(r => !r.isTemplateAvailable).length} chưa có`}
                                    color="warning"
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        </Box>
                        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                            {filteredRecords.map((record, index) => (
                                <Paper
                                    key={index}
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        mb: 1,
                                        cursor: record.isTemplateAvailable
                                            ? 'pointer'
                                            : 'not-allowed',
                                        opacity: record.isTemplateAvailable ? 1 : 0.7,
                                        bgcolor: record.isTemplateAvailable
                                            ? 'background.paper'
                                            : 'grey.50',
                                        '&:hover': {
                                            bgcolor: record.isTemplateAvailable
                                                ? 'action.hover'
                                                : 'grey.100'
                                        },
                                        border: record.isTemplateAvailable
                                            ? '1px solid'
                                            : '1px dashed',
                                        borderColor: record.isTemplateAvailable
                                            ? 'divider'
                                            : 'warning.main'
                                    }}
                                    onClick={() => handleTemplateFromCSV(record)}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        {record.isTemplateAvailable ? (
                                            <CheckCircleIcon
                                                color="success"
                                                sx={{ fontSize: 20, mt: 0.2 }}
                                            />
                                        ) : (
                                            <WarningIcon
                                                color="warning"
                                                sx={{ fontSize: 20, mt: 0.2 }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" fontWeight={500}>
                                                {record.tenTTHC}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block' }}
                                            >
                                                Mã: {record.maTTHC} | Lĩnh vực: {record.linhVuc}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    mt: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1
                                                }}
                                            >
                                                <Typography variant="caption" color="primary">
                                                    File:{' '}
                                                    {record.tenFile ||
                                                        extractTemplateName(record.mauDon)}
                                                </Typography>
                                                <Chip
                                                    label={
                                                        record.isTemplateAvailable
                                                            ? 'Có sẵn'
                                                            : 'Chưa có mẫu'
                                                    }
                                                    color={
                                                        record.isTemplateAvailable
                                                            ? 'success'
                                                            : 'warning'
                                                    }
                                                    size="small"
                                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Paper>
                            ))}
                            {filteredRecords.length === 0 && (
                                <Paper sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography color="text.secondary">
                                        Không tìm thấy thủ tục hành chính phù hợp với bộ lọc
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    const renderProcessingStatus = () => (
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
                Đang sử dụng mẫu:
            </Typography>
            <Chip
                label={selectedTemplateName || ''}
                color="info"
                sx={{ p: 2, fontSize: '1rem', maxWidth: '100%' }}
            />

            {isProcessing && (
                <Box sx={{ mt: 3 }}>
                    <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        {processingStep === 'loading_template' && 'Đang tải mẫu...'}
                        {processingStep === 'processing_data' && 'Đang xử lý dữ liệu...'}
                        {processingStep === 'generating_document' && 'Đang tạo tài liệu...'}
                    </Typography>
                </Box>
            )}

            {!isProcessing && !state.generatedBlob && (
                <Box sx={{ mt: 3 }}>
                    <HourglassTopIcon color="action" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        Sẵn sàng nhận dữ liệu...
                    </Typography>
                </Box>
            )}
        </Box>
    );

    const renderDataSourceSelector = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Nguồn dữ liệu
                </Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2
                    }}
                >
                    {DATA_SOURCES.map(source => (
                        <Box key={source.type}>
                            <Card
                                variant="outlined"
                                sx={{
                                    cursor: 'pointer',
                                    borderColor:
                                        state.dataSource === source.type
                                            ? 'primary.main'
                                            : 'divider',
                                    backgroundColor:
                                        state.dataSource === source.type
                                            ? 'primary.50'
                                            : 'background.paper',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        backgroundColor: 'primary.50'
                                    }
                                }}
                                onClick={() =>
                                    setState(prev => ({ ...prev, dataSource: source.type }))
                                }
                            >
                                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                    <Box sx={{ mb: 1, color: 'primary.main' }}>{source.icon}</Box>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {source.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {source.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );

    const renderDataInputSection = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Nhập dữ liệu
                </Typography>

                {state.dataSource === 'scanner' && (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Nhập dữ liệu từ máy quét QR hoặc nhập thủ công theo các định dạng hỗ
                            trợ:
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            {DATA_FORMATS.map(format => (
                                <Chip
                                    key={format.type}
                                    label={format.name}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                    color={
                                        detectedFormat?.type === format.type ? 'primary' : 'default'
                                    }
                                />
                            ))}
                        </Box>

                        <FormControl fullWidth>
                            <InputLabel>Dữ liệu quét</InputLabel>
                            <Input
                                ref={inputRef}
                                value={scannedData}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập dữ liệu từ máy quét QR..."
                                autoFocus
                            />
                        </FormControl>

                        {detectedFormat && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="info.main" fontWeight="bold">
                                    Phát hiện định dạng: {detectedFormat.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {detectedFormat.description}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="success.main">
                                        ✅ Dữ liệu hợp lệ - Nhấn Enter để xử lý
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {scannedData.trim() && !detectedFormat && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="warning.main" fontWeight="bold">
                                    ⚠️ Không nhận diện được định dạng
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Vui lòng kiểm tra lại định dạng dữ liệu. Hỗ trợ: CCCD|CMND|...,
                                    JSON, hoặc định dạng có nhãn
                                </Typography>
                            </Box>
                        )}

                        {processedData && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="success.main"
                                    fontWeight="bold"
                                    sx={{ mb: 1 }}
                                >
                                    📋 Dữ liệu đã được xử lý:
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mb: 2, display: 'block' }}
                                >
                                    Định dạng: {detectedFormat?.name} | Nhấn Enter để tạo tài liệu
                                </Typography>
                                {debugInfo && (
                                    <Typography
                                        variant="caption"
                                        color="info.main"
                                        sx={{
                                            display: 'block',
                                            fontFamily: 'monospace',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        Debug: {debugInfo}
                                    </Typography>
                                )}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 1,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            CCCD:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.cccd}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            CMND:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.cmnd}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Họ tên:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.hoTen}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Ngày sinh:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.ngaySinh}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Giới tính:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.gioiTinh}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Địa chỉ:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.diaChi}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Ngày cấp:
                                        </Typography>
                                        <Typography variant="body2">
                                            {processedData.ngayCap}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </>
                )}

                {state.dataSource === 'socket' && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <WifiIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                            Đang chờ dữ liệu từ Socket App Mobile...
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Trạng thái:{' '}
                            {socketStatus === 'connected' ? 'Đã kết nối' : 'Chưa kết nối'}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, textAlign: 'center' }}>
                Đã điền xong mẫu: <b>{selectedTemplateName}</b>
            </Typography>

            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} fullWidth>
                In tài liệu
            </Button>

            <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                fullWidth
            >
                Tải file đã điền
                {state.generatedBlob && (
                    <Typography variant="caption" sx={{ ml: 1 }}>
                        ({formatFileSize(state.generatedBlob.size)})
                    </Typography>
                )}
            </Button>
        </Box>
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
            {/* Header với status */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                {renderStatusChip()}
            </Box>

            {/* Data Source Selector */}
            {renderDataSourceSelector()}

            {/* Data Input Section */}
            {state.selectedTemplatePath && renderDataInputSection()}

            {/* Filter Controls */}
            {!state.selectedTemplatePath && renderFilterControls()}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: state.generatedBlob ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
                    gap: 3
                }}
            >
                <Paper sx={{ p: 3, height: 'fit-content' }}>
                    <Typography variant="h6" gutterBottom>
                        {state.generatedBlob
                            ? 'Hoàn tất'
                            : state.selectedTemplatePath
                              ? 'Trạng thái'
                              : 'Chọn mẫu đơn'}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    {!state.selectedTemplatePath && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                                Chọn mẫu đơn từ danh sách thủ tục hành chính
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sử dụng bộ lọc ở trên để tìm và chọn mẫu đơn phù hợp
                            </Typography>
                        </Box>
                    )}
                    {state.selectedTemplatePath && (
                        <Box>
                            {!state.generatedBlob && renderProcessingStatus()}
                            {state.generatedBlob && renderActionButtons()}

                            <Divider sx={{ my: 2 }} />
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<RestartAltIcon />}
                                onClick={handleReset}
                                fullWidth
                                disabled={isProcessing}
                            >
                                Chọn mẫu khác
                            </Button>
                        </Box>
                    )}
                </Paper>

                {/* Preview column */}
                {state.generatedBlob && (
                    <Paper sx={{ p: 3, height: 'fit-content' }}>
                        <Typography variant="h6" gutterBottom>
                            Xem trước tài liệu
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                bgcolor: 'grey.50',
                                minHeight: '70vh',
                                overflowY: 'auto',
                                border: '1px solid #e0e0e0'
                            }}
                        >
                            <div ref={previewContainerRef} className="docx-preview-container" />
                        </Paper>
                    </Paper>
                )}
            </Box>

            {/* Error Alert */}
            {state.error && (
                <Alert
                    severity="error"
                    sx={{ mt: 3 }}
                    onClose={handleErrorClose}
                    action={
                        <IconButton color="inherit" size="small" onClick={handleErrorClose}>
                            <ErrorIcon />
                        </IconButton>
                    }
                >
                    {state.error}
                </Alert>
            )}

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export const Route = createLazyFileRoute('/word-mapper/')({
    component: WordFillerComponent
});
