import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import { Socket, io } from 'socket.io-client';

// --- ICON ---
import {
    Badge as BadgeIcon,
    CalendarToday as CalendarTodayIcon,
    CheckCircle as CheckCircleIcon,
    ContentCopy as ContentCopyIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Error as ErrorIcon,
    EventAvailable as EventAvailableIcon,
    Event as EventIcon,
    ExpandMore as ExpandMoreIcon,
    GetApp as GetAppIcon,
    Home as HomeIcon,
    HourglassTop as HourglassTopIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Upload as UploadIcon,
    Warning as WarningIcon,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import SaveIcon from '@mui/icons-material/Save';
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
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Tooltip as MuiTooltip
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

// --- CẤU HÌNH ---
const API_URL = 'http://103.162.21.146:5003';
const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY = 3000;

// --- TYPE DEFINITIONS ---
interface DocumentState {
    selectedTemplatePath: string;
    selectedHtmlUrl?: string | null;
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
    uploadedTemplateUrl?: string | null;
    uploadedTemplateName?: string | null;
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
    const result: ProcessingData = {
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

    // Chuẩn hóa số giấy tờ theo tên khóa yêu cầu
    result.so_cccd = result.so_cccd || scannedInfo.cccd || '';
    result.so_cmnd = result.so_cmnd || scannedInfo.cmnd || '';
    result.ho_ten = result.ho_ten || scannedInfo.hoTen || '';
    result.gioi_tinh = result.gioi_tinh || scannedInfo.gioiTinh || '';
    result.noi_cu_tru = result.noi_cu_tru || scannedInfo.diaChi || '';
    result.ngay_sinh = result.ngay_sinh || scannedInfo.ngaySinh || '';
    result.ngay_cap = result.ngay_cap || scannedInfo.ngayCap || '';

    // Tách ngày/tháng/năm cho ngày sinh và ngày cấp (ns_* và nc_*)
    const splitDate = (value?: string): [string, string, string] => {
        if (!value) return ['', '', ''];
        const parts = String(value)
            .split(/[\/-]/)
            .map(s => s.trim());
        if (parts.length === 3) {
            // Allow both dd/mm/yyyy or yyyy-mm-dd; pick likely day-first by checking length
            if (parts[0].length <= 2 && parts[1].length <= 2) {
                return [parts[0], parts[1], parts[2]] as [string, string, string];
            }
            return [parts[2], parts[1], parts[0]] as [string, string, string];
        }
        return ['', '', ''];
    };

    const [ns_d, ns_m, ns_y] = splitDate(result.ngay_sinh);
    result.ns_ngay = ns_d;
    result.ns_thang = ns_m;
    result.ns_nam = ns_y;

    const [nc_d, nc_m, nc_y] = splitDate(result.ngay_cap);
    result.nc_ngay = nc_d;
    result.nc_thang = nc_m;
    result.nc_nam = nc_y;

    return result;
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

// Fill HTML placeholders {field}
const fillHtmlWithData = (html: string, data: Record<string, any>): string => {
    if (!html) return '';
    return html.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
        const val = (data as any)[key];
        return val === undefined || val === null ? '' : String(val);
    });
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

// Parse JSON data (converted from CSV)
const parseJSONData = (jsonArray: any[]): TTHCRecord[] => {
    if (!Array.isArray(jsonArray)) return [];

    const records: TTHCRecord[] = jsonArray
        .map(item => {
            const record: TTHCRecord = {
                stt: item['STT'] !== undefined && item['STT'] !== null ? String(item['STT']) : '',
                maTTHC: item['Mã TTHC'] ?? '',
                tenTTHC: item['Tên TTHC'] ?? '',
                qdCongBo: item['QĐ Công bố'] ?? '',
                doiTuong: item['Đối tượng'] ?? '',
                linhVuc: item['Lĩnh vực'] ?? '',
                coQuanCongKhai: item['Cơ quan công khai'] ?? '',
                capThucHien: item['Cấp thực hiện'] ?? '',
                tinhTrang: item['Tình trạng'] ?? '',
                tenGiayTo: item['Tên giấy tờ'] ?? '',
                mauDon: item['Mẫu đơn, tờ khai'] ?? '',
                tenFile: item['Tên File'] ?? ''
            } as TTHCRecord;

            // Normalize all fields to string
            (Object.keys(record) as Array<keyof TTHCRecord>).forEach(key => {
                (record as any)[key] = record[key] ? String(record[key]) : '';
            });

            return record;
        })
        // Keep only rows that have a doc template reference
        .filter(
            r =>
                (r.tenFile && r.tenFile.toLowerCase().includes('.doc')) ||
                (r.mauDon && r.mauDon.toLowerCase().includes('.doc'))
        );

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

// Helpers to work with templates_by_code structure
const sanitizeCodeForPath = (code: string): string => (code || '').replace(/[\\/]/g, '_').trim();

const buildDocxUrlForRecord = (record: TTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const encodedCode = encodeURIComponent(code);
    const encodedName = encodeURIComponent(templateName);
    return `/templates_by_code/${encodedCode}/docx/${encodedName}`;
};

const buildHtmlUrlForRecord = (record: TTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const base = templateName.replace(/\.(docx?|DOCX?)$/, '');
    const encodedCode = encodeURIComponent(code);
    const encodedHtml = encodeURIComponent(`${base}.html`);
    return `/templates_by_code/${encodedCode}/html/${encodedHtml}`;
};

const checkTemplateExists = async (record: TTHCRecord): Promise<boolean> => {
    try {
        const url = buildDocxUrlForRecord(record);
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
};

const enhanceRecordsWithAvailability = async (
    records: TTHCRecord[]
): Promise<EnhancedTTHCRecord[]> => {
    const checks = await Promise.all(records.map(r => checkTemplateExists(r)));
    return records.map((record, idx) => ({ ...record, isTemplateAvailable: checks[idx] }));
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
        selectedHtmlUrl: null,
        isLoading: false,
        error: null,
        socketStatus: 'disconnected',
        generatedBlob: null,
        processingStep: 'idle',
        progress: 0,
        dataSource: 'scanner', // Mặc định là scanner
        uploadedTemplateUrl: null,
        uploadedTemplateName: null
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
    const htmlIframeRef = useRef<HTMLIFrameElement>(null);
    const [htmlRaw, setHtmlRaw] = useState<string>('');
    const [previewMode, setPreviewMode] = useState<'docx' | 'html'>('docx');
    const templatePathRef = useRef<string>('');
    const [showFieldGuide, setShowFieldGuide] = useState(false);
    // Removed: HTML editor dialog state
    const [isPreviewEditMode, setIsPreviewEditMode] = useState(false);
    const isPreviewEditModeRef = useRef(false);
    // Insert dialog state for HTML click-to-insert
    const [insertDialogOpen, setInsertDialogOpen] = useState(false);
    const [insertMode, setInsertMode] = useState<'field' | 'text'>('field');
    const [insertText, setInsertText] = useState('');
    const [insertFieldKey, setInsertFieldKey] = useState<string>('');
    const htmlClickRangeRef = useRef<Range | null>(null);
    const htmlClickTargetRef = useRef<Element | null>(null);

    // Custom hooks
    const { socketStatus, reconnectAttempts, on, off } = useSocketConnection(API_URL);
    const { processingStep, progress, processDocument, resetProcessing } = useDocumentProcessor();

    // Memoized values
    const isProcessing = useMemo(
        () => processingStep !== 'idle' && processingStep !== 'complete',
        [processingStep]
    );

    // Extract template name from path for display
    const selectedTemplateNameFromPath = useMemo(() => {
        if (!state.selectedTemplatePath) return '';
        const parts = state.selectedTemplatePath.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace(/\.(docx?|DOCX?)$/, '');
    }, [state.selectedTemplatePath]);

    const displayTemplateName = useMemo(() => {
        if (state.uploadedTemplateName) {
            return state.uploadedTemplateName.replace(/\.(docx?|DOCX?)$/, '');
        }
        return selectedTemplateNameFromPath;
    }, [state.uploadedTemplateName, selectedTemplateNameFromPath]);

    // Available field keys for insertion (union of common sets used in guide)
    const availableFieldKeys = useMemo(
        () => [
            'so_cccd',
            'so_cmnd',
            'ho_ten',
            'ngay_sinh',
            'ns_ngay',
            'ns_thang',
            'ns_nam',
            'gioi_tinh',
            'noi_cu_tru',
            'ngay_cap',
            'nc_ngay',
            'nc_thang',
            'nc_nam'
        ],
        []
    );

    const fieldKeyDescriptions: Record<string, string> = useMemo(
        () => ({
            so_cccd: 'Số căn cước công dân',
            so_cmnd: 'Số chứng minh nhân dân',
            ho_ten: 'Họ và tên',
            ngay_sinh: 'Ngày sinh (dd/mm/yyyy)',
            ns_ngay: 'Ngày sinh - Ngày',
            ns_thang: 'Ngày sinh - Tháng',
            ns_nam: 'Ngày sinh - Năm',
            gioi_tinh: 'Giới tính',
            noi_cu_tru: 'Nơi cư trú',
            ngay_cap: 'Ngày cấp (dd/mm/yyyy)',
            nc_ngay: 'Ngày cấp - Ngày',
            nc_thang: 'Ngày cấp - Tháng',
            nc_nam: 'Ngày cấp - Năm'
        }),
        []
    );

    const fieldKeyIcons: Record<string, React.ReactNode> = useMemo(
        () => ({
            so_cccd: <BadgeIcon fontSize="small" />,
            so_cmnd: <BadgeIcon fontSize="small" />,
            ho_ten: <PersonIcon fontSize="small" />,
            ngay_sinh: <EventIcon fontSize="small" />,
            ns_ngay: <CalendarTodayIcon fontSize="small" />,
            ns_thang: <CalendarTodayIcon fontSize="small" />,
            ns_nam: <CalendarTodayIcon fontSize="small" />,
            gioi_tinh: <WcIcon fontSize="small" />,
            noi_cu_tru: <HomeIcon fontSize="small" />,
            ngay_cap: <EventAvailableIcon fontSize="small" />,
            nc_ngay: <CalendarTodayIcon fontSize="small" />,
            nc_thang: <CalendarTodayIcon fontSize="small" />,
            nc_nam: <CalendarTodayIcon fontSize="small" />
        }),
        []
    );

    const handelTest = () => {
        console.log('');
    };

    useEffect(() => {
        if (!insertFieldKey && availableFieldKeys.length > 0) {
            setInsertFieldKey(availableFieldKeys[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableFieldKeys.length]);

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
                setScannedData('');
                inputRef.current?.focus();
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

            // Nếu đang ở chế độ HTML, chỉ điền dữ liệu vào các field hiện có, không reload iframe để tránh mất DOM/id
            if (previewMode === 'html' && htmlIframeRef.current?.contentDocument) {
                try {
                    ensureHtmlInputKeys();
                    const ok = fillHtmlFormFieldsFromData(processingData);
                    setSnackbar({
                        open: true,
                        message: ok
                            ? 'Đã chèn dữ liệu vào biểu mẫu'
                            : 'Không tìm thấy trường để chèn',
                        severity: ok ? 'success' : 'info'
                    });
                } catch (e) {
                    setSnackbar({
                        open: true,
                        message: 'Không thể chèn dữ liệu vào biểu mẫu',
                        severity: 'error'
                    });
                }
            } else {
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
            }

            // Không reset processedData để có thể điền lại HTML nếu cần
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

    // Read preferred data source from localStorage (set in Info screen)
    useEffect(() => {
        try {
            const saved = localStorage.getItem('word_mapper_data_source');
            if (saved === 'scanner' || saved === 'socket') {
                setState(prev => ({ ...prev, dataSource: saved }));
            }
        } catch {}
    }, []);

    // Load JSON data and templates on component mount
    useEffect(() => {
        const loadData = async () => {
            setCsvLoading(true);
            try {
                // Load JSON data
                const jsonResponse = await fetch('/DanhSachTTHC.json');

                if (!jsonResponse.ok) {
                    throw new Error('Không thể tải dữ liệu JSON');
                }

                const jsonContent = await jsonResponse.json();
                const rawRecords = parseJSONData(jsonContent);
                const enhancedRecords = await enhanceRecordsWithAvailability(rawRecords);

                setCsvRecords(enhancedRecords);
                setAvailableTemplates([]);
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

    // Render selected template preview when a template is chosen (before generating document)
    useEffect(() => {
        const renderSelectedTemplate = async () => {
            if (!state.selectedTemplatePath || state.generatedBlob) return;
            if (!previewContainerRef.current) return;

            try {
                if (previewMode === 'docx') {
                    previewContainerRef.current.innerHTML = '';
                    const response = await fetch(state.selectedTemplatePath);
                    if (!response.ok) {
                        throw new Error('Không thể tải file mẫu để xem trước');
                    }
                    const templateBlob = await response.blob();
                    await renderAsync(templateBlob, previewContainerRef.current, undefined, {
                        className: 'docx-preview-container'
                    });
                }
            } catch (err) {
                console.error('Lỗi khi render preview mẫu:', err);
            }
        };

        renderSelectedTemplate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.selectedTemplatePath, state.generatedBlob, previewMode]);

    // Load HTML preview when selectedHtmlUrl changes
    useEffect(() => {
        const loadHtml = async () => {
            const url = state.selectedHtmlUrl;
            if (!url) return;
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error('Không thể tải file HTML');
                const text = await res.text();
                try {
                    console.debug('[HTML] Loaded from URL:', url, 'length:', text.length);
                } catch {}
                setHtmlRaw(text);
                setPreviewMode('html');
            } catch (e) {
                console.warn('Không thể tải HTML preview, fallback DOCX');
                setHtmlRaw('');
                setPreviewMode('docx');
            }
        };
        loadHtml();
    }, [state.selectedHtmlUrl]);

    // Attach drag-drop and click handlers to HTML iframe to allow inserting {field} or text
    const attachHtmlPreviewDndHandlers = useCallback(() => {
        const iframe = htmlIframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;
        try {
            if (doc.body)
                doc.body.setAttribute(
                    'contenteditable',
                    isPreviewEditModeRef.current ? 'true' : 'false'
                );
        } catch {}
        // Capture original IDs so we can restore if the editor/DOM mutations drop them
        try {
            const elements = Array.from(doc.querySelectorAll('input, textarea, select')) as Array<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >;
            elements.forEach(el => {
                const id = el.getAttribute('id');
                if (id && id.trim() && !el.getAttribute('data-original-id')) {
                    el.setAttribute('data-original-id', id.trim());
                }
            });
        } catch {}
        const handleDragOver = (ev: DragEvent) => {
            ev.preventDefault();
        };
        const handleDrop = (ev: DragEvent) => {
            ev.preventDefault();
            const text = ev.dataTransfer?.getData('text/plain');
            if (!text) return;
            const x = ev.clientX;
            const y = ev.clientY;
            let range: Range | null = null;
            const anyDoc = doc as any;
            try {
                if (typeof anyDoc.caretRangeFromPoint === 'function') {
                    range = anyDoc.caretRangeFromPoint(x, y);
                } else if (typeof (doc as any).caretPositionFromPoint === 'function') {
                    const pos = (doc as any).caretPositionFromPoint(x, y);
                    if (pos) {
                        range = doc.createRange();
                        range.setStart(pos.offsetNode, pos.offset);
                        range.collapse(true);
                    }
                }
            } catch {}
            // Determine element at point to decide if we should set input value instead
            const targetEl = (doc.elementFromPoint(x, y) as Element) || doc.body;
            const inputLike = targetEl.closest?.('input, textarea, select') as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;
            if (inputLike) {
                const tag = inputLike.tagName.toLowerCase();
                const type = (inputLike as HTMLInputElement).type?.toLowerCase?.();
                // Avoid setting for checkbox/radio groups on drop
                if (
                    tag === 'textarea' ||
                    tag === 'select' ||
                    (tag === 'input' && type !== 'checkbox' && type !== 'radio')
                ) {
                    // Set both property and attribute to persist across srcDoc reload
                    (inputLike as any).value = text;
                    try {
                        inputLike.setAttribute('value', text);
                    } catch {}
                    try {
                        setHtmlRaw(doc.documentElement.outerHTML);
                    } catch {}
                    return;
                }
            }
            if (!range) {
                const el = doc.elementFromPoint(x, y) || doc.body;
                if (el) {
                    range = doc.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                }
            }
            if (!range) return;
            const node = doc.createTextNode(text);
            range.insertNode(node);
            try {
                range.setStartAfter(node);
                range.collapse(true);
                const sel = iframe.contentWindow?.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            } catch {}
            try {
                setHtmlRaw(doc.documentElement.outerHTML);
            } catch {}
        };
        const handleClick = (ev: MouseEvent) => {
            if (isPreviewEditModeRef.current) {
                return;
            }
            // Determine insertion point and open insert dialog
            const x = (ev as MouseEvent).clientX;
            const y = (ev as MouseEvent).clientY;
            let range: Range | null = null;
            const anyDoc = doc as any;
            try {
                if (typeof anyDoc.caretRangeFromPoint === 'function') {
                    range = anyDoc.caretRangeFromPoint(x, y);
                } else if (typeof (doc as any).caretPositionFromPoint === 'function') {
                    const pos = (doc as any).caretPositionFromPoint(x, y);
                    if (pos) {
                        range = doc.createRange();
                        range.setStart(pos.offsetNode, pos.offset);
                        range.collapse(true);
                    }
                }
            } catch {}
            // Track the clicked element for smarter insertion into inputs
            const clickedEl = (doc.elementFromPoint(x, y) as Element) || doc.body;
            htmlClickTargetRef.current = clickedEl;
            if (!range) {
                if (clickedEl) {
                    range = doc.createRange();
                    range.selectNodeContents(clickedEl);
                    range.collapse(false);
                }
            }
            if (range) {
                htmlClickRangeRef.current = range;
                setInsertDialogOpen(true);
                ev.preventDefault();
                ev.stopPropagation();
            }
        };
        doc.addEventListener('dragover', handleDragOver);
        doc.addEventListener('drop', handleDrop);
        doc.addEventListener('click', handleClick, true);
        return () => {
            doc.removeEventListener('dragover', handleDragOver);
            doc.removeEventListener('drop', handleDrop);
            doc.removeEventListener('click', handleClick, true);
        };
    }, []);

    useEffect(() => {
        isPreviewEditModeRef.current = isPreviewEditMode;
        const iframe = htmlIframeRef.current;
        const doc = iframe?.contentDocument;
        try {
            if (doc?.body)
                doc.body.setAttribute('contenteditable', isPreviewEditMode ? 'true' : 'false');
        } catch {}
    }, [isPreviewEditMode]);

    const insertTextAtHtmlRange = useCallback((textToInsert: string) => {
        const iframe = htmlIframeRef.current;
        const doc = iframe?.contentDocument;
        if (!iframe || !doc) return false;
        let range = htmlClickRangeRef.current;
        try {
            if (!range) {
                const sel = iframe.contentWindow?.getSelection();
                if (sel && sel.rangeCount > 0) {
                    range = sel.getRangeAt(0);
                }
            }
        } catch {}
        // If the click target was an input/textarea/select, set its value directly
        const targetEl = htmlClickTargetRef.current as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | Element
            | null;
        if (targetEl && (targetEl as Element).closest) {
            const inputLike = (targetEl as Element).closest('input, textarea, select') as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;
            if (inputLike) {
                const tag = inputLike.tagName.toLowerCase();
                const type = (inputLike as HTMLInputElement).type?.toLowerCase?.();
                if (
                    tag === 'textarea' ||
                    tag === 'select' ||
                    (tag === 'input' && type !== 'checkbox' && type !== 'radio')
                ) {
                    (inputLike as any).value = textToInsert;
                    try {
                        inputLike.setAttribute('value', textToInsert);
                    } catch {}
                    try {
                        setHtmlRaw(doc.documentElement.outerHTML);
                    } catch {}
                    return true;
                }
            }
        }
        if (!range) return false;
        const node = doc.createTextNode(textToInsert);
        try {
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            const sel = iframe.contentWindow?.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        } catch {
            return false;
        }
        // Persist updated HTML
        try {
            setHtmlRaw(doc.documentElement.outerHTML);
        } catch {}
        return true;
    }, []);

    const handleConfirmInsert = useCallback(() => {
        const content =
            insertMode === 'field' ? (insertFieldKey ? `{${insertFieldKey}}` : '') : insertText;
        if (!content) {
            setInsertDialogOpen(false);
            return;
        }
        // If target is an input-like element and user is inserting a field, also bind field-key on element
        try {
            const iframe = htmlIframeRef.current;
            const doc = iframe?.contentDocument;
            const targetEl = htmlClickTargetRef.current as Element | null;
            if (doc && targetEl) {
                const inputLike = targetEl.closest?.('input, textarea, select') as
                    | HTMLInputElement
                    | HTMLTextAreaElement
                    | HTMLSelectElement
                    | null;
                if (inputLike) {
                    if (insertMode === 'field' && insertFieldKey) {
                        // Gắn data-field-key để mapping ổn định mà không cần đổi id
                        inputLike.setAttribute('data-field-key', `{${insertFieldKey}}`);
                        // Nếu input đang có id trống nhưng có data-original-id thì khôi phục lại id
                        const currentId = inputLike.getAttribute('id');
                        const originalId = inputLike.getAttribute('data-original-id');
                        if (!currentId && originalId) {
                            try {
                                inputLike.setAttribute('id', originalId);
                            } catch {}
                        }
                        // Nếu id trống, name trống nhưng có data-auto-id, dùng data-auto-id làm name để giữ group/radio
                        if (
                            !inputLike.getAttribute('id') &&
                            !inputLike.getAttribute('name') &&
                            inputLike.getAttribute('data-auto-id')
                        ) {
                            try {
                                inputLike.setAttribute(
                                    'name',
                                    inputLike.getAttribute('data-auto-id') || ''
                                );
                            } catch {}
                        }
                    }
                }
            }
        } catch {}
        insertTextAtHtmlRange(content);
        setInsertDialogOpen(false);
        setInsertText('');
    }, [insertMode, insertFieldKey, insertText, insertTextAtHtmlRange]);

    const handleCancelInsert = useCallback(() => {
        setInsertDialogOpen(false);
        setInsertText('');
    }, []);

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

            // Build path from templates_by_code
            const templatePath = buildDocxUrlForRecord(record);
            const htmlUrl = buildHtmlUrlForRecord(record);

            setState(prev => ({
                ...prev,
                selectedTemplatePath: templatePath,
                selectedHtmlUrl: htmlUrl,
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
            const baseName = displayTemplateName || 'file';
            const newName = `${baseName.replace(/\s/g, '_')}_da_dien.docx`;
            saveAs(state.generatedBlob, newName);

            setSnackbar({
                open: true,
                message: 'File đã được tải xuống thành công!',
                severity: 'success'
            });
        }
    }, [state.generatedBlob, displayTemplateName]);

    const handlePrintPreview = useCallback(() => {
        if (previewMode === 'docx') {
            // For DOCX, printing preview is misleading; prefer opening Word to print
            handleOpenDocxForPrint();
            return;
        }
        if (previewMode === 'html') {
            const iframe = htmlIframeRef.current;
            const doc = iframe?.contentDocument;
            if (!doc) return;
            const html = doc.documentElement.outerHTML;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    }, [previewMode]);

    const handleOpenDocxForPrint = useCallback(() => {
        // If we already generated a DOCX, download/open that; else open the selected template
        if (state.generatedBlob) {
            const baseName = displayTemplateName || 'file';
            const newName = `${baseName.replace(/\s/g, '_')}.docx`;
            saveAs(state.generatedBlob, newName);
            setSnackbar({
                open: true,
                message: 'Đang tải file Word. Vui lòng mở trong Word và in.',
                severity: 'info'
            });
            return;
        }
        if (state.selectedTemplatePath) {
            const absUrl = new URL(state.selectedTemplatePath, window.location.origin).href;
            // Try to open the template URL in new tab (browser will download or open with associated app)
            window.open(absUrl, '_blank');
            setSnackbar({
                open: true,
                message: 'Đang mở/tải mẫu Word gốc. Vui lòng in từ Word.',
                severity: 'info'
            });
        }
    }, [state.generatedBlob, state.selectedTemplatePath, displayTemplateName]);

    // Thu thập dữ liệu từ các input trong HTML (id có thể ở dạng {field} hoặc field)
    const collectDataFromHtmlInputs = useCallback((): ProcessingData => {
        const iframe = htmlIframeRef.current;
        const doc = iframe?.contentDocument;
        const data: ProcessingData = {};
        if (!doc) return data;
        // Đảm bảo id được khôi phục trước khi đọc
        try {
            ensureHtmlInputKeys();
        } catch {}

        const elements = Array.from(doc.querySelectorAll('input, textarea, select')) as Array<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >;

        elements.forEach(el => {
            const raw =
                el.getAttribute('id') ||
                el.getAttribute('name') ||
                el.getAttribute('data-field-key') ||
                '';
            if (!raw) return;
            const matched = raw.match(/\{([^}]+)\}/);
            const key = (matched ? matched[1] : raw).trim();
            if (!key) return;

            let value: any = '';
            if ((el as HTMLInputElement).type === 'checkbox') {
                value = (el as HTMLInputElement).checked
                    ? (el as HTMLInputElement).value || '1'
                    : '';
            } else if ((el as HTMLInputElement).type === 'radio') {
                const nameAttr = (el as HTMLInputElement).name || raw;
                if (nameAttr) {
                    try {
                        const selector = `input[type="radio"][name="${nameAttr.replace(/"/g, '\\"')}"]:checked`;
                        const checked = doc.querySelector(selector) as HTMLInputElement | null;
                        value = checked ? checked.value : '';
                    } catch {
                        value = '';
                    }
                }
            } else if (el.tagName.toLowerCase() === 'select') {
                const sel = el as HTMLSelectElement;
                value = sel.value ?? '';
            } else {
                value = (el as HTMLInputElement | HTMLTextAreaElement).value ?? '';
            }

            data[key] = value;
        });

        return data;
    }, []);

    // Điền dữ liệu vào các input trong HTML iframe dựa trên khóa {field}
    const fillHtmlFormFieldsFromData = useCallback((data: ProcessingData) => {
        const iframe = htmlIframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return false;
        // Khôi phục id trước khi nạp
        try {
            ensureHtmlInputKeys();
        } catch {}

        const toKey = (raw: string | null): string => {
            if (!raw) return '';
            const m = raw.match(/\{([^}]+)\}/);
            return (m ? m[1] : raw).trim();
        };

        const truthy = (val: any): boolean => {
            if (val == null) return false;
            const s = String(val).toLowerCase().trim();
            return s === '1' || s === 'true' || s === 'x' || s === 'yes' || s === 'y' || s === 'on';
        };

        const els = Array.from(doc.querySelectorAll('input, textarea, select')) as Array<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >;

        els.forEach(el => {
            const key = toKey(
                el.getAttribute('id') ||
                    el.getAttribute('name') ||
                    el.getAttribute('data-field-key')
            );
            if (!key) return;

            const value = (data as any)[key];
            if (value === undefined) return;

            const tag = el.tagName.toLowerCase();
            if (tag === 'select') {
                const sel = el as HTMLSelectElement;
                if (sel.querySelector(`option[value="${String(value)}"]`)) {
                    sel.value = String(value);
                } else {
                    // Thử match theo text hiển thị
                    const opt = Array.from(sel.options).find(
                        o => o.text.trim() === String(value).trim()
                    );
                    if (opt) sel.value = opt.value;
                }
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            const type = (el as HTMLInputElement).type?.toLowerCase();
            if (type === 'radio') {
                const nameAttr = (el as HTMLInputElement).name || key;
                if (nameAttr) {
                    const radios = Array.from(
                        doc.querySelectorAll(
                            `input[type="radio"][name="${nameAttr.replace(/"/g, '\\"')}"]`
                        )
                    ) as HTMLInputElement[];
                    radios.forEach(r => {
                        r.checked =
                            String(r.value).trim().toLowerCase() ===
                            String(value).trim().toLowerCase();
                        if (r.checked) r.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
                return;
            }

            if (type === 'checkbox') {
                const cb = el as HTMLInputElement;
                cb.checked = truthy(value);
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }

            (el as HTMLInputElement | HTMLTextAreaElement).value = String(value ?? '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        return true;
    }, []);

    // In DOCX bằng docx-preview trong cửa sổ mới
    const printDocxWithPreview = useCallback(async (blobOrUrl: Blob | string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.open();
        printWindow.document.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>In tài liệu</title><style>html,body{height:100%}body{margin:0;padding:0;background:#fff}</style></head><body><div id="docx-print-root" class="docx-preview-container"></div></body></html>'
        );
        printWindow.document.close();
        const container = printWindow.document.getElementById(
            'docx-print-root'
        ) as HTMLDivElement | null;
        if (!container) return;
        let blob: Blob;
        if (typeof blobOrUrl === 'string') {
            const res = await fetch(blobOrUrl);
            blob = await res.blob();
        } else {
            blob = blobOrUrl;
        }
        await renderAsync(blob, container, undefined, { className: 'docx-preview-container' });
        setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            } catch {}
        }, 100);
    }, []);

    // Tạo DOCX từ dữ liệu HTML inputs và in bằng docx-preview
    const handleGenerateDocxFromHtmlAndPrint = useCallback(async () => {
        try {
            const currentTemplatePath = templatePathRef.current;
            if (!currentTemplatePath) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn mẫu Word trước khi in.',
                    severity: 'warning'
                });
                return;
            }

            const data = collectDataFromHtmlInputs();
            if (!data || Object.keys(data).length === 0) {
                setSnackbar({
                    open: true,
                    message: 'Không tìm thấy dữ liệu từ biểu mẫu HTML.',
                    severity: 'warning'
                });
                return;
            }

            setState(prev => ({ ...prev, isLoading: true, error: null }));
            const blob = await processDocument(currentTemplatePath, data);
            setState(prev => ({ ...prev, generatedBlob: blob, isLoading: false }));

            await printDocxWithPreview(blob);
            setSnackbar({
                open: true,
                message: 'Đang mở hộp thoại in tài liệu...',
                severity: 'success'
            });
        } catch (e: any) {
            setState(prev => ({ ...prev, isLoading: false }));
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể tạo file từ dữ liệu HTML',
                severity: 'error'
            });
        }
    }, [collectDataFromHtmlInputs, processDocument, printDocxWithPreview, setSnackbar]);

    // Tạo DOCX từ dữ liệu đã lưu (id input hoặc {field}) và in bằng docx-preview
    const handleReplaySavedToWordAndPrint = useCallback(async () => {
        try {
            const currentTemplatePath = templatePathRef.current;
            if (!currentTemplatePath) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn mẫu Word trước khi in.',
                    severity: 'warning'
                });
                return;
            }
            const keyBase = state.selectedHtmlUrl || state.selectedTemplatePath || 'manual-html';
            const storageKey = `html_form_values:${keyBase}`;
            const result = await chrome.storage.local.get([storageKey]);
            const raw = (result && result[storageKey]) || {};
            if (!raw || Object.keys(raw).length === 0) {
                setSnackbar({
                    open: true,
                    message: 'Chưa có dữ liệu biểu mẫu đã lưu.',
                    severity: 'info'
                });
                return;
            }
            // Chuẩn hóa key: {field} -> field
            const normalized: Record<string, any> = {};
            Object.entries(raw).forEach(([k, v]) => {
                const m = k.match(/^\{([^}]+)\}$/);
                const nk = m && m[1] ? m[1].trim() : k;
                normalized[nk] = v;
            });

            setState(prev => ({ ...prev, isLoading: true, error: null }));
            const blob = await processDocument(currentTemplatePath, normalized);
            setState(prev => ({ ...prev, generatedBlob: blob, isLoading: false }));

            await printDocxWithPreview(blob);
            setSnackbar({
                open: true,
                message: 'Đang mở hộp thoại in tài liệu...',
                severity: 'success'
            });
        } catch (e: any) {
            setState(prev => ({ ...prev, isLoading: false }));
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể tạo/in tài liệu từ dữ liệu đã lưu',
                severity: 'error'
            });
        }
    }, [
        state.selectedHtmlUrl,
        state.selectedTemplatePath,
        processDocument,
        printDocxWithPreview,
        setSnackbar
    ]);

    // Xuất PDF từ khu vực preview (DOCX render hoặc HTML) và mở để in
    const handleExportPdfFromPreview = useCallback(async () => {
        try {
            // Xác định phần tử nguồn để xuất PDF
            let sourceElement: HTMLElement | null = null;
            if (previewMode === 'docx') {
                sourceElement = previewContainerRef.current;
            } else {
                const doc = htmlIframeRef.current?.contentDocument;
                sourceElement = (doc?.body || null) as unknown as HTMLElement | null;
            }
            if (!sourceElement) {
                setSnackbar({
                    open: true,
                    message: 'Không tìm thấy nội dung để xuất PDF',
                    severity: 'warning'
                });
                return;
            }

            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            // Chụp thành canvas với scale cao để nét hơn
            const canvas = await html2canvas(sourceElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const pxPerMm = 96 / 25.4; // 96dpi -> px/mm
            const imgWidthPx = canvas.width;
            const imgHeightPx = canvas.height;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidthMm = pdf.internal.pageSize.getWidth();
            const pageHeightMm = pdf.internal.pageSize.getHeight();

            // Tính tỉ lệ để fit theo chiều ngang trang
            const imgWidthMm = imgWidthPx / pxPerMm;
            const imgHeightMm = imgHeightPx / pxPerMm;
            const ratio = pageWidthMm / imgWidthMm;

            if (imgHeightMm * ratio <= pageHeightMm) {
                const imgData = canvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, imgHeightMm * ratio);
            } else {
                // Cần chia trang
                const segmentPxHeight = Math.floor((pageHeightMm / ratio) * pxPerMm);
                let y = 0;
                let isFirst = true;
                while (y < imgHeightPx) {
                    const segH = Math.min(segmentPxHeight, imgHeightPx - y);
                    const segCanvas = document.createElement('canvas');
                    segCanvas.width = imgWidthPx;
                    segCanvas.height = segH;
                    const segCtx = segCanvas.getContext('2d');
                    if (!segCtx) break;
                    segCtx.drawImage(canvas, 0, y, imgWidthPx, segH, 0, 0, imgWidthPx, segH);
                    const segData = segCanvas.toDataURL('image/png', 1.0);
                    if (!isFirst) pdf.addPage();
                    pdf.addImage(segData, 'PNG', 0, 0, pageWidthMm, (segH / pxPerMm) * ratio);
                    isFirst = false;
                    y += segH;
                }
            }

            // In trực tiếp trên web bằng iframe ẩn, không tải file xuống
            const pdfUrl: string = pdf.output('bloburl') as unknown as string;
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = pdfUrl;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 1000);
                }
            };
            setSnackbar({
                open: true,
                message: 'Đang mở hộp thoại in PDF...',
                severity: 'success'
            });
        } catch (e: any) {
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể xuất PDF',
                severity: 'error'
            });
        }
    }, [previewMode, setSnackbar]);

    // Đảm bảo mỗi input trong iframe HTML có khóa ổn định (id hoặc name). Nếu thiếu, tự gán id.
    const ensureHtmlInputKeys = useCallback((): void => {
        const iframe = htmlIframeRef.current;
        const doc = iframe?.contentDocument;
        if (!doc) return;
        const elements = Array.from(doc.querySelectorAll('input, textarea, select')) as Array<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >;
        elements.forEach((el, idx) => {
            const id = el.getAttribute('id') || '';
            const name = (el as HTMLInputElement).name || '';
            if (!id && !name) {
                const existing = el.getAttribute('data-auto-id');
                const autoId = existing || `auto_input_${idx + 1}`;
                el.setAttribute('data-auto-id', autoId);
                // Không tự ý thay đổi hoặc gán thuộc tính id vì id là liên kết giữa HTML và Word
            }
            // Nếu id bị mất nhưng có data-original-id trước đó, khôi phục lại
            const originalId = el.getAttribute('data-original-id');
            if (!id && originalId) {
                try {
                    el.setAttribute('id', originalId);
                } catch {}
            }
        });
    }, []);

    // Lưu/Nạp dữ liệu form HTML theo dạng key-value (key=id hoặc name nếu thiếu id)
    const getHtmlFormStorageKey = useCallback((): string => {
        const keyBase = state.selectedHtmlUrl || state.selectedTemplatePath || 'manual-html';
        return `html_form_values:${keyBase}`;
    }, [state.selectedHtmlUrl, state.selectedTemplatePath]);

    const saveHtmlFormValues = useCallback(async () => {
        try {
            const iframe = htmlIframeRef.current;
            const doc = iframe?.contentDocument;
            if (!doc) return;
            // Gán id tự động nếu input chưa có khóa
            ensureHtmlInputKeys();
            const inputs = Array.from(doc.querySelectorAll('input, textarea, select')) as Array<
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
            >;
            const data: Record<string, any> = {};

            inputs.forEach(el => {
                const id = el.getAttribute('id') || '';
                const name = (el as HTMLInputElement).name || '';
                const dataFieldKeyRaw = el.getAttribute('data-field-key') || '';
                const dataAutoId = el.getAttribute('data-auto-id') || '';
                const normalizedFieldKey = dataFieldKeyRaw
                    ? (dataFieldKeyRaw.match(/^\{([^}]+)\}$/)?.[1] || dataFieldKeyRaw).trim()
                    : '';
                const key = normalizedFieldKey || id || name || dataAutoId;
                if (!key) return;
                const tag = el.tagName.toLowerCase();
                if (tag === 'select') {
                    data[key] = (el as HTMLSelectElement).value ?? '';
                    return;
                }
                const type = (el as HTMLInputElement).type?.toLowerCase();
                if (type === 'checkbox') {
                    data[key] = (el as HTMLInputElement).checked
                        ? (el as HTMLInputElement).value || '1'
                        : '';
                    return;
                }
                if (type === 'radio') {
                    // Lưu theo group name để nạp lại dễ dàng
                    const group = normalizedFieldKey || name || id || dataAutoId;
                    if (!group) return;
                    try {
                        const checked = doc.querySelector(
                            `input[type="radio"][name="${group.replace(/"/g, '\\"')}"]:checked`
                        ) as HTMLInputElement | null;
                        if (checked) data[group] = checked.value;
                    } catch {}
                    return;
                }
                data[key] = (el as HTMLInputElement | HTMLTextAreaElement).value ?? '';
            });

            const storageKey = getHtmlFormStorageKey();
            await chrome.storage.local.set({ [storageKey]: data });
            setSnackbar({
                open: true,
                message: 'Đã lưu dữ liệu biểu mẫu (theo ID)',
                severity: 'success'
            });
        } catch (e: any) {
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể lưu dữ liệu',
                severity: 'error'
            });
        }
    }, [getHtmlFormStorageKey, ensureHtmlInputKeys, setSnackbar]);

    const loadHtmlFormValues = useCallback(async () => {
        try {
            const storageKey = getHtmlFormStorageKey();
            const result = await chrome.storage.local.get([storageKey]);
            const data = (result && result[storageKey]) || {};
            if (!data || Object.keys(data).length === 0) {
                setSnackbar({
                    open: true,
                    message: 'Chưa có dữ liệu đã lưu cho mẫu này',
                    severity: 'info'
                });
                return false;
            }
            // Đảm bảo có khóa trước khi nạp và chuẩn hóa key: nếu key ở dạng {field} -> chuyển thành field
            ensureHtmlInputKeys();
            // Chuẩn hóa key: nếu key ở dạng {field} -> chuyển thành field để khớp logic điền
            const normalized: Record<string, any> = { ...data };
            Object.entries(data).forEach(([k, v]) => {
                const m = k.match(/^\{([^}]+)\}$/);
                if (m && m[1]) {
                    const nk = m[1].trim();
                    if (!(nk in normalized)) normalized[nk] = v;
                }
            });
            // Nạp vào form
            const ok = fillHtmlFormFieldsFromData(normalized);
            if (ok) {
                setSnackbar({
                    open: true,
                    message: 'Đã nạp dữ liệu vào biểu mẫu',
                    severity: 'success'
                });
            }
            return ok;
        } catch (e: any) {
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể nạp dữ liệu',
                severity: 'error'
            });
            return false;
        }
    }, [getHtmlFormStorageKey, fillHtmlFormFieldsFromData, setSnackbar]);

    const handlePrint = useCallback(async () => {
        try {
            if (previewMode === 'docx') {
                let blobToPrint: Blob | null = null;
                if (state.generatedBlob) {
                    blobToPrint = state.generatedBlob;
                } else if (state.selectedTemplatePath) {
                    try {
                        const res = await fetch(state.selectedTemplatePath);
                        if (res.ok) blobToPrint = await res.blob();
                    } catch {}
                }

                if (!blobToPrint) {
                    setSnackbar({
                        open: true,
                        message: 'Không có tài liệu DOCX để in',
                        severity: 'warning'
                    });
                    return;
                }

                const printWindow = window.open('', '_blank');
                if (!printWindow) return;

                printWindow.document.open();
                printWindow.document.write(
                    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>In tài liệu</title><style>html,body{height:100%}body{margin:0;padding:0;background:#fff}</style></head><body><div id="docx-print-root" class="docx-preview-container"></div></body></html>'
                );
                printWindow.document.close();

                const container = printWindow.document.getElementById(
                    'docx-print-root'
                ) as HTMLDivElement | null;
                if (!container) return;

                await renderAsync(blobToPrint, container, undefined, {
                    className: 'docx-preview-container'
                });

                setTimeout(() => {
                    try {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    } catch {}
                }, 100);

                return;
            }

            // HTML mode: reuse existing preview printing
            const iframe = htmlIframeRef.current;
            const doc = iframe?.contentDocument;
            if (!doc) return;
            const html = doc.documentElement.outerHTML;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    try {
                        printWindow.print();
                        printWindow.close();
                    } catch {}
                }, 250);
            }
        } catch (e) {
            setSnackbar({
                open: true,
                message: 'Không thể in tài liệu',
                severity: 'error'
            });
        }
    }, [previewMode, state.generatedBlob, state.selectedTemplatePath, setSnackbar]);

    const handleReset = useCallback(() => {
        // Cleanup uploaded blob URL if any
        if (state.uploadedTemplateUrl) {
            try {
                URL.revokeObjectURL(state.uploadedTemplateUrl);
            } catch {}
        }
        setState(prev => ({
            ...prev,
            selectedTemplatePath: '',
            generatedBlob: null,
            error: null,
            isLoading: false,
            uploadedTemplateUrl: null,
            uploadedTemplateName: null
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
    // Đơn giản hóa: bỏ chip trạng thái socket

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
                label={displayTemplateName || ''}
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
                            Đang chờ dữ liệu App Mobile...
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

    // Helper: extract mã thủ tục (code) from current selection
    const extractCurrentCode = useCallback((): string => {
        const tryExtract = (url: string | null | undefined): string => {
            if (!url) return '';
            try {
                const parts = url.split('/');
                const idx = parts.indexOf('templates_by_code');
                if (idx >= 0 && idx + 1 < parts.length) {
                    return decodeURIComponent(parts[idx + 1] || '').trim();
                }
            } catch {}
            return '';
        };
        // Prefer code from selectedTemplatePath; fallback to selectedHtmlUrl
        const fromDocx = tryExtract(state.selectedTemplatePath);
        if (fromDocx) return fromDocx;
        const fromHtml = tryExtract(state.selectedHtmlUrl || undefined);
        return fromHtml;
    }, [state.selectedTemplatePath, state.selectedHtmlUrl]);

    const handleSaveCustomTemplate = useCallback(async () => {
        try {
            const code = extractCurrentCode();
            const templateUrl = state.uploadedTemplateUrl || state.selectedTemplatePath;
            if (!templateUrl || !code) {
                setSnackbar({
                    open: true,
                    message: 'Chưa xác định được mã thủ tục hoặc file mẫu',
                    severity: 'warning'
                });
                return;
            }
            const res = await fetch(templateUrl);
            if (!res.ok) throw new Error('Không thể tải file mẫu hiện tại');
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const safeNameBase = (
                state.uploadedTemplateName || `${displayTemplateName}.docx`
            ).replace(/\s+/g, '_');
            const fileName = /\.docx$/i.test(safeNameBase) ? safeNameBase : `${safeNameBase}.docx`;
            const saveRes = await fetch('/api/save-custom-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, fileName, fileBase64: base64 })
            });
            const json = await saveRes.json().catch(() => ({ success: false }));
            if (!saveRes.ok || !json?.success) {
                throw new Error(json?.error || 'Không thể lưu mẫu');
            }
            setSnackbar({
                open: true,
                message: 'Đã lưu mẫu vào thư mục custom',
                severity: 'success'
            });
        } catch (e: any) {
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể lưu mẫu',
                severity: 'error'
            });
        }
    }, [
        displayTemplateName,
        extractCurrentCode,
        setSnackbar,
        state.selectedTemplatePath,
        state.uploadedTemplateName,
        state.uploadedTemplateUrl
    ]);

    const renderActionButtons = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, textAlign: 'center' }}>
                Đã điền xong mẫu: <b>{displayTemplateName}</b>
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
            {/* Lưu mẫu đã chỉnh vào templates_by_code/<code>/custom */}
            <Button
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                onClick={() => void handleSaveCustomTemplate()}
                fullWidth
            >
                Lưu mẫu (custom)
            </Button>
        </Box>
    );

    // Download the currently selected template for user to customize
    const handleDownloadOriginalTemplate = useCallback(async () => {
        if (!state.selectedTemplatePath) return;
        try {
            const res = await fetch(state.selectedTemplatePath);
            if (!res.ok) throw new Error('Không thể tải file mẫu');
            const blob = await res.blob();
            const baseName = (state.uploadedTemplateName || selectedTemplateNameFromPath || 'mau')
                .replace(/\s/g, '_')
                .replace(/\.(docx?|DOCX?)$/, '');
            saveAs(blob, `${baseName}.docx`);
        } catch (e) {
            setSnackbar({ open: true, message: 'Không thể tải mẫu gốc', severity: 'error' });
        }
    }, [state.selectedTemplatePath, state.uploadedTemplateName, selectedTemplateNameFromPath]);

    // Upload a customized template and use it immediately
    const handleUploadCustomTemplate = useCallback(
        (file: File) => {
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.docx')) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn file .docx',
                    severity: 'warning'
                });
                return;
            }
            // Revoke old url if exists
            if (state.uploadedTemplateUrl) {
                try {
                    URL.revokeObjectURL(state.uploadedTemplateUrl);
                } catch {}
            }
            const url = URL.createObjectURL(file);
            setState(prev => ({
                ...prev,
                uploadedTemplateUrl: url,
                uploadedTemplateName: file.name,
                selectedTemplatePath: url,
                generatedBlob: null,
                error: null
            }));
            resetProcessing();
            setSnackbar({ open: true, message: 'Đã tải lên mẫu đã chỉnh', severity: 'success' });
        },
        [resetProcessing, state.uploadedTemplateUrl]
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
            {/* Header gọn, hiển thị tên mẫu và nút chọn mẫu khác */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                <Box />
                {state.selectedTemplatePath && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={displayTemplateName} color="info" />
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<RestartAltIcon />}
                            onClick={handleReset}
                            disabled={isProcessing}
                        >
                            Chọn mẫu khác
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Data Source is configured in Info > Settings; read from localStorage */}

            {/* Data Input Section */}
            {state.selectedTemplatePath && renderDataInputSection()}

            {/* Filter Controls */}
            {!state.selectedTemplatePath && renderFilterControls()}

            {/* Preview section only, status panel removed for simpler UI */}
            {state.selectedTemplatePath ? (
                <Paper sx={{ p: 3, height: 'fit-content' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        {/* <Typography variant="h6" gutterBottom>
                            {state.generatedBlob ? 'Xem trước tài liệu' : 'Xem trước mẫu'}
                        </Typography> */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <ToggleButtonGroup
                                size="small"
                                value={previewMode}
                                exclusive
                                onChange={(_, v) => v && setPreviewMode(v)}
                            >
                                <ToggleButton value="docx">DOCX</ToggleButton>
                                <ToggleButton value="html" disabled={!htmlRaw}>
                                    HTML
                                </ToggleButton>
                            </ToggleButtonGroup>
                            {previewMode === 'html' && (
                                <ToggleButtonGroup
                                    size="small"
                                    value={isPreviewEditMode ? 'edit' : 'view'}
                                    exclusive
                                    onChange={(_, v) => {
                                        if (!v) return;
                                        setIsPreviewEditMode(v === 'edit');
                                    }}
                                >
                                    <ToggleButton value="view">Xem</ToggleButton>
                                    <ToggleButton value="edit">Sửa trực tiếp</ToggleButton>
                                </ToggleButtonGroup>
                            )}
                            {/* Removed Sửa HTML button */}
                            {previewMode === 'docx' ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<PrintIcon />}
                                    onClick={handleOpenDocxForPrint}
                                >
                                    Mở/In Word
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={handleGenerateDocxFromHtmlAndPrint}
                                    >
                                        Điền Word & In
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => void handleReplaySavedToWordAndPrint()}
                                    >
                                        Replay & In Word (từ dữ liệu đã lưu)
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={handleExportPdfFromPreview}
                                    >
                                        Xuất PDF & In
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => void saveHtmlFormValues()}
                                    >
                                        Lưu dữ liệu biểu mẫu
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => void loadHtmlFormValues()}
                                    >
                                        Nạp dữ liệu biểu mẫu
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="outlined"
                                color="info"
                                startIcon={<InfoIcon />}
                                onClick={() => setShowFieldGuide(true)}
                            >
                                Hướng dẫn chèn {`{field}`}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadOriginalTemplate}
                            >
                                Tải mẫu gốc
                            </Button>
                            <Button onClick={handelTest}>Test LogData</Button>
                            <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
                                Tải mẫu đã chỉnh
                                <input
                                    type="file"
                                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    hidden
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadCustomTemplate(file);
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<SaveIcon />}
                                onClick={() => void handleSaveCustomTemplate()}
                            >
                                Lưu mẫu (custom)
                            </Button>
                            {state.generatedBlob && (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={handlePrint}
                                    >
                                        In tài liệu
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownload}
                                    >
                                        Tải file đã điền
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>
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
                        {previewMode === 'docx' && (
                            <div ref={previewContainerRef} className="docx-preview-container" />
                        )}
                        {previewMode === 'html' && (
                            <iframe
                                ref={htmlIframeRef}
                                title="html-preview"
                                sandbox="allow-same-origin"
                                style={{ width: '100%', minHeight: '70vh', border: 'none' }}
                                srcDoc={htmlRaw}
                                onLoad={() => {
                                    attachHtmlPreviewDndHandlers();
                                    // Thử nạp dữ liệu đã lưu (nếu có) ngay khi iframe sẵn sàng
                                    setTimeout(() => {
                                        try {
                                            const html =
                                                htmlIframeRef.current?.contentDocument
                                                    ?.documentElement?.outerHTML;
                                            console.log(html);
                                        } catch {}
                                        void loadHtmlFormValues();
                                    }, 50);
                                }}
                            />
                        )}
                    </Paper>
                </Paper>
            ) : (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        Chọn mẫu đơn từ danh sách thủ tục hành chính
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sử dụng bộ lọc ở trên để tìm và chọn mẫu đơn phù hợp
                    </Typography>
                </Paper>
            )}

            {/* Dialog: Hướng dẫn chèn {field} */}
            <Dialog
                open={showFieldGuide}
                onClose={() => setShowFieldGuide(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Hướng dẫn chèn {`{field}`} vào mẫu Word (.docx)</DialogTitle>
                <DialogContent dividers>
                    {/* Quick actions */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                        <Button
                            size="small"
                            startIcon={<GetAppIcon />}
                            onClick={handleDownloadOriginalTemplate}
                        >
                            Tải mẫu gốc
                        </Button>
                        <Button size="small" component="label" startIcon={<EditIcon />}>
                            Tải mẫu đã chỉnh
                            <input
                                type="file"
                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                hidden
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadCustomTemplate(file);
                                    e.currentTarget.value = '';
                                }}
                            />
                        </Button>
                    </Box>

                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                        3 bước đơn giản
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                            gap: 2,
                            mb: 2
                        }}
                    >
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Bước 1: Chèn thẻ
                            </Typography>
                            <Typography variant="body2">
                                Mở file Word và gõ các thẻ như {`{hoTen}`}, {`{cccd}`}, {`{ngay}`}/
                                {`{thang}`}/{`{nam}`} vào vị trí cần điền.
                            </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Bước 2: Lưu và tải lên
                            </Typography>
                            <Typography variant="body2">
                                Lưu file .docx rồi bấm "Tải mẫu đã chỉnh" để sử dụng ngay.
                            </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Bước 3: Nhập dữ liệu
                            </Typography>
                            <Typography variant="body2">
                                Quét QR/nhập dữ liệu. Hệ thống sẽ tự điền vào đúng vị trí trên mẫu.
                            </Typography>
                        </Paper>
                    </Box>

                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                        Ví dụ nhanh
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                        <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                            align="left"
                        >
                            {`
                            Họ và tên: {ho_ten}
                            Số CCCD: {cccd}
                            Ngày sinh: {ns_ngay}/{ns_thang}/{ns_nam}  (hoặc {ngay_sinh})
                            Giới tính: {gioi_tinh}
                            Địa chỉ: {noi_cu_tru}
                            Ngày cấp: {nc_ngay}/{nc_thang}/{nc_nam}  (hoặc {ngay_cap})
                            `}
                        </Typography>
                    </Paper>

                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                        Danh sách trường hỗ trợ (bấm để sao chép)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Nhóm chính:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {['cccd', 'cmnd', 'hoTen', 'ngaySinh', 'gioiTinh', 'diaChi', 'ngayCap'].map(
                            k => (
                                <MuiTooltip key={k} title="Bấm để sao chép">
                                    <Chip
                                        label={`{${k}}`}
                                        variant="outlined"
                                        size="small"
                                        onClick={() => navigator.clipboard.writeText(`{${k}}`)}
                                        onDelete={() => navigator.clipboard.writeText(`{${k}}`)}
                                        deleteIcon={<ContentCopyIcon fontSize="small" />}
                                    />
                                </MuiTooltip>
                            )
                        )}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Tương thích (snake_case):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {[
                            'ho_ten',
                            'ngay_sinh',
                            'gioi_tinh',
                            'dia_chi',
                            'ngay_cap',
                            'noi_cu_tru'
                        ].map(k => (
                            <MuiTooltip key={k} title="Bấm để sao chép">
                                <Chip
                                    label={`{${k}}`}
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigator.clipboard.writeText(`{${k}}`)}
                                    onDelete={() => navigator.clipboard.writeText(`{${k}}`)}
                                    deleteIcon={<ContentCopyIcon fontSize="small" />}
                                />
                            </MuiTooltip>
                        ))}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Bí danh/tiện dụng:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {[
                            'ten',
                            'hoten',
                            'ho_va_ten',
                            'so_cccd',
                            'so_cmnd',
                            'ngay_thang_nam_sinh',
                            'ngay_thang_nam_cap'
                        ].map(k => (
                            <MuiTooltip key={k} title="Bấm để sao chép">
                                <Chip
                                    label={`{${k}}`}
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigator.clipboard.writeText(`{${k}}`)}
                                    onDelete={() => navigator.clipboard.writeText(`{${k}}`)}
                                    deleteIcon={<ContentCopyIcon fontSize="small" />}
                                />
                            </MuiTooltip>
                        ))}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Tách ngày/tháng/năm tự động:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {[
                            'ngay',
                            'thang',
                            'nam',
                            'ngay_sinh_full',
                            'ngayCap_full',
                            'ngay_cap_full',
                            'ngay_cap_ngay',
                            'ngay_cap_thang',
                            'ngay_cap_nam'
                        ].map(k => (
                            <MuiTooltip key={k} title="Bấm để sao chép">
                                <Chip
                                    label={`{${k}}`}
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigator.clipboard.writeText(`{${k}}`)}
                                    onDelete={() => navigator.clipboard.writeText(`{${k}}`)}
                                    deleteIcon={<ContentCopyIcon fontSize="small" />}
                                />
                            </MuiTooltip>
                        ))}
                    </Box>

                    <Accordion sx={{ mt: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">Câu hỏi thường gặp</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                • Không thấy dữ liệu hiện lên? Hãy kiểm tra chính tả của thẻ, ví dụ{' '}
                                {`{hoTen}`} không phải {`{hoten}`}. Bạn có thể dùng các thẻ trong
                                danh sách phía trên để copy cho chính xác.
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                • Có thể ghi tiếng Việt có dấu không? Có, thẻ {`{field}`} chỉ là tên
                                khóa, bạn có thể đặt văn bản mô tả xung quanh tùy ý.
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                • Thay đổi mẫu nhiều lần được không? Được, bạn có thể bấm "Tải mẫu
                                gốc" rồi "Tải mẫu đã chỉnh" để cập nhật bất cứ khi nào.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowFieldGuide(false)} autoFocus>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Removed: Dialog Sửa HTML trực tiếp */}

            {/* Dialog: Chèn nội dung vào HTML */}
            <Dialog open={insertDialogOpen} onClose={handleCancelInsert} maxWidth="sm" fullWidth>
                <DialogTitle>Chèn nội dung</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                        <Typography variant="body2">Chế độ:</Typography>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={insertMode}
                            onChange={(_, v) => v && setInsertMode(v)}
                        >
                            <ToggleButton value="field">Chèn thẻ {`{field}`}</ToggleButton>
                            <ToggleButton value="text">Nhập văn bản</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    {insertMode === 'field' ? (
                        <FormControl fullWidth size="small">
                            <InputLabel id="insert-field-key-label">Chọn trường dữ liệu</InputLabel>
                            <Select
                                labelId="insert-field-key-label"
                                label="Chọn trường dữ liệu"
                                value={insertFieldKey}
                                onChange={e => setInsertFieldKey(e.target.value as string)}
                                MenuProps={{ PaperProps: { style: { maxHeight: 360 } } }}
                                renderValue={selected => {
                                    const key = selected as string;
                                    const desc = fieldKeyDescriptions[key] || '';
                                    return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ color: 'text.secondary' }}>
                                                {fieldKeyIcons[key]}
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {key}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {desc}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                }}
                            >
                                {availableFieldKeys.map(k => (
                                    <MenuItem key={k} value={k}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ color: 'text.secondary' }}>
                                                {fieldKeyIcons[k]}
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {k}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {fieldKeyDescriptions[k] || ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField
                            fullWidth
                            size="small"
                            label="Nội dung cần chèn"
                            value={insertText}
                            onChange={e => setInsertText(e.target.value)}
                            placeholder="Nhập văn bản..."
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelInsert}>Hủy</Button>
                    <Button onClick={handleConfirmInsert} variant="contained">
                        Chèn
                    </Button>
                </DialogActions>
            </Dialog>

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
