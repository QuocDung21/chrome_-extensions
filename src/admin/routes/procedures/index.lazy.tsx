import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { renderAsync } from 'docx-preview';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import { Socket, io } from 'socket.io-client';

// --- ICON ---
import {
    AddCircleOutline as AddCircleOutlineIcon,
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
    Grid,
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
// --- SYNCFUSION WORD EDITOR ---
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import {
    DocumentEditorContainerComponent,
    Ribbon,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute } from '@tanstack/react-router';

import { ProcessingModal } from '../../components/word-mapper/ProcessingModal';
// --- COMPONENTS ---
import {
    type EnhancedTTHCRecord,
    type FilterOptions,
    type FilterState,
    TemplateSelectorModal
} from '../procedures/TemplateSelectorModal';

import { db } from '../../db/db';
import type { WorkingDocument } from '../../db/db';
import { thuTucHCRepository } from '../../repository/ThuTucHCRepository';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon);

// --- CẤU HÌNH ---
const SOCKET_URL = 'http://103.162.21.146:5003';
const SYNCFUSION_SERVICE_URL =
    'https://services.syncfusion.com/react/production/api/documenteditor/';
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

    // Máy quét
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
const convertScannedInfoToProcessingData = (scannedInfo: ScannedInfo | any): ProcessingData => {
    // Handle mobile socket data format (already processed)
    if (scannedInfo.so_cccd || scannedInfo.so_cmnd || scannedInfo.ho_ten) {
        console.log('📱 Detected mobile socket format, using as-is');
        return {
            ...scannedInfo,
            // Ensure all required formats are available
            cccd: scannedInfo.cccd || scannedInfo.so_cccd || '',
            cmnd: scannedInfo.cmnd || scannedInfo.so_cmnd || '',
            hoTen: scannedInfo.hoTen || scannedInfo.ho_ten || '',
            ngaySinh: scannedInfo.ngaySinh || scannedInfo.ngay_sinh || '',
            gioiTinh: scannedInfo.gioiTinh || scannedInfo.gioi_tinh || '',
            diaChi: scannedInfo.diaChi || scannedInfo.noi_cu_tru || '',
            ngayCap: scannedInfo.ngayCap || scannedInfo.ngay_cap || '',

            // Add mobile format fallbacks
            so_cccd: scannedInfo.so_cccd || scannedInfo.cccd || '',
            so_cmnd: scannedInfo.so_cmnd || scannedInfo.cmnd || '',
            ho_ten: scannedInfo.ho_ten || scannedInfo.hoTen || '',
            ngay_sinh: scannedInfo.ngay_sinh || scannedInfo.ngaySinh || '',
            gioi_tinh: scannedInfo.gioi_tinh || scannedInfo.gioiTinh || '',
            noi_cu_tru: scannedInfo.noi_cu_tru || scannedInfo.diaChi || '',
            ngay_cap: scannedInfo.ngay_cap || scannedInfo.ngayCap || ''
        } as ProcessingData;
    }

    // Handle QR scanner format (ScannedInfo)
    console.log('📄 Processing QR scanner format');
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

// Local TTHCRecord interface with all fields needed for CSV processing
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

// Enhanced version for template availability checking
interface LocalEnhancedTTHCRecord extends TTHCRecord {
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

// Fill placeholders in Syncfusion editor: replaces {key} in body text
const applyDataToSyncfusionFactory =
    (getEditor: () => DocumentEditorContainerComponent | null) =>
    async (data: ProcessingData): Promise<boolean> => {
        try {
            console.log('🔄 Starting Syncfusion data insertion...', data);
            console.log('🔍 Data fields available:', Object.keys(data || {}));
            console.log('🎯 hoTen value:', data?.hoTen);
            console.log('🎯 ho_ten value:', data?.ho_ten);

            const container = getEditor();
            if (!container) {
                console.error('❌ Container is null');
                return false;
            }

            const editor = container?.documentEditor;
            if (!editor) {
                console.error('❌ DocumentEditor is null');
                return false;
            }

            console.log('✅ Editor found, serializing document...');
            const sfdt = editor.serialize();
            if (!sfdt) {
                console.error('❌ Failed to serialize document');
                return false;
            }

            console.log('✅ Document serialized, parsing JSON...');
            const json = typeof sfdt === 'string' ? JSON.parse(sfdt) : sfdt;
            if (!json) {
                console.error('❌ Failed to parse SFDT JSON');
                return false;
            }

            console.log('📄 SFDT Structure:', {
                hasKeyFields: Object.keys(json).slice(0, 10),
                sectionsType: typeof json.sections,
                secType: typeof json.sec,
                sectionsLength: Array.isArray(json.sections) ? json.sections.length : 'not array',
                secLength: Array.isArray(json.sec) ? json.sec.length : 'not array',
                actualSections: json.sections || json.sec,
                fullStructure: json
            });

            // More flexible structure checking - Syncfusion uses 'sec' not 'sections'
            const sectionsProperty = json.sections || json.sec;
            if (!sectionsProperty) {
                console.error('❌ Document has no sections/sec property');
                console.log('Available properties:', Object.keys(json));
                return false;
            }

            if (!Array.isArray(sectionsProperty)) {
                console.error('❌ Sections is not an array, type:', typeof sectionsProperty);
                return false;
            }

            if (sectionsProperty.length === 0) {
                console.warn('⚠️ Document has empty sections array');
                return true; // Not an error, just empty document
            }

            console.log('✅ Editor found, using Syncfusion Find & Replace API...');

            // Create replace map for exact placeholder matching
            const replaceMap: Record<string, string> = {
                '{ho_ten}': data.hoTen || data.ho_ten || '',
                '{cccd}': data.cccd || data.so_cccd || '',
                '{cmnd}': data.cmnd || data.so_cmnd || '',
                '{so_cccd}': data.so_cccd || data.cccd || '',
                '{so_cmnd}': data.so_cmnd || data.cmnd || '',
                '{ngay_sinh}': data.ngaySinh || data.ngay_sinh || '',
                '{gioi_tinh}': data.gioiTinh || data.gioi_tinh || '',
                '{noi_cu_tru}': data.noiCuTru || data.noi_cu_tru || '',
                '{dan_toc}': data.danToc || data.dan_toc || '',
                '{noi_cap}': data.noiCap || data.noi_cap || '',
                '{ngay_cap}': data.ngayCap || data.ngay_cap || '',
                // Thêm các field mới từ mobile
                '{ns_ngay}': data.ns_ngay || '',
                '{ns_thang}': data.ns_thang || '',
                '{ns_nam}': data.ns_nam || '',
                '{nc_ngay}': data.nc_ngay || '',
                '{nc_thang}': data.nc_thang || '',
                '{nc_nam}': data.nc_nam || ''
            };

            console.log('📝 Replace map:', replaceMap);

            let totalReplacements = 0;

            // Use Syncfusion's simple approach - modify SFDT and reload
            console.log('🔄 Using SFDT modification approach...');

            // Get current document as SFDT
            const currentSfdt = editor.serialize();
            if (!currentSfdt) {
                console.error('❌ Failed to serialize document');
                return false;
            }

            // Replace placeholders in the SFDT string directly
            let modifiedSfdt = currentSfdt;
            for (const [placeholder, value] of Object.entries(replaceMap)) {
                if (value) {
                    const regex = new RegExp(
                        placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        'g'
                    );
                    const beforeLength = modifiedSfdt.length;
                    modifiedSfdt = modifiedSfdt.replace(regex, value);
                    const afterLength = modifiedSfdt.length;

                    if (beforeLength !== afterLength) {
                        totalReplacements++;
                        console.log(`✅ Replaced "${placeholder}" with "${value}" in SFDT`);
                    } else {
                        console.log(`⚠️ No instances of "${placeholder}" found in SFDT`);
                    }
                }
            }

            // Reload the modified document
            if (totalReplacements > 0) {
                console.log('🔄 Loading modified document...');
                editor.open(modifiedSfdt);
                console.log('✅ Document reloaded with replacements');
            }

            console.log(`🎯 Total replacements made: ${totalReplacements}`);

            console.log('✅ Syncfusion data insertion completed successfully');
            return true;
        } catch (error: any) {
            console.error('❌ Error in applyDataToSyncfusionFactory:', error);
            console.error('Stack trace:', error.stack);
            return false;
        }
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

const createFilterOptions = (records: TTHCRecord[] | LocalEnhancedTTHCRecord[]): FilterOptions => {
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

const buildDocxUrlForRecord = (record: TTHCRecord | LocalEnhancedTTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const encodedCode = encodeURIComponent(code);
    const encodedName = encodeURIComponent(templateName);
    // Ensure no double slashes and proper URL format
    const path = `templates_by_code/${encodedCode}/docx/${encodedName}`.replace(/\/+/g, '/');
    return `/${path}`;
};

const buildHtmlUrlForRecord = (record: TTHCRecord | LocalEnhancedTTHCRecord): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = record.tenFile || extractTemplateName(record.mauDon);
    const base = templateName.replace(/\.(docx?|DOCX?)$/, '');
    const encodedCode = encodeURIComponent(code);
    const encodedHtml = encodeURIComponent(`${base}.html`);
    // Ensure no double slashes and proper URL format
    const path = `templates_by_code/${encodedCode}/html/${encodedHtml}`.replace(/\/+/g, '/');
    return `/${path}`;
};

const checkTemplateExists = async (
    record: TTHCRecord | LocalEnhancedTTHCRecord
): Promise<boolean> => {
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
): Promise<LocalEnhancedTTHCRecord[]> => {
    const checks = await Promise.all(records.map(r => checkTemplateExists(r)));
    return records.map((record, idx) => ({ ...record, isTemplateAvailable: checks[idx] }));
};

const filterRecords = (
    records: LocalEnhancedTTHCRecord[],
    filters: FilterState
): LocalEnhancedTTHCRecord[] => {
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
function ProceduresComponent() {
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
    const [csvRecords, setCsvRecords] = useState<LocalEnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        thuTucByLinhVuc: {}
    });
    const [filters, setFilters] = useState<FilterState>({
        linhVuc: '',
        thuTuc: '',
        availability: 'all'
    });
    const [filteredRecords, setFilteredRecords] = useState<LocalEnhancedTTHCRecord[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<LocalEnhancedTTHCRecord | null>(null);
    const [workingDocsByCode, setWorkingDocsByCode] = useState<Record<string, WorkingDocument | undefined>>({});
    const [workingDocsListByCode, setWorkingDocsListByCode] = useState<Record<string, WorkingDocument[]>>({});
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
    const [previewMode] = useState<'syncfusion'>('syncfusion');
    const templatePathRef = useRef<string>('');
    // Lưu lại mã thủ tục hiện tại để dùng khi đường dẫn là blob/object URL
    const currentCodeRef = useRef<string>('');
    const [showFieldGuide, setShowFieldGuide] = useState(false);
    const [syncfusionDocumentReady, setSyncfusionDocumentReady] = useState(false);
    const [syncfusionLoading, setSyncfusionLoading] = useState(false);
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
    const { socketStatus, reconnectAttempts, on, off } = useSocketConnection(SOCKET_URL);
    const { processingStep, progress, processDocument, resetProcessing } = useDocumentProcessor();
    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);
    const currentWorkingDocIdRef = useRef<number | null>(null);

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

    // Hàm apply cho Syncfusion với quyền truy cập ref
    const applyDataToSyncfusion = useMemo(
        () => applyDataToSyncfusionFactory(() => sfContainerRef.current),
        []
    );

    // Quick Input: separate field list for text fields (not the same as button list)
    interface QuickInputField {
        label: string;
        key: string;
        placeholder?: string;
    }

    const quickInputFields: QuickInputField[] = [
        { label: 'Họ tên', key: 'ho_ten', placeholder: '{ho_ten}' },
        { label: 'CCCD', key: 'cccd', placeholder: '{cccd}' },
        { label: 'CMND', key: 'cmnd', placeholder: '{cmnd}' },
        { label: 'Ngày sinh', key: 'ngay_sinh', placeholder: '{ngay_sinh}' },
        { label: 'Giới tính', key: 'gioi_tinh', placeholder: '{gioi_tinh}' },
        { label: 'Nơi cư trú', key: 'noi_cu_tru', placeholder: '{noi_cu_tru}' },
        { label: 'Ngày cấp', key: 'ngay_cap', placeholder: '{ngay_cap}' },
        { label: 'Dân tộc', key: 'dan_toc', placeholder: '{dan_toc}' },
        { label: 'Nơi cấp', key: 'noi_cap', placeholder: '{noi_cap}' }
    ];

    const [quickInputValues, setQuickInputValues] = useState<Record<string, string>>({});

    const handleApplyQuickInputs = useCallback(async () => {
        try {
            if (!sfContainerRef.current?.documentEditor) {
                setSnackbar({ open: true, message: 'Editor chưa sẵn sàng', severity: 'warning' });
                return;
            }
            const data: ProcessingData = {};
            quickInputFields.forEach(f => {
                const v = (quickInputValues[f.key] || '').trim();
                if (v) data[f.key] = v;
            });
            if (Object.keys(data).length === 0) {
                setSnackbar({ open: true, message: 'Chưa có dữ liệu để áp dụng', severity: 'info' });
                return;
            }
            const ok = await applyDataToSyncfusion(data);
            setSnackbar({
                open: true,
                message: ok ? 'Đã chèn dữ liệu nhanh vào tài liệu' : 'Không thể chèn dữ liệu',
                severity: ok ? 'success' : 'error'
            });
        } catch (e: any) {
            setSnackbar({ open: true, message: e?.message || 'Lỗi áp dụng dữ liệu', severity: 'error' });
        }
    }, [applyDataToSyncfusion, quickInputFields, quickInputValues, setSnackbar]);

    const handleClearQuickInputs = useCallback(() => {
        setQuickInputValues({});
    }, []);

    // Hàm chèn field vào Syncfusion Editor
    const insertFieldIntoSyncfusion = useCallback(
        (fieldPlaceholder: string) => {
            try {
                const container = sfContainerRef.current;
                if (!container || !container.documentEditor) {
                    setSnackbar({
                        open: true,
                        message: 'Editor chưa sẵn sàng để chèn field',
                        severity: 'warning'
                    });
                    return;
                }

                const editor = container.documentEditor;

                // Insert the field placeholder at current cursor position
                editor.editor.insertText(fieldPlaceholder);

                setSnackbar({
                    open: true,
                    message: `Đã chèn field "${fieldPlaceholder}" vào document`,
                    severity: 'success'
                });

                console.log(`✅ Inserted field "${fieldPlaceholder}" into document`);
            } catch (error) {
                console.error('❌ Error inserting field:', error);
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi chèn field vào document',
                    severity: 'error'
                });
            }
        },
        [setSnackbar]
    );

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
            if (previewMode === 'syncfusion') {
                try {
                    console.log('🚀 Starting Syncfusion data insertion process...');

                    // Check if editor is available
                    if (!sfContainerRef.current?.documentEditor) {
                        console.error('❌ Syncfusion DocumentEditor not available');
                        setSnackbar({
                            open: true,
                            message: 'Syncfusion DocumentEditor chưa sẵn sàng. Vui lòng thử lại.',
                            severity: 'error'
                        });
                        return;
                    }

                    // Check if document is loading
                    if (syncfusionLoading) {
                        console.warn('⚠️ Syncfusion document is still loading');
                        setSnackbar({
                            open: true,
                            message: 'Tài liệu đang được tải. Vui lòng chờ...',
                            severity: 'info'
                        });
                        return;
                    }

                    // Check if document is ready
                    if (!syncfusionDocumentReady) {
                        console.warn('⚠️ Syncfusion document is not ready');
                        setSnackbar({
                            open: true,
                            message:
                                'Tài liệu chưa sẵn sàng. Vui lòng tải template trước khi chèn dữ liệu.',
                            severity: 'warning'
                        });
                        return;
                    }

                    // Check if we have data to insert
                    if (!processingData || Object.keys(processingData).length === 0) {
                        console.warn('⚠️ No processing data available');
                        setSnackbar({
                            open: true,
                            message:
                                'Không có dữ liệu để chèn. Vui lòng quét QR code hoặc nhập dữ liệu trước.',
                            severity: 'warning'
                        });
                        return;
                    }

                    console.log('📋 Processing data:', processingData);

                    const applied = await applyDataToSyncfusion(processingData);
                    setSnackbar({
                        open: true,
                        message: applied
                            ? 'Đã chèn dữ liệu vào tài liệu (Syncfusion)'
                            : 'Không thể chèn dữ liệu vào tài liệu Syncfusion. Kiểm tra Console để xem chi tiết lỗi.',
                        severity: applied ? 'success' : 'error'
                    });
                } catch (error: any) {
                    console.error('❌ Unexpected error during Syncfusion data insertion:', error);
                    setSnackbar({
                        open: true,
                        message: `Lỗi không mong muốn: ${error?.message || 'Unknown error'}`,
                        severity: 'error'
                    });
                }
            } else if (previewMode === 'html' && htmlIframeRef.current?.contentDocument) {
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
                // Load ThuTucHC list via repository (uses IndexedDB cache)
                const thuTucList = await thuTucHCRepository.getAllThuTucHC();

                // Map to local TTHCRecord shape and filter entries that have a doc template reference
                const rawRecords: TTHCRecord[] = thuTucList
                    .map(item => ({
                        stt: '',
                        maTTHC: item.maTTHC || '',
                        tenTTHC: item.tenTTHC || '',
                        qdCongBo: item.qdCongBo || '',
                        doiTuong: item.doiTuong || '',
                        linhVuc: item.linhVuc || '',
                        coQuanCongKhai: item.coQuanCongKhai || '',
                        capThucHien: item.capThucHien || '',
                        tinhTrang: item.tinhTrang || '',
                        tenGiayTo: item.tenGiayTo || '',
                        mauDon: item.mauDon || '',
                        tenFile: item.tenFile || ''
                    }))
                    .filter(
                        r =>
                            (r.tenFile && r.tenFile.toLowerCase().includes('.doc')) ||
                            (r.mauDon && r.mauDon.toLowerCase().includes('.doc'))
                    );
                const enhancedRecords = await enhanceRecordsWithAvailability(rawRecords);

                setCsvRecords(enhancedRecords);
                setAvailableTemplates([]);
                setFilterOptions(createFilterOptions(rawRecords));
                setFilteredRecords(enhancedRecords);

                // Load existing working docs (V2) from IndexedDB and index latest by maTTHC
                try {
                    const allWorking = await db.workingDocumentsV2.orderBy('updatedAt').reverse().toArray();
                    const byCode: { [code: string]: WorkingDocument } = {};
                    const listByCode: { [code: string]: WorkingDocument[] } = {};
                    allWorking.forEach(doc => {
                        if (!doc.maTTHC) return;
                        if (!listByCode[doc.maTTHC]) listByCode[doc.maTTHC] = [];
                        listByCode[doc.maTTHC].push(doc);
                        if (!byCode[doc.maTTHC]) byCode[doc.maTTHC] = doc; // latest (since reversed)
                    });
                    setWorkingDocsByCode(byCode);
                    setWorkingDocsListByCode(listByCode);
                    console.log(`✅ Loaded ${Object.keys(byCode).length} working documents from IndexedDB (V2)`);
                } catch (e) {
                    console.warn('Không thể đọc Working Documents từ IndexedDB', e);
                }

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

    // If navigated here with query params (?docUrl=&code=&htmlUrl=), auto-load in Syncfusion
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const docUrl = sp.get('docUrl');
            const code = sp.get('code');
            const htmlUrl = sp.get('htmlUrl');
            if (docUrl && code) {
                currentCodeRef.current = code;
                setState(prev => ({
                    ...prev,
                    selectedTemplatePath: docUrl,
                    selectedHtmlUrl: htmlUrl || null,
                    generatedBlob: null,
                    error: null
                }));
                resetProcessing();
                // Clean query params after handling
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        } catch {}
    }, [resetProcessing]);

    // Also support navigation via localStorage payload from other routes
    useEffect(() => {
        try {
            const key = 'pending_procedure_load';
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const payload = JSON.parse(raw || '{}');
            const docUrl = payload?.docUrl as string | undefined;
            const code = payload?.code as string | undefined;
            const htmlUrl = (payload?.htmlUrl as string | undefined) || null;
            if (docUrl && code) {
                currentCodeRef.current = code;
                setState(prev => ({
                    ...prev,
                    selectedTemplatePath: docUrl,
                    selectedHtmlUrl: htmlUrl,
                    generatedBlob: null,
                    error: null
                }));
                resetProcessing();
            }
            // Clear payload regardless to avoid re-loading on next entry
            localStorage.removeItem(key);
        } catch {}
    }, [resetProcessing]);

    // Function to refresh working documents from IndexedDB
    const refreshWorkingDocuments = useCallback(async () => {
        try {
            const allWorking = await db.workingDocumentsV2.orderBy('updatedAt').reverse().toArray();
            const byCode: { [code: string]: WorkingDocument } = {};
            const listByCode: { [code: string]: WorkingDocument[] } = {};
            allWorking.forEach(doc => {
                if (!doc.maTTHC) return;
                if (!listByCode[doc.maTTHC]) listByCode[doc.maTTHC] = [];
                listByCode[doc.maTTHC].push(doc);
                if (!byCode[doc.maTTHC]) byCode[doc.maTTHC] = doc;
            });
            setWorkingDocsByCode(byCode);
            setWorkingDocsListByCode(listByCode);
            console.log(`✅ Refreshed working documents: ${Object.keys(byCode).length} documents`);
        } catch (e) {
            console.error('❌ Failed to refresh working documents:', e);
        }
    }, []);

    // Function to delete working document from IndexedDB
    const deleteWorkingDocument = useCallback(async (maTTHC: string) => {
        try {
            await db.workingDocumentsV2.where('maTTHC').equals(maTTHC).delete();
            setWorkingDocsByCode(prev => {
                const newState = { ...prev };
                delete newState[maTTHC];
                return newState;
            });
            setWorkingDocsListByCode(prev => {
                const next = { ...prev };
                delete next[maTTHC];
                return next;
            });
            console.log(`✅ Deleted working document for maTTHC: ${maTTHC}`);
            setSnackbar({
                open: true,
                message: 'Đã xóa tài liệu đã lưu',
                severity: 'success'
            });
        } catch (e) {
            console.error('❌ Failed to delete working document:', e);
            setSnackbar({
                open: true,
                message: 'Lỗi khi xóa tài liệu đã lưu',
                severity: 'error'
            });
        }
    }, [setSnackbar]);

    // Function to get working document info for display
    const getWorkingDocumentInfo = useCallback((maTTHC: string) => {
        return workingDocsByCode[maTTHC];
    }, [workingDocsByCode]);

    // Function to check if working document exists for a specific maTTHC
    const hasWorkingDocument = useCallback((maTTHC: string) => {
        return !!workingDocsByCode[maTTHC];
    }, [workingDocsByCode]);

    // Function to get all working documents for display
    const getAllWorkingDocuments = useCallback(() => {
        return Object.values(workingDocsByCode);
    }, [workingDocsByCode]);

    // Function to get working document count
    const getWorkingDocumentCount = useCallback(() => {
        return Object.keys(workingDocsByCode).length;
    }, [workingDocsByCode]);

    // Function to get working document by filename for search
    const getWorkingDocumentByFilename = useCallback((filename: string) => {
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).find(doc => doc.fileName === filename);
    }, [workingDocsByCode]);

    // Function to get working document by maTTHC for quick access
    const getWorkingDocumentByMaTTHC = useCallback((maTTHC: string) => {
        return workingDocsByCode[maTTHC];
    }, [workingDocsByCode]);

        // Function to get working documents by date range for filtering
    const getWorkingDocumentsByDateRange = useCallback((startDate: Date, endDate: Date) => {
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).filter(doc => {
            const docDate = new Date(doc.updatedAt);
            return docDate >= startDate && docDate <= endDate;
        });
    }, [workingDocsByCode]);

    // Function to get working documents by mime type for filtering
    const getWorkingDocumentsByMimeType = useCallback((mimeType: string) => {
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).filter(doc => {
            return doc.mimeType === mimeType;
        });
    }, [workingDocsByCode]);

    // Function to get working documents by size range for filtering
    const getWorkingDocumentsBySizeRange = useCallback((minSize: number, maxSize: number) => {
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).filter(doc => {
            const docSize = doc.blob.size;
            return docSize >= minSize && docSize <= maxSize;
        });
    }, [workingDocsByCode]);

    // Function to get working documents by filename pattern for search
    const getWorkingDocumentsByFilenamePattern = useCallback((pattern: string) => {
        const regex = new RegExp(pattern, 'i');
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).filter(doc => {
            return regex.test(doc.fileName);
        });
    }, [workingDocsByCode]);

    // Function to get working documents by maTTHC pattern for search
    const getWorkingDocumentsByMaTTHCPattern = useCallback((pattern: string) => {
        const regex = new RegExp(pattern, 'i');
        return Object.values(workingDocsByCode).filter((doc): doc is WorkingDocument => !!doc).filter(doc => {
            return regex.test(doc.maTTHC);
        });
    }, [workingDocsByCode]);

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

    useEffect(() => {
        const renderSelectedTemplate = async () => {
            // Điều kiện chung: chỉ chạy khi có mẫu được chọn.
            const templateUrl = state.uploadedTemplateUrl || state.selectedTemplatePath;
            if (!templateUrl) {
                return;
            }

            try {
                // Since we only use syncfusion mode, this section is not needed
                // All document viewing is handled by Syncfusion editor
                
                // ----- Chế độ xem Syncfusion -----
                if (previewMode === 'syncfusion') {
                    // Điều kiện kiểm tra ref cho Syncfusion
                    if (!sfContainerRef.current?.documentEditor) return;

                    // Kiểm tra xem có phải là working document từ IndexedDB không
                    const isWorkingDocument = templateUrl.startsWith('working://');
                    
                    if (isWorkingDocument && state.generatedBlob) {
                        // Nếu là working document và có blob, mở trực tiếp vào Syncfusion
                        console.log('🔄 Loading working document from IndexedDB into Syncfusion...');
                        setSyncfusionLoading(true);
                        setSyncfusionDocumentReady(false);

                        try {
                            // Mở trực tiếp blob vào Syncfusion editor
                            sfContainerRef.current.documentEditor.open(state.generatedBlob);
                            
                            // Wait a bit for the document to be fully loaded
                            setTimeout(() => {
                                // Verify document is actually loaded by checking its content
                                try {
                                    const testSfdt =
                                        sfContainerRef.current?.documentEditor?.serialize();
                                    if (testSfdt) {
                                        const testJson =
                                            typeof testSfdt === 'string'
                                                ? JSON.parse(testSfdt)
                                                : testSfdt;
                                        const testSections = testJson?.sections || testJson?.sec;
                                        if (testJson && testSections && Array.isArray(testSections)) {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                            console.log(
                                                '✅ Syncfusion document ready for data insertion'
                                            );
                                            console.log(
                                                '📄 Document has',
                                                testSections.length,
                                                'sections'
                                            );
                                        } else {
                                            console.warn(
                                                '⚠️ Document structure not ready yet, waiting longer...'
                                            );
                                            console.log(
                                                'Available properties:',
                                                Object.keys(testJson || {})
                                            );
                                            // Wait a bit more
                                            setTimeout(() => {
                                                setSyncfusionDocumentReady(true);
                                                setSyncfusionLoading(false);
                                            }, 1000);
                                        }
                                    } else {
                                        console.warn(
                                            '⚠️ Cannot serialize document yet, waiting longer...'
                                        );
                                        setTimeout(() => {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                        }, 1000);
                                    }
                                } catch (error) {
                                    console.warn('⚠️ Error checking document readiness:', error);
                                    setSyncfusionDocumentReady(true);
                                    setSyncfusionLoading(false);
                                }
                            }, 1000);
                        } catch (e: any) {
                            console.error('❌ Error loading working document into Syncfusion:', e);
                            setSyncfusionLoading(false);
                            setSyncfusionDocumentReady(false);
                            setSnackbar({
                                open: true,
                                message: e?.message || 'Không thể mở tài liệu đã lưu trong Syncfusion',
                                severity: 'error'
                            });
                            // Nếu lỗi, giữ nguyên chế độ syncfusion
                            console.warn('Error loading working document, keeping syncfusion mode');
                        }
                    } else {
                        // Nếu không phải working document, sử dụng logic cũ để tải từ URL
                        try {
                            console.log('🔄 Loading template into Syncfusion...');
                            setSyncfusionLoading(true);
                            setSyncfusionDocumentReady(false);

                            const res = await fetch(templateUrl);
                            if (!res.ok) throw new Error('Không thể tải file mẫu cho Syncfusion');

                            const blob = await res.blob();
                            const form = new FormData();
                            form.append('files', blob, state.uploadedTemplateName || 'template.docx');

                            console.log('🔄 Converting DOCX to SFDT...');
                            // Gọi service của Syncfusion để chuyển đổi docx -> sfdt
                            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                                method: 'POST',
                                body: form
                            });

                            if (!importRes.ok) {
                                throw new Error(`Lỗi khi import file: ${importRes.statusText}`);
                            }

                            const sfdtText = await importRes.text();
                            console.log('✅ SFDT conversion completed');

                            // Mở chuỗi SFDT nhận được từ service
                            console.log('🔄 Opening document in Syncfusion editor...');
                            sfContainerRef.current.documentEditor.open(sfdtText);

                            // Wait a bit for the document to be fully loaded
                            setTimeout(() => {
                                // Verify document is actually loaded by checking its content
                                try {
                                    const testSfdt =
                                        sfContainerRef.current?.documentEditor?.serialize();
                                    if (testSfdt) {
                                        const testJson =
                                            typeof testSfdt === 'string'
                                                ? JSON.parse(testSfdt)
                                                : testSfdt;
                                        const testSections = testJson?.sections || testJson?.sec;
                                        if (testJson && testSections && Array.isArray(testSections)) {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                            console.log(
                                                '✅ Syncfusion document ready for data insertion'
                                            );
                                            console.log(
                                                '📄 Document has',
                                                testSections.length,
                                                'sections'
                                            );
                                        } else {
                                            console.warn(
                                                '⚠️ Document structure not ready yet, waiting longer...'
                                            );
                                            console.log(
                                                'Available properties:',
                                                Object.keys(testJson || {})
                                            );
                                            // Wait a bit more
                                            setTimeout(() => {
                                                setSyncfusionDocumentReady(true);
                                                setSyncfusionLoading(false);
                                            }, 1000);
                                        }
                                    } else {
                                        console.warn(
                                            '⚠️ Cannot serialize document yet, waiting longer...'
                                        );
                                        setTimeout(() => {
                                            setSyncfusionDocumentReady(true);
                                            setSyncfusionLoading(false);
                                        }, 1000);
                                    }
                                } catch (error) {
                                    console.warn('⚠️ Error checking document readiness:', error);
                                    setSyncfusionDocumentReady(true);
                                    setSyncfusionLoading(false);
                                }
                            }, 1000);
                        } catch (e: any) {
                            console.error('❌ Error loading Syncfusion document:', e);
                            setSyncfusionLoading(false);
                            setSyncfusionDocumentReady(false);
                            setSnackbar({
                                open: true,
                                message: e?.message || 'Không thể mở tài liệu trong Syncfusion',
                                severity: 'error'
                            });
                            // Nếu lỗi, giữ nguyên chế độ syncfusion
                            console.warn('Error loading Syncfusion document, keeping syncfusion mode');
                        }
                    }
                }
                // ----- Chế độ xem HTML -----
                // (Giữ nguyên logic HTML của bạn vì nó đã hoạt động tốt với selectedHtmlUrl)
            } catch (err) {
                console.error('Lỗi khi render preview mẫu:', err);
                const message = err instanceof Error ? err.message : 'Lỗi không xác định';
                setSnackbar({ open: true, message, severity: 'error' });
            }
        };

        renderSelectedTemplate();
        // Cần thêm state.generatedBlob vào dependency array vì chúng ta sử dụng nó để kiểm tra
        // xem có phải là working document từ IndexedDB không
    }, [state.selectedTemplatePath, state.uploadedTemplateUrl, previewMode, state.selectedHtmlUrl, state.generatedBlob]);
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
                // Keep syncfusion mode for consistency
            } catch (e) {
                console.warn('Không thể tải HTML preview, keeping syncfusion mode');
                setHtmlRaw('');
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
                    console.log('🔌 Received data from mobile app via socket:', data);
                    // Convert mobile socket data to standard ProcessingData format
                    const processingData = convertScannedInfoToProcessingData(data);
                    console.log('🔄 Converted mobile data to ProcessingData:', processingData);

                    // Cập nhật state để hiển thị nguồn dữ liệu là socket
                    setState(prev => ({
                        ...prev,
                        dataSource: 'socket',
                        error: null,
                        generatedBlob: null
                    }));

                    // Debug: Kiểm tra các điều kiện để chèn vào Syncfusion
                    console.log('🔍 Debug socket data insertion conditions:');
                    console.log('  - previewMode:', previewMode);
                    console.log('  - syncfusionDocumentReady:', syncfusionDocumentReady);
                    console.log('  - sfContainerRef.current:', !!sfContainerRef.current);
                    console.log('  - documentEditor:', !!sfContainerRef.current?.documentEditor);

                    // Kiểm tra xem có đang dùng Syncfusion editor không
                    if (
                        previewMode === 'syncfusion' &&
                        syncfusionDocumentReady &&
                        sfContainerRef.current?.documentEditor
                    ) {
                        console.log('🔄 Inserting socket data into Syncfusion editor...');

                        // Chèn dữ liệu vào Syncfusion editor
                        const success = await applyDataToSyncfusion(processingData);

                        if (success) {
                            setSnackbar({
                                open: true,
                                message: 'Đã chèn dữ liệu từ Mobile App vào Syncfusion Editor!',
                                severity: 'success'
                            });
                        } else {
                            setSnackbar({
                                open: true,
                                message: 'Lỗi khi chèn dữ liệu vào Syncfusion Editor',
                                severity: 'error'
                            });
                        }
                    } else {
                        console.log('🔄 Creating new document with socket data...');

                        // Fallback: Tạo document mới nếu không có editor nào đang mở
                        const blob = await processDocument(currentTemplatePath, processingData);

                        setState(prev => ({
                            ...prev,
                            generatedBlob: blob
                        }));

                        setSnackbar({
                            open: true,
                            message: 'Đã tạo tài liệu từ dữ liệu Mobile App!',
                            severity: 'success'
                        });
                    }
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Lỗi không xác định.';
                    setState(prev => ({ ...prev, error: errorMessage }));

                    setSnackbar({
                        open: true,
                        message: `Lỗi xử lý dữ liệu từ Mobile App: ${errorMessage}`,
                        severity: 'error'
                    });

                    console.error('❌ Error processing socket data:', error);
                }
            }
        };

        on('data_received', handleDataReceived);

        return () => {
            off('data_received', handleDataReceived);
        };
    }, [
        on,
        off,
        processDocument,
        previewMode,
        syncfusionDocumentReady,
        applyDataToSyncfusion,
        setSnackbar
    ]);

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
        (record: LocalEnhancedTTHCRecord) => {
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

            // Ghi nhớ mã thủ tục cho các thao tác sau (khi thay mẫu bằng blob URL)
            currentCodeRef.current = record.maTTHC || '';

            setState(prev => ({
                ...prev,
                selectedTemplatePath: templatePath,
                selectedHtmlUrl: htmlUrl,
                generatedBlob: null,
                error: null
            }));
            resetProcessing();
            setShowFilters(false);
            setShowTemplateModal(false);

            setSnackbar({
                open: true,
                message: `Đã chọn mẫu: ${record.tenTTHC}`,
                severity: 'info'
            });
        },
        [resetProcessing]
    );

    const handleTemplateSelect = useCallback(
        (record: LocalEnhancedTTHCRecord) => {
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

            // Ghi nhớ mã thủ tục hiện tại
            currentCodeRef.current = record.maTTHC || '';

            setState(prev => ({
                ...prev,
                selectedTemplatePath: templatePath,
                selectedHtmlUrl: htmlUrl,
                generatedBlob: null,
                error: null
            }));
            resetProcessing();
            setShowFilters(false);
            setShowTemplateModal(false);

            setSnackbar({
                open: true,
                message: `Đã chọn mẫu: ${record.tenTTHC}`,
                severity: 'info'
            });
        },
        [resetProcessing]
    );

    const handleOpenProcessingModal = useCallback((record: LocalEnhancedTTHCRecord) => {
        if (!record.isTemplateAvailable) {
            setSnackbar({
                open: true,
                message: `Mẫu đơn "${record.tenFile || extractTemplateName(record.mauDon)}" chưa có sẵn trong hệ thống`,
                severity: 'warning'
            });
            return;
        }

        setSelectedRecord(record);
        setShowProcessingModal(true);
    }, []);

    // const handleDownload = useCallback(() => {
    //     if (state.generatedBlob) {
    //         const baseName = displayTemplateName || 'file';
    //         const timestamp = Date.now();
    //         const currentCode = extractCurrentCode();
    //         const newName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
    //         saveAs(state.generatedBlob, newName);

    //         setSnackbar({
    //             open: true,
    //             message: 'File đã được tải xuống thành công!',
    //             severity: 'success'
    //         });
    //     }
    // }, [state.generatedBlob, displayTemplateName, extractCurrentCode]);

    const handlePrintPreview = useCallback(() => {
       
         if (previewMode === 'syncfusion') {
            try {
                sfContainerRef.current?.documentEditor?.print();
            } catch {}
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
            // if (previewMode === 'docx') {
            //     sourceElement = previewContainerRef.current;
            // } else {
            //     const doc = htmlIframeRef.current?.contentDocument;
            //     sourceElement = (doc?.body || null) as unknown as HTMLElement | null;
            // }
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
            // Chuẩn hóa key: nếu key ở dạng {field} -> chuyển thành field để khớp logic đ  iền
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
        // Xóa mã thủ tục đã ghi nhớ để tránh lưu nhầm
        currentCodeRef.current = '';
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

    // const renderFilter = () => (
    //     <Card>
    //         <CardContent>
    //             <Typography variant="h6" sx={{ mb: 2 }}>
    //                 Danh sách thủ tục hành chính
    //             </Typography>

    //             {/* Filter Controls */}
    //             <Box sx={{ mb: 3 }}>
    //                 <Box
    //                     sx={{
    //                         display: 'grid',
    //                         gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
    //                         gap: 2,
    //                         mb: 2
    //                     }}
    //                 >
    //                     <FormControl fullWidth size="small">
    //                         <InputLabel>Lĩnh vực</InputLabel>
    //                         <Select
    //                             value={filters.linhVuc}
    //                             label="Lĩnh vực"
    //                             onChange={e => handleFilterChange('linhVuc', e.target.value)}
    //                         >
    //                             <MenuItem value="">Tất cả</MenuItem>
    //                             {filterOptions.linhVuc.map(item => (
    //                                 <MenuItem key={item} value={item}>
    //                                     {item}
    //                                 </MenuItem>
    //                             ))}
    //                         </Select>
    //                     </FormControl>

    //                     <FormControl fullWidth size="small">
    //                         <InputLabel>Thủ tục</InputLabel>
    //                         <Select
    //                             value={filters.thuTuc}
    //                             label="Thủ tục"
    //                             onChange={e => handleFilterChange('thuTuc', e.target.value)}
    //                             disabled={!filters.linhVuc}
    //                         >
    //                             <MenuItem value="">Tất cả</MenuItem>
    //                             {availableThuTuc.map(item => (
    //                                 <MenuItem key={item} value={item}>
    //                                     {item}
    //                                 </MenuItem>
    //                             ))}
    //                         </Select>
    //                     </FormControl>

    //                     <FormControl fullWidth size="small">
    //                         <InputLabel>Trạng thái mẫu</InputLabel>
    //                         <Select
    //                             value={filters.availability}
    //                             label="Trạng thái mẫu"
    //                             onChange={e => handleFilterChange('availability', e.target.value)}
    //                         >
    //                             <MenuItem value="all">Tất cả</MenuItem>
    //                             <MenuItem value="available">Có sẵn mẫu</MenuItem>
    //                             <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
    //                         </Select>
    //                     </FormControl>
    //                 </Box>

    //                 <Button variant="outlined" onClick={handleClearFilters} size="small">
    //                     Xóa bộ lọc
    //                 </Button>
    //             </Box>

    //             {/* Summary and Template List */}
    //             {csvLoading ? (
    //                 <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
    //                     <CircularProgress />
    //                 </Box>
    //             ) : (
    //                 <Box>
    //                     <Box
    //                         sx={{
    //                             mb: 2,
    //                             display: 'flex',
    //                             justifyContent: 'space-between',
    //                             alignItems: 'center'
    //                         }}
    //                     >
    //                         <Typography variant="body2" color="text.secondary">
    //                             Tìm thấy {filteredRecords.length} thủ tục hành chính
    //                         </Typography>
    //                         <Box sx={{ display: 'flex', gap: 1 }}>
    //                             <Chip
    //                                 icon={<CheckCircleIcon />}
    //                                 label={`${filteredRecords.filter(r => r.isTemplateAvailable).length} có mẫu`}
    //                                 color="success"
    //                                 size="small"
    //                                 variant="outlined"
    //                             />
    //                             <Chip
    //                                 icon={<WarningIcon />}
    //                                 label={`${filteredRecords.filter(r => !r.isTemplateAvailable).length} chưa có`}
    //                                 color="warning"
    //                                 size="small"
    //                                 variant="outlined"
    //                             />
    //                         </Box>
    //                     </Box>

    //                     <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
    //                         {filteredRecords.slice(0, 10).map((record, index) => (
    //                             <Paper
    //                                 key={index}
    //                                 variant="outlined"
    //                                 sx={{
    //                                     p: 2,
    //                                     mb: 2,
    //                                     borderRadius: 2,
    //                                     border: '1px solid #e0e0e0',
    //                                     '&:hover': {
    //                                         boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    //                                         borderColor: record.isTemplateAvailable
    //                                             ? '#1976d2'
    //                                             : '#ed6c02'
    //                                     },
    //                                     transition: 'all 0.2s ease-in-out',
    //                                     opacity: record.isTemplateAvailable ? 1 : 0.7
    //                                 }}
    //                             >
    //                                 <Box
    //                                     sx={{
    //                                         display: 'flex',
    //                                         justifyContent: 'space-between',
    //                                         alignItems: 'flex-start'
    //                                     }}
    //                                 >
    //                                     <Box sx={{ flex: 1 }}>
    //                                         <Typography
    //                                             variant="subtitle1"
    //                                             color="primary"
    //                                             sx={{ fontWeight: 'bold', mb: 1 }}
    //                                         >
    //                                             {record.maTTHC} - {record.tenTTHC}
    //                                         </Typography>
    //                                         <Typography
    //                                             variant="body2"
    //                                             color="text.secondary"
    //                                             sx={{ mb: 1 }}
    //                                         >
    //                                             Lĩnh vực: {record.linhVuc}
    //                                         </Typography>
    //                                         <Typography variant="body2" color="text.secondary">
    //                                             Đối tượng: {record.doiTuong || 'Công dân Việt Nam'}
    //                                         </Typography>
    //                                     </Box>

    //                                     <Box
    //                                         sx={{
    //                                             display: 'flex',
    //                                             flexDirection: 'column',
    //                                             gap: 1,
    //                                             alignItems: 'flex-end'
    //                                         }}
    //                                     >
    //                                         {record.isTemplateAvailable ? (
    //                                             <>
    //                                                 <Chip
    //                                                     label="Có sẵn mẫu"
    //                                                     color="success"
    //                                                     size="small"
    //                                                     icon={<CheckCircleIcon />}
    //                                                 />
    //                                                 <Button
    //                                                     variant="contained"
    //                                                     color="primary"
    //                                                     size="small"
    //                                                     onClick={() =>
    //                                                         handleTemplateSelect(record)
    //                                                     }
    //                                                 >
    //                                                     Chọn mẫu này
    //                                                 </Button>
    //                                                 {(() => {
    //                                                     const docs = workingDocsListByCode[record.maTTHC] || [];
    //                                                     return docs.slice(0, 3).map(doc => (
    //                                                         <Button
    //                                                             key={doc.id || doc.updatedAt}
    //                                                             variant="text"
    //                                                             color="secondary"
    //                                                             size="small"
    //                                                             onClick={() => handleLoadWorkingFromDb(record.maTTHC, record, doc.id || undefined)}
    //                                                             title={new Date(doc.updatedAt).toLocaleString()}
    //                                                         >
    //                                                             {doc.fileName}
    //                                                         </Button>
    //                                                     ));
    //                                                 })()}
    //                                             </>
    //                                         ) : (
    //                                             <>
    //                                                 <Chip
    //                                                     label="Chưa có mẫu"
    //                                                     color="warning"
    //                                                     size="small"
    //                                                     icon={<WarningIcon />}
    //                                                 />
    //                                                 <Button
    //                                                     variant="outlined"
    //                                                     color="warning"
    //                                                     size="small"
    //                                                     disabled
    //                                                 >
    //                                                     Không khả dụng
    //                                                 </Button>
    //                                             </>
    //                                         )}
    //                                     </Box>
    //                                 </Box>
    //                             </Paper>
    //                         ))}

    //                         {filteredRecords.length > 10 && (
    //                             <Paper sx={{ p: 2, textAlign: 'center', mt: 2 }}>
    //                                 <Typography
    //                                     variant="body2"
    //                                     color="text.secondary"
    //                                     sx={{ mb: 2 }}
    //                                 >
    //                                     Hiển thị 10 / {filteredRecords.length} thủ tục.
    //                                 </Typography>
    //                                 <Button
    //                                     variant="outlined"
    //                                     onClick={() => setShowTemplateModal(true)}
    //                                 >
    //                                     Xem tất cả ({filteredRecords.length})
    //                                 </Button>
    //                             </Paper>
    //                         )}

    //                         {filteredRecords.length === 0 && (
    //                             <Paper sx={{ p: 4, textAlign: 'center' }}>
    //                                 <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
    //                                     Không tìm thấy thủ tục nào
    //                                 </Typography>
    //                                 <Typography variant="body2" color="text.secondary">
    //                                     Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp
    //                                 </Typography>
    //                             </Paper>
    //                         )}
    //                     </Box>
    //                 </Box>
    //             )}
    //         </CardContent>
    //     </Card>
    // );

    const renderFilterControls = () => (
        <Card>
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                    }}
                >
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
                        <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
                            {filteredRecords.map((record, index) => (
                                <Paper
                                    key={index}
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        mb: 2,
                                        borderRadius: 2,
                                        border: '1px solid #e0e0e0',
                                        '&:hover': {
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                            borderColor: '#1976d2'
                                        },
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                >
                                    {/* Header with Star and Code */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 2,
                                            mb: 2
                                        }}
                                    >
                                        <Box sx={{ fontSize: '24px', color: '#ffc107', mt: 0.5 }}>
                                            ⭐
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 1,
                                                    mb: 1
                                                }}
                                            >
                                                <Typography
                                                    variant="h6"
                                                    fontWeight={600}
                                                    color="primary"
                                                >
                                                    Mã thủ tục: {record.maTTHC}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Cấp thực hiện: {record.capThucHien || 'Cấp Xã'}
                                                </Typography>
                                            </Box>

                                            {/* Administrative Field */}
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 2 }}
                                            >
                                                Lĩnh vực: {record.linhVuc}
                                            </Typography>

                                            {/* Procedure Name */}
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                sx={{ mb: 1 }}
                                            >
                                                Tên thủ tục
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 2 }}>
                                                {record.tenTTHC}
                                            </Typography>

                                            {/* Target Users */}
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                sx={{ mb: 1 }}
                                            >
                                                Đối tượng thực hiện
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 2 }}>
                                                {record.doiTuong || 'Công dân Việt Nam'}
                                            </Typography>

                                            {/* Template Documents Section */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    gap: 1
                                                }}
                                            >
                                                <Typography
                                                    variant="h6"
                                                    fontWeight={500}
                                                    sx={{ mb: 1 }}
                                                >
                                                    Danh sách mẫu đơn / tờ khai
                                                </Typography>

                                                {record.isTemplateAvailable ? (
                                                    <Box sx={{ mb: 3 }}>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ mb: 2 }}
                                                        >
                                                            {record.tenFile
                                                                ? extractTemplateName(record.mauDon)
                                                                : 'Mẫu đơn có sẵn'}
                                                        </Typography>
                                                        <Box
                                                            sx={{ display: 'flex', gap: 1, mb: 2 }}
                                                        >
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                startIcon={<span>⬇</span>}
                                                                sx={{ textTransform: 'none' }}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    if (
                                                                        record.isTemplateAvailable
                                                                    ) {
                                                                        handleTemplateFromCSV(
                                                                            record
                                                                        );
                                                                        // Wait a bit for template to be selected then download
                                                                        setTimeout(() => {
                                                                            handleDownloadOriginalTemplate();
                                                                        }, 100);
                                                                    }
                                                                }}
                                                            >
                                                                Tải
                                                            </Button>

                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                sx={{ textTransform: 'none' }}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    handleTemplateFromCSV(record);
                                                                }}
                                                            >
                                                                Tạo trực tuyến
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mb: 3, fontStyle: 'italic' }}
                                                    >
                                                        (Chưa có mẫu đơn/tờ khai trong dữ liệu)
                                                    </Typography>
                                                )}
                                            </Box>

                                            {/* Details Button */}
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                sx={{ textTransform: 'none' }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    // Handle view details
                                                }}
                                            >
                                                Xem chi tiết
                                            </Button>
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
        <Card
            sx={{ mb: 3 }}
            style={{
                display: state.dataSource === 'socket' ? 'none' : 'block'
            }}
        >
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
                            Đang chờ dữ liệu NTS DocumentAI...
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
                // Handle working:// URLs from IndexedDB
                if (url.startsWith('working://')) {
                    return url.replace('working://', '').trim();
                }
                
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
        if (fromHtml) return fromHtml;
        // Cuối cùng, dùng mã đã ghi nhớ khi người dùng tải mẫu mới (blob URL)
        return currentCodeRef.current || '';
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

            {/* <Button
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
            </Button> */}
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
        
        // Check if it's a working document from IndexedDB
        if (state.selectedTemplatePath.startsWith('working://')) {
            if (state.generatedBlob) {
                // Use the blob directly for working documents
                const baseName = (state.uploadedTemplateName || selectedTemplateNameFromPath || 'mau')
                    .replace(/\s/g, '_')
                    .replace(/\.(docx?|DOCX?)$/, '');
                saveAs(state.generatedBlob, `${baseName}.docx`);
                setSnackbar({ open: true, message: 'Đã tải xuống tài liệu đã lưu', severity: 'success' });
            } else {
                setSnackbar({ open: true, message: 'Không thể tải xuống tài liệu đã lưu', severity: 'error' });
            }
            return;
        }
        
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
    }, [state.selectedTemplatePath, state.uploadedTemplateName, selectedTemplateNameFromPath, state.generatedBlob]);

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

    // Upload a DOCX file and replace the current working document
    const handleUploadReplaceDocument = useCallback(
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

            // Create object URL for the new file
            const url = URL.createObjectURL(file);
            
            // Update state to replace current working document
            setState(prev => ({
                ...prev,
                uploadedTemplateUrl: url,
                uploadedTemplateName: file.name,
                selectedTemplatePath: url,
                generatedBlob: null, // Clear any generated content
                error: null
            }));

            // Reset processing state
            resetProcessing();
            
            // Clear any existing preview content
            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                // Load the new document into Syncfusion editor
                sfContainerRef.current.documentEditor.open(file);
            }

            setSnackbar({ 
                open: true, 
                message: `Đã thay thế tài liệu hiện tại bằng "${file.name}"`, 
                severity: 'success' 
            });
        },
        [resetProcessing, previewMode]
    );

    const saveWorkingDocToDb = useCallback(
        async (maTTHC: string, blob: Blob, fileName: string, mimeType: string) => {
            try {
                if (!maTTHC) {
                    console.error('❌ maTTHC is required to save working document');
                    return;
                }
                
                // Check if document already exists for this maTTHC
                const byUpdated = await db.workingDocumentsV2
                    .where('maTTHC')
                    .equals(maTTHC)
                    .sortBy('updatedAt');
                const existingDoc = byUpdated[byUpdated.length - 1];
                
                if (existingDoc) {
                    // Update existing document
                    const updatedRecord: WorkingDocument = {
                        ...existingDoc,
                        fileName,
                        mimeType,
                        blob,
                        updatedAt: Date.now()
                    };
                    
                    if (existingDoc.id != null) {
                        await db.workingDocumentsV2.update(existingDoc.id, updatedRecord);
                    } else {
                        await db.workingDocumentsV2.add(updatedRecord);
                    }
                    
                    // Update local state
                    setWorkingDocsByCode(prev => ({ ...prev, [maTTHC]: updatedRecord }));
                    setWorkingDocsListByCode(prev => ({
                        ...prev,
                        [maTTHC]: [updatedRecord, ...(prev[maTTHC] || []).filter(d => d.id !== (existingDoc?.id))]
                    }));
                    
                    console.log(`✅ Successfully updated existing working document in IndexedDB:`, {
                        maTTHC,
                        fileName,
                        mimeType,
                        blobSize: blob.size,
                        updatedAt: new Date(updatedRecord.updatedAt).toISOString()
                    });
                } else {
                    // Create new document
                    const newRecord: WorkingDocument = {
                        maTTHC,
                        fileName,
                        mimeType,
                        blob,
                        updatedAt: Date.now()
                    };
                    
                    await db.workingDocumentsV2.add(newRecord);
                    
                    // Update local state
                    setWorkingDocsByCode(prev => ({ ...prev, [maTTHC]: newRecord }));
                    setWorkingDocsListByCode(prev => ({
                        ...prev,
                        [maTTHC]: [newRecord, ...(prev[maTTHC] || [])]
                    }));
                    
                    console.log(`✅ Successfully created new working document in IndexedDB:`, {
                        maTTHC,
                        fileName,
                        mimeType,
                        blobSize: blob.size,
                        updatedAt: new Date(newRecord.updatedAt).toISOString()
                    });
                }
            } catch (e) {
                console.error('❌ Failed to save working document to IndexedDB:', e);
                throw e; // Re-throw to let caller handle the error
            }
        },
        []
    );

    // Save or update current working document without downloading
    const handleSaveWorkingDocument = useCallback(async () => {
        try {
            const currentCode = extractCurrentCode();
            if (!currentCode) {
                setSnackbar({
                    open: true,
                    message: 'Không thể xác định mã thủ tục hành chính',
                    severity: 'warning'
                });
                return;
            }

            // Determine current content to save
            let blob: Blob | null = null;
            let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                blob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
            } else if (state.generatedBlob) {
                blob = state.generatedBlob;
                mimeType = state.generatedBlob.type || mimeType;
            } else if (state.uploadedTemplateUrl) {
                const response = await fetch(state.uploadedTemplateUrl);
                blob = await response.blob();
                mimeType = blob.type || mimeType;
            } else if (state.selectedTemplatePath) {
                const response = await fetch(state.selectedTemplatePath);
                blob = await response.blob();
                mimeType = blob.type || mimeType;
            }

            if (!blob) {
                setSnackbar({
                    open: true,
                    message: 'Không có nội dung để lưu',
                    severity: 'warning'
                });
                return;
            }

            // Determine whether to create a new entry or update the current working doc
            const isWorkingContext = !!state.selectedTemplatePath && state.selectedTemplatePath.startsWith('working://');
            const hasUploadedReplacement = !!state.uploadedTemplateUrl;
            // Create new if an uploaded replacement exists; else, if we have a current working doc id, update that one; otherwise create new
            const shouldCreateNew = hasUploadedReplacement || !isWorkingContext || currentWorkingDocIdRef.current == null;

            const byUpdated = await db.workingDocumentsV2
                .where('maTTHC')
                .equals(currentCode)
                .sortBy('updatedAt');
            const existingDoc = byUpdated[byUpdated.length - 1];

            let fileNameToSave: string;
            if (shouldCreateNew) {
                const baseName = state.uploadedTemplateName || (displayTemplateName ? `${displayTemplateName}.docx` : 'file.docx');
                const safeBase = /\.docx$/i.test(baseName) ? baseName : `${baseName}.docx`;
                // make name unique by appending timestamp to avoid collisions
                const ts = Date.now();
                const nameNoExt = safeBase.replace(/\.docx$/i, '');
                fileNameToSave = `${nameNoExt}_${ts}.docx`;
                await db.workingDocumentsV2.add({
                    maTTHC: currentCode,
                    fileName: fileNameToSave,
                    mimeType,
                    blob,
                    updatedAt: Date.now()
                });
            } else {
                // Update currently opened working doc (latest for this code)
                const baseName = existingDoc?.fileName || (displayTemplateName ? `${displayTemplateName}.docx` : 'file.docx');
                fileNameToSave = /\.docx$/i.test(baseName) ? baseName : `${baseName}.docx`;
                const updatedRecord: WorkingDocument = {
                    ...(existingDoc || { maTTHC: currentCode }),
                    fileName: fileNameToSave,
                    mimeType,
                    blob,
                    updatedAt: Date.now()
                };
                const targetId = currentWorkingDocIdRef.current ?? existingDoc?.id ?? null;
                if (targetId != null) {
                    await db.workingDocumentsV2.update(targetId, {
                        fileName: updatedRecord.fileName,
                        mimeType: updatedRecord.mimeType,
                        blob: updatedRecord.blob,
                        updatedAt: updatedRecord.updatedAt
                    });
                } else {
                    const newId = await db.workingDocumentsV2.add(updatedRecord);
                    currentWorkingDocIdRef.current = Number(newId) || null;
                }
            }

            await refreshWorkingDocuments();

            // Switch to working document context and show in editor
            setState(prev => ({
                ...prev,
                selectedTemplatePath: `working://${currentCode}`,
                selectedHtmlUrl: null,
                generatedBlob: blob
            }));
            currentCodeRef.current = currentCode;

            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                sfContainerRef.current.documentEditor.open(blob);
            }

            // Clear uploaded replacement marker after creating a new entry
            if (hasUploadedReplacement) {
                setState(prev => ({ ...prev, uploadedTemplateUrl: null, uploadedTemplateName: null }));
            }

            setSnackbar({
                open: true,
                message: shouldCreateNew ? 'Đã lưu tài liệu mới' : 'Đã cập nhật tài liệu đang làm việc',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error saving working document:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi lưu tài liệu',
                severity: 'error'
            });
        }
    }, [extractCurrentCode, previewMode, state.generatedBlob, state.uploadedTemplateUrl, state.uploadedTemplateName, state.selectedTemplatePath, displayTemplateName, saveWorkingDocToDb, refreshWorkingDocuments]);

    // Download the current working document (filled document, custom template, or original template)
    const handleDownloadWorkingDocument = useCallback(async () => {
        try {
            // Get the current maTTHC from the selected template path or URL
            const currentCode = extractCurrentCode();
            console.log('🔍 Debug extractCurrentCode:', {
                selectedTemplatePath: state.selectedTemplatePath,
                selectedHtmlUrl: state.selectedHtmlUrl,
                extractedCode: currentCode
            });
            
            if (!currentCode) {
                setSnackbar({
                    open: true,
                    message: 'Không thể xác định mã thủ tục hành chính',
                    severity: 'warning'
                });
                return;
            }

            let blob: Blob;
            let fileName: string;
            let mimeType: string;

            // Priority 1: If Syncfusion editor is active and ready, save the current edited content
            if (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) {
                const baseName = displayTemplateName || 'file';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                blob = await sfContainerRef.current.documentEditor.saveAsBlob('Docx');
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                
                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);
                
                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();
                
                // Download the file
                saveAs(blob, fileName);
                
                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống tài liệu đã chỉnh sửa: ${fileName}`,
                    severity: 'success'
                });
                return;
            }


            // Priority 3: Save the filled document if available
            if (state.generatedBlob) {
                const baseName = displayTemplateName || 'file';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                blob = state.generatedBlob;
                mimeType = state.generatedBlob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                
                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);
                
                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();
                
                // Download the file
                saveAs(blob, fileName);
                
                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống tài liệu đã điền: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // Priority 4: Save the custom uploaded template if available
            if (state.uploadedTemplateUrl) {
                const response = await fetch(state.uploadedTemplateUrl);
                blob = await response.blob();
                const baseName = state.uploadedTemplateName || 'mau_da_chinh';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                mimeType = blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                
                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);
                
                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();
                
                // Download the file
                saveAs(blob, fileName);
                
                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống mẫu đã chỉnh: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // Priority 5: Save the original template if available
            if (state.selectedTemplatePath) {
                // Check if it's a working document from IndexedDB
                if (state.selectedTemplatePath.startsWith('working://')) {
                    if (state.generatedBlob) {
                        // Use the blob directly for working documents
                        blob = state.generatedBlob;
                        const baseName = displayTemplateName || 'mau_goc';
                        const timestamp = Date.now();
                        fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                        mimeType = blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        
                        // Save to IndexedDB
                        await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);
                        
                        // Refresh working documents from IndexedDB
                        await refreshWorkingDocuments();
                        
                        // Download the file
                        saveAs(blob, fileName);
                        
                        setSnackbar({
                            open: true,
                            message: `Đã lưu và tải xuống tài liệu đã lưu: ${fileName}`,
                            severity: 'success'
                        });
                        return;
                    } else {
                        setSnackbar({
                            open: true,
                            message: 'Không thể lưu tài liệu đã lưu',
                            severity: 'error'
                        });
                        return;
                    }
                }
                
                // For regular templates, fetch from URL
                const response = await fetch(state.selectedTemplatePath);
                blob = await response.blob();
                const baseName = displayTemplateName || 'mau_goc';
                const timestamp = Date.now();
                fileName = `${currentCode}_${baseName.replace(/\s/g, '_')}_${timestamp}.docx`;
                mimeType = blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                
                // Save to IndexedDB
                await saveWorkingDocToDb(currentCode, blob, fileName, mimeType);
                
                // Refresh working documents from IndexedDB
                await refreshWorkingDocuments();
                
                // Download the file
                saveAs(blob, fileName);
                
                setSnackbar({
                    open: true,
                    message: `Đã lưu và tải xuống mẫu gốc: ${fileName}`,
                    severity: 'success'
                });
                return;
            }

            // No document available
            setSnackbar({
                open: true,
                message: 'Không có tài liệu nào để lưu và tải xuống',
                severity: 'warning'
            });
        } catch (error) {
            console.error('Error saving and downloading document:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi lưu và tải xuống tài liệu',
                severity: 'error'
            });
        }
    }, [state.generatedBlob, state.uploadedTemplateUrl, state.uploadedTemplateName, state.selectedTemplatePath, displayTemplateName, previewMode, extractCurrentCode, saveWorkingDocToDb, refreshWorkingDocuments]);

    const handleLoadWorkingFromDb = useCallback(
        async (maTTHC: string, record: LocalEnhancedTTHCRecord, docId?: number) => {
            try {
                // First try to get from local state, then from IndexedDB
                let doc: WorkingDocument | undefined;
                if (docId != null) {
                    const found = await db.workingDocumentsV2.get(docId);
                    doc = found || undefined;
                } else {
                    doc = workingDocsByCode[maTTHC];
                    if (!doc) {
                        const list = await db.workingDocumentsV2.where('maTTHC').equals(maTTHC).sortBy('updatedAt');
                        doc = list[list.length - 1];
                    }
                }
                
                if (!doc) {
                    setSnackbar({
                        open: true,
                        message: 'Không tìm thấy tài liệu đã lưu cho thủ tục này',
                        severity: 'warning'
                    });
                    return;
                }

                // Set the selected record for context
                setSelectedRecord(record);

                // Ghi nhớ mã thủ tục để sử dụng cho các thao tác lưu tiếp theo
                currentCodeRef.current = maTTHC || '';
                currentWorkingDocIdRef.current = doc.id ?? null;

                // Create object URL for the blob
                const objectUrl = URL.createObjectURL(doc.blob);

                                    if (doc.mimeType === 'text/html') {
                        // For HTML files, set as HTML URL but keep syncfusion mode
                        setState(prev => ({
                            ...prev,
                            selectedTemplatePath: `working://${maTTHC}`,
                            selectedHtmlUrl: objectUrl,
                            generatedBlob: null,
                            error: null
                        }));
                        
                        // Keep syncfusion mode for consistency
                    } else {
                        // For DOCX and other binary files
                        setState(prev => ({
                            ...prev,
                            selectedTemplatePath: `working://${maTTHC}`,
                            selectedHtmlUrl: null,
                            generatedBlob: doc.blob,
                            error: null
                        }));
                        
                        // Load directly into Syncfusion editor
                        if (sfContainerRef.current?.documentEditor) {
                            sfContainerRef.current.documentEditor.open(doc.blob);
                        }
                    }

                // Reset processing state and close modals
                resetProcessing();
                setShowFilters(false);
                setShowTemplateModal(false);

                setSnackbar({
                    open: true,
                    message: `Đã mở tài liệu đã lưu: ${doc.fileName}`,
                    severity: 'success'
                });

                console.log(`✅ Loaded working document from IndexedDB: ${doc.fileName} for maTTHC: ${maTTHC}`);
            } catch (error) {
                console.error('Lỗi khi mở tài liệu đã lưu từ IndexedDB:', error);
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi mở tài liệu đã lưu',
                    severity: 'error'
                });
            }
        },
        [workingDocsByCode, previewMode, resetProcessing]
    );

    return (
        <Box sx={{ width: '100%' }}>
            {/* <Box
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
            </Box> */}

            {/* Data Source is configured in Info > Settings; read from localStorage */}

            {/* Data Input Section */}
            {/* {state.selectedTemplatePath && renderDataInputSection()} */}

            {/* Filter Controls */}
            {/* {!state.selectedTemplatePath && renderFilterControls()} */}
            {/* {renderFilter()} */}

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
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                                    Tải File gốc
                                </Button>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<UploadIcon />}
                                >
                                    Tải mẫu mới
                                    <input
                                        type="file"
                                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        hidden
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadReplaceDocument(file);
                                            // Reset input value to allow selecting the same file again
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<DownloadIcon />}
                                    onClick={handleDownloadWorkingDocument}
                                    disabled={!(state.generatedBlob || state.uploadedTemplateUrl || state.selectedTemplatePath || (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor))}
                                >
                                    TẢI MẪU ĐÃ TÙY CHỈNH
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveWorkingDocument}
                                    disabled={!(state.generatedBlob || state.uploadedTemplateUrl || state.selectedTemplatePath || (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor))}
                                >
                                    Lưu mẫu đã tùy chỉnh
                                </Button>
                            </Box>
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
                        {/* {previewMode === 'docx' && (
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
                    )} */}
                        {previewMode === 'syncfusion' && (
                            <div style={{ width: '100%', minHeight: '70vh', position: 'relative' }}>
                                {syncfusionLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 1000,
                                            flexDirection: 'column',
                                            gap: 2
                                        }}
                                    >
                                        <CircularProgress />
                                        <Typography variant="body2" color="text.secondary">
                                            Đang tải tài liệu...
                                        </Typography>
                                    </Box>
                                )}
                                {!syncfusionDocumentReady && !syncfusionLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            backgroundColor: 'rgba(245, 245, 245, 0.9)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 999,
                                            flexDirection: 'column',
                                            gap: 2
                                        }}
                                    >
                                        <InfoIcon color="info" sx={{ fontSize: 48 }} />
                                        <Typography variant="h6" color="text.secondary">
                                            Chọn template để bắt đầu
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Tài liệu sẽ được tải
                                        </Typography>
                                    </Box>
                                )}
                                <DocumentEditorContainerComponent
                                    id="sf-docx-editor-embedded"
                                    ref={sfContainerRef}
                                    serviceUrl={SYNCFUSION_SERVICE_URL}
                                    enableToolbar={true}
                                    height={'70vh'}
                                    style={{ display: 'block' }}
                                    toolbarMode={'Toolbar'}
                                    locale="vi-VN"
                                />

                                {/* Quick Insert Field Panel */}
                                {syncfusionDocumentReady && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            background:
                                                'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 2,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            p: 2,
                                            maxWidth: 280,
                                            zIndex: 1500
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                mb: 1.5,
                                                fontWeight: 'bold',
                                                color: 'primary.main',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}
                                        >
                                            <AddCircleOutlineIcon fontSize="small" />
                                            Chèn Field Nhanh
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {[
                                                {
                                                    label: 'Họ tên',
                                                    value: '{ho_ten}',
                                                    color: 'primary'
                                                },
                                                {
                                                    label: 'CCCD',
                                                    value: '{cccd}',
                                                    color: 'secondary'
                                                },
                                                {
                                                    label: 'CMND',
                                                    value: '{cmnd}',
                                                    color: 'secondary'
                                                },
                                                {
                                                    label: 'Ngày sinh',
                                                    value: '{ngay_sinh}',
                                                    color: 'info'
                                                },
                                                {
                                                    label: 'Giới tính',
                                                    value: '{gioi_tinh}',
                                                    color: 'info'
                                                },
                                                {
                                                    label: 'Địa chỉ',
                                                    value: '{noi_cu_tru}',
                                                    color: 'success'
                                                },
                                                {
                                                    label: 'Dân tộc',
                                                    value: '{dan_toc}',
                                                    color: 'warning'
                                                },
                                                {
                                                    label: 'Nơi cấp',
                                                    value: '{noi_cap}',
                                                    color: 'error'
                                                },
                                                {
                                                    label: 'Ngày cấp',
                                                    value: '{ngay_cap}',
                                                    color: 'error'
                                                },
                                                // Thêm fields từ mobile
                                                {
                                                    label: 'Số CCCD',
                                                    value: '{so_cccd}',
                                                    color: 'secondary'
                                                },
                                                {
                                                    label: 'Số CMND',
                                                    value: '{so_cmnd}',
                                                    color: 'secondary'
                                                },
                                                {
                                                    label: 'Ngày S',
                                                    value: '{ns_ngay}',
                                                    color: 'info'
                                                },
                                                {
                                                    label: 'Tháng S',
                                                    value: '{ns_thang}',
                                                    color: 'info'
                                                },
                                                {
                                                    label: 'Năm S',
                                                    value: '{ns_nam}',
                                                    color: 'info'
                                                },
                                                {
                                                    label: 'Ngày C',
                                                    value: '{nc_ngay}',
                                                    color: 'error'
                                                },
                                                {
                                                    label: 'Tháng C',
                                                    value: '{nc_thang}',
                                                    color: 'error'
                                                },
                                                {
                                                    label: 'Năm C',
                                                    value: '{nc_nam}',
                                                    color: 'error'
                                                }
                                            ].map((field, index) => (
                                                <Button
                                                    key={field.value}
                                                    size="small"
                                                    variant="outlined"
                                                    color={field.color as any}
                                                    sx={{
                                                        fontSize: '11px',
                                                        py: 0.5,
                                                        px: 1,
                                                        textTransform: 'none',
                                                        borderRadius: 1,
                                                        flex: '1 1 calc(50% - 4px)',
                                                        minWidth: '90px',
                                                        '&:hover': {
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: 2
                                                        },
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() =>
                                                        insertFieldIntoSyncfusion(field.value)
                                                    }
                                                    title={`Chèn ${field.value} vào vị trí con trô`}
                                                >
                                                    {field.label}
                                                </Button>
                                            ))}
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                mt: 1.5,
                                                display: 'block',
                                                textAlign: 'center',
                                                color: 'text.secondary',
                                                fontStyle: 'italic'
                                            }}
                                        >
                                            💡 Click để chèn field vào vị trí con trỏ
                                        </Typography>
                                        {/* Quick input box (separate fields) */}
                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Nhập nhanh giá trị (tùy chọn)
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: 1
                                                }}
                                            >
                                                {quickInputFields.map(f => (
                                                    <TextField
                                                        key={`input-${f.key}`}
                                                        size="small"
                                                        label={f.label}
                                                        placeholder={f.placeholder || `{${f.key}}`}
                                                        value={quickInputValues[f.key] || ''}
                                                        onChange={e =>
                                                            setQuickInputValues(prev => ({
                                                                ...prev,
                                                                [f.key]: e.target.value
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <Button size="small" color="inherit" onClick={handleClearQuickInputs}>
                                                    Xóa
                                                </Button>
                                                <Button size="small" variant="contained" onClick={handleApplyQuickInputs}>
                                                    Áp dụng
                                                </Button>
                                            </Box>
                                        </Box>
                                        
                                    </Box>
                                )}
                            </div>
                        )}
                    </Paper>
                </Paper>
            ) : (
                <Paper sx={{ p: 3, mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        Chọn mẫu đơn từ danh sách thủ tục hành chính
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Chọn mẫu đơn phù hợp từ danh sách thủ tục hành chính
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => setShowTemplateModal(true)}
                        sx={{ minWidth: 200 }}
                    >
                        Chọn mẫu đơn
                    </Button>
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
                    {/* <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                        <Button
                            size="small"
                            startIcon={<GetAppIcon />}
                            onClick={handleDownloadOriginalTemplate}
                        >
                            Tải mẫu gốc
                        </Button>
                        <Button 
                            size="small" 
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadWorkingDocument}
                            disabled={!(state.generatedBlob || state.uploadedTemplateUrl || state.selectedTemplatePath || (previewMode === 'syncfusion' && sfContainerRef.current?.documentEditor) || (previewMode === 'html' && htmlIframeRef.current?.contentDocument))}
                        >
                            Tải mẫu đã chỉnh
                        </Button>
                        <Button
                            component="label"
                            size="small"
                            startIcon={<UploadIcon />}
                            variant="outlined"
                        >
                            Thay thế tài liệu
                            <input
                                type="file"
                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                hidden
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadReplaceDocument(file);
                                    // Reset input value to allow selecting the same file again
                                    e.target.value = '';
                                }}
                            />
                        </Button>
                    </Box> */}

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

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                open={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onTemplateSelect={record =>
                    handleTemplateFromCSV(record as LocalEnhancedTTHCRecord)
                }
                csvLoading={csvLoading}
                filteredRecords={filteredRecords}
                filters={filters}
                filterOptions={filterOptions}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                savedDocsByCode={Object.fromEntries(
                    Object.entries(workingDocsByCode)
                        .filter(([, v]) => !!v)
                        .map(([k, v]) => [k, (v as WorkingDocument).fileName])
                )}
                onLoadSaved={rec => handleLoadWorkingFromDb(rec.maTTHC, rec as LocalEnhancedTTHCRecord)}
            />

            {/* Processing Modal */}
            <ProcessingModal
                open={showProcessingModal}
                onClose={() => setShowProcessingModal(false)}
                templateName={selectedRecord?.tenTTHC || ''}
                templateCode={selectedRecord?.maTTHC || ''}
            />
        </Box>
    );
}

export const Route = createLazyFileRoute('/procedures/')({
    component: ProceduresComponent
});
