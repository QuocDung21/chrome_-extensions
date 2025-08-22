import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// --- THƯ VIỆN ---
import { Socket, io } from 'socket.io-client';

// --- ICON ---

import {
    AddCircleOutline as AddCircleOutlineIcon,
    Badge as BadgeIcon,
    CalendarToday as CalendarTodayIcon,
    CheckCircle as CheckCircleIcon,
    Close,
    Close as CloseIcon,
    Download,
    Edit as EditIcon,
    EventAvailable as EventAvailableIcon,
    Event as EventIcon,
    Home as HomeIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Star,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import AdfScannerIcon from '@mui/icons-material/AdfScanner';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Snackbar,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import Divider from '@mui/material/Divider';
// --- SYNCFUSION WORD EDITOR ---
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import {
    DocumentEditorComponent,
    DocumentEditorContainerComponent,
    Print,
    Ribbon,
    SfdtExport,
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute, useNavigate, useRouter } from '@tanstack/react-router';

import { WorkingDocument, db } from '@/admin/db/db';
import { linhVucRepository } from '@/admin/repository/LinhVucRepository';
import { LinhVuc, linhVucApiService } from '@/admin/services/linhVucService';
import { formatDDMMYYYY, getCurrentDateParts } from '@/admin/utils/formatDate';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon, Print);
// --- CẤU HÌNH ---
const SOCKET_URL = 'http://103.162.21.146:5003';
const SYNCFUSION_SERVICE_URL =
    'https://services.syncfusion.com/react/production/api/documenteditor/';
const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY = 3000;
// --- TYPE DEFINITIONS ---
interface ProcessingData {
    [key: string]: any;
}
interface MauDon {
    tenGiayTo: string | null;
    tenFile: string;
    duongDan: string;
    // Optional properties for IndexedDB support
    isFromIndexedDB?: boolean;
    workingDocument?: WorkingDocument;
}
interface TTHCRecord {
    stt: number;
    maTTHC: string;
    tenTTHC: string;
    qdCongBo: string;
    doiTuong: string;
    linhVuc: string;
    coQuanCongKhai: string;
    capThucHien: string;
    tinhTrang: string;
    danhSachMauDon: MauDon[];
}
interface EnhancedTTHCRecord extends TTHCRecord {
    selectedMauDon?: MauDon;
}
interface FilterOptions {
    linhVuc: string[];
    doiTuong: string[];
    capThucHien: string[];
    thuTucByLinhVuc: { [linhVuc: string]: string[] };
}
interface FilterState {
    searchText: string;
    linhVuc: string;
    doiTuong: string;
    capThucHien: string;
    availability: 'all' | 'available' | 'unavailable';
}
interface TemplateEditorState {
    selectedRecord: EnhancedTTHCRecord | null;
    showEditorModal: boolean;
    syncfusionLoading: boolean;
    syncfusionDocumentReady: boolean;
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
}
type Props = {
    value?: LinhVuc | null; // cho phép control từ ngoài
    onChange?: (value: LinhVuc | null) => void;
};
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
        on,
        off
    };
};
// --- UTILITY FUNCTIONS ---
const parseJSONData = (jsonArray: any[]): TTHCRecord[] => {
    if (!Array.isArray(jsonArray)) return [];
    const records: TTHCRecord[] = jsonArray
        .map(item => {
            const record: TTHCRecord = {
                stt: item['stt'] || 0,
                maTTHC: item['maTTHC'] ?? '',
                tenTTHC: item['tenTTHC'] ?? '',
                qdCongBo: item['qdCongBo'] ?? '',
                doiTuong: item['doiTuong'] ?? '',
                linhVuc: item['linhVuc'] ?? '',
                coQuanCongKhai: item['coQuanCongKhai'] ?? '',
                capThucHien: item['capThucHien'] ?? '',
                tinhTrang: item['tinhTrang'] ?? '',
                danhSachMauDon: item['danhSachMauDon'] || []
            };
            return record;
        })
        .filter(r => r.danhSachMauDon.length > 0);
    return records;
};
const createFilterOptions = (records: TTHCRecord[]): FilterOptions => {
    const linhVucSet = new Set<string>();
    const doiTuongSet = new Set<string>();
    const capThucHienSet = new Set<string>();
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
        // Extract doiTuong options
        if (record.doiTuong) {
            const doiTuongList = record.doiTuong
                .split(';')
                .map(dt => dt.trim())
                .filter(dt => dt);
            doiTuongList.forEach(dt => doiTuongSet.add(dt));
        }
        // Extract capThucHien options
        if (record.capThucHien) {
            const capThucHienList = record.capThucHien
                .split(';')
                .map(cth => cth.trim())
                .filter(cth => cth);
            capThucHienList.forEach(cth => capThucHienSet.add(cth));
        }
    });
    Object.keys(thuTucByLinhVuc).forEach(linhVuc => {
        thuTucByLinhVuc[linhVuc].sort();
    });
    return {
        linhVuc: Array.from(linhVucSet).sort(),
        doiTuong: Array.from(doiTuongSet).sort(),
        capThucHien: Array.from(capThucHienSet).sort(),
        thuTucByLinhVuc
    };
};
const sanitizeCodeForPath = (code: string): string => (code || '').replace(/[\\/]/g, '_').trim();
const buildDocxUrlForRecord = (record: TTHCRecord, mauDon: MauDon): string => {
    const code = sanitizeCodeForPath(record.maTTHC);
    const templateName = mauDon.tenFile;
    const encodedCode = encodeURIComponent(code);
    const encodedName = encodeURIComponent(templateName);
    const path = `templates_by_code/${encodedCode}/docx/${encodedName}`.replace(/\/+/g, '/');
    return `/${path}`;
};
const extractTemplateName = (fullPath: string): string => {
    if (!fullPath || !fullPath.includes('/')) return '';
    const parts = fullPath.split('/');
    return parts[parts.length - 1];
};
const checkTemplateExists = async (record: TTHCRecord, mauDon: MauDon): Promise<boolean> => {
    try {
        const url = buildDocxUrlForRecord(record, mauDon);
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
};
const enhanceRecordsWithAvailability = async (
    records: TTHCRecord[]
): Promise<EnhancedTTHCRecord[]> => {
    const enhancedRecords: EnhancedTTHCRecord[] = [];
    for (const record of records) {
        // Nếu có danhSachMauDon thì coi như có sẵn template
        const selectedMauDon =
            record.danhSachMauDon && record.danhSachMauDon.length > 0
                ? record.danhSachMauDon[0]
                : undefined;

        enhancedRecords.push({
            ...record,
            selectedMauDon
        });
    }
    return enhancedRecords;
};
const filterRecords = (
    records: EnhancedTTHCRecord[],
    filters: FilterState,
    linhVucList: LinhVuc[]
): EnhancedTTHCRecord[] => {
    return records.filter(record => {
        // Search text filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const searchableText = [
                record.tenTTHC,
                record.maTTHC,
                record.linhVuc,
                record.doiTuong,
                record.qdCongBo
            ]
                .join(' ')
                .toLowerCase();
            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        // Lĩnh vực filter - sử dụng maLinhVuc để tìm tenLinhVuc tương ứng
        if (filters.linhVuc) {
            const selectedLinhVuc = linhVucList.find(lv => lv.maLinhVuc === filters.linhVuc);
            if (selectedLinhVuc) {
                // Nếu có maLinhVuc, kiểm tra xem record.linhVuc có chứa tenLinhVuc không
                if (!record.linhVuc.includes(selectedLinhVuc.tenLinhVuc)) {
                    return false;
                }
            } else {
                // Fallback: nếu không tìm thấy, kiểm tra trực tiếp
                if (!record.linhVuc.includes(filters.linhVuc)) {
                    return false;
                }
            }
        }

        if (filters.doiTuong && !record.doiTuong.includes(filters.doiTuong)) {
            return false;
        }
        if (filters.capThucHien && !record.capThucHien.includes(filters.capThucHien)) {
            return false;
        }
        if (
            filters.availability === 'available' &&
            (!record.danhSachMauDon || record.danhSachMauDon.length === 0)
        ) {
            return false;
        }
        if (
            filters.availability === 'unavailable' &&
            record.danhSachMauDon &&
            record.danhSachMauDon.length > 0
        ) {
            return false;
        }
        return true;
    });
};
// Hàm xử lý dữ liệu thông minh
const processDataIntelligently = (data: string): any => {
    // Simple parsing logic - can be enhanced later
    try {
        // Try JSON format first
        return JSON.parse(data);
    } catch {
        // Try pipe-separated format: CCCD|CMND|Họ tên|Ngày sinh|Giới tính|Địa chỉ|Ngày cấp
        const parts = data.split('|');
        if (parts.length >= 7) {
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = parts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        }
        // Try comma-separated format
        const commaParts = data.split(',');
        if (commaParts.length >= 7) {
            const [cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap] = commaParts;
            return { cccd, cmnd, hoTen, ngaySinh, gioiTinh, diaChi, ngayCap };
        }
        throw new Error('Định dạng dữ liệu không được hỗ trợ');
    }
};
// Chuyển đổi dữ liệu từ mobile/socket sang ProcessingData
const convertScannedInfoToProcessingData = (data: any): ProcessingData => {
    // Handle mobile socket data format
    if (data.so_cccd || data.so_cmnd || data.ho_ten) {
        console.log('📱 Detected mobile socket data format, using as-is');
        return {
            ...data,
            cccd: data.cccd || data.so_cccd || '',
            cmnd: data.cmnd || data.so_cmnd || '',
            hoTen: data.hoTen || data.ho_ten || '',
            ngaySinh: data.ngaySinh || data.ngay_sinh || '',
            gioiTinh: data.gioiTinh || data.gioi_tinh || '',
            diaChi: data.diaChi || data.noi_cu_tru || '',
            ngayCap: data.ngayCap || data.ngay_cap || '',
            so_cccd: data.so_cccd || data.cccd || '',
            so_cmnd: data.so_cmnd || data.cmnd || '',
            ho_ten: data.ho_ten || data.hoTen || '',
            ngay_sinh: data.ngay_sinh || data.ngaySinh || '',
            gioi_tinh: data.gioi_tinh || data.gioiTinh || '',
            noi_cu_tru: data.noi_cu_tru || data.diaChi || '',
            ngay_cap: data.ngay_cap || data.ngayCap || '',
            // Tách ngày/tháng/năm
            ns_ngay: data.ns_ngay || '',
            ns_thang: data.ns_thang || '',
            ns_nam: data.ns_nam || '',
            nc_ngay: data.nc_ngay || '',
            nc_thang: data.nc_thang || '',
            nc_nam: data.nc_nam || ''
        } as ProcessingData;
    }
    return data;
};

function LinhVucListComponent({ value = '', onChange }: any) {
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLinhVuc, setSelectedLinhVuc] = useState<LinhVuc | null>(value);

    useEffect(() => {
        const loadLinhVuc = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await linhVucRepository.getLinhVucList();
                setLinhVucList(data);
            } catch (err: any) {
                setError(err.message || 'Đã có lỗi xảy ra.');
            } finally {
                setLoading(false);
            }
        };

        loadLinhVuc();
    }, []);

    // Nếu prop value thay đổi từ bên ngoài thì đồng bộ lại state
    useEffect(() => {
        setSelectedLinhVuc(value || null);
    }, [value]);

    const handleChange = (event: any, newValue: LinhVuc | null) => {
        setSelectedLinhVuc(newValue);
        onChange?.(newValue);
    };

    if (loading) return <CircularProgress />;
    if (error) return <div style={{ color: 'red' }}>Lỗi: {error}</div>;

    return (
        <Autocomplete
            size="small"
            options={linhVucList}
            value={selectedLinhVuc}
            onChange={handleChange}
            getOptionLabel={option => option.tenLinhVuc}
            isOptionEqualToValue={(option, value) => option.maLinhVuc === value.maLinhVuc}
            sx={{ minWidth: 200, maxWidth: 200 }}
            renderInput={params => (
                <TextField {...params} label="Lĩnh vực" placeholder="Chọn lĩnh vực" />
            )}
        />
    );
}

const TemplateCard = React.memo<{
    record: EnhancedTTHCRecord;
    index: number;
    onSelect: (record: EnhancedTTHCRecord) => void;
    onSelectTemplate: (record: EnhancedTTHCRecord) => void;
    hasWorkingDocuments?: boolean;
    workingDocumentsCount?: number;
}>(
    ({
        record,
        index,
        onSelect,
        onSelectTemplate,
        hasWorkingDocuments = false,
        workingDocumentsCount = 0
    }) => {
        const hasTemplates = record.danhSachMauDon && record.danhSachMauDon.length > 0;
        return (
            <Card
                variant="outlined"
                sx={{
                    mb: 2,
                    borderRadius: 2,
                    borderColor: 'grey.300',
                    transition: 'box-shadow 0.3s, border-color 0.3s',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main'
                    }
                }}
            >
                <CardContent>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                            gap: 1
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Star sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
                            <Typography variant="body2" color="text.secondary">
                                <Typography
                                    sx={{
                                        fontSize: 14
                                    }}
                                    component="span"
                                    fontWeight="500"
                                >
                                    Mã thủ tục:
                                </Typography>{' '}
                                {record.maTTHC}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <Typography component="span" fontWeight="500" fontSize={14}>
                                    Cấp thực hiện:
                                </Typography>
                                {record.capThucHien}
                            </Typography>
                        </Box>

                        <Box>
                            {!hasTemplates ? (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                >
                                    (Chưa có mẫu đơn/tờ khai trong dữ liệu)
                                </Typography>
                            ) : (
                                <>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => onSelect(record)}
                                        startIcon={<EditIcon />}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                            '&:hover': {
                                                background:
                                                    'linear-gradient(45deg, #1565c0, #1976d2)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                            },
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {record.danhSachMauDon.length === 1
                                            ? 'Chọn mẫu'
                                            : 'Chọn mẫu'}
                                    </Button>

                                    {hasTemplates && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={e => {
                                                e.stopPropagation();
                                                const selected = record.danhSachMauDon[0];
                                                const docUrl = buildDocxUrlForRecord(
                                                    record,
                                                    selected
                                                );
                                                const code = record.maTTHC;

                                                // Persist payload in localStorage for the procedures route to pick up
                                                localStorage.setItem(
                                                    'pending_procedure_load',
                                                    JSON.stringify({ docUrl, code })
                                                );
                                                // Navigate to procedures route (hash-based)
                                                window.location.href =
                                                    '/src/admin/index.html#/procedures/';
                                            }}
                                            startIcon={<EditIcon />}
                                            sx={{ ml: 1, textTransform: 'none' }}
                                        >
                                            Thiết lập mẫu
                                        </Button>
                                    )}
                                </>
                            )}
                        </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    {/* Phần Body: Thông tin chi tiết */}
                    <Stack spacing={1.5} sx={{ my: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Lĩnh vực:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                {record.linhVuc}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Tên thủ tục:
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 'bold', color: 'primary.main' }}
                            >
                                {record.tenTTHC}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                            >
                                Đối tượng thực hiện:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                {record.doiTuong || 'Công dân Việt Nam'}
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
                {/* <Box sx={{ px: 1, pb: 1 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between'
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1.5, pl: 0.5 }}>
                        Danh sách mẫu đơn / tờ khai
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="text"
                            color="primary"
                            size="small"
                            startIcon={<Download />}
                        >
                            Tải
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            color={hasTemplates ? 'primary' : 'success'}
                            onClick={e => {
                                e.stopPropagation();
                                onSelectTemplate(record);
                            }}
                            startIcon={<Add />}
                        >
                            Tạo trực tuyến
                        </Button>
                    </Box>
                </Box>
            </Box> */}
            </Card>
        );
    }
);

TemplateCard.displayName = 'TemplateCard';
// Apply data to Syncfusion editor

// Function to scan document for available suffixes
const scanDocumentForSuffixes = (editor: DocumentEditorContainerComponent | null): string[] => {
    try {
        if (!editor?.documentEditor) {
            console.log('❌ DocumentEditor is null, cannot scan');
            return [];
        }

        const currentSfdt = editor.documentEditor.serialize();
        if (!currentSfdt) {
            console.log('❌ Failed to serialize document for scanning');
            return [];
        }

        // Regex to find patterns like {ho_ten_1}, {so_cccd_2}, etc.
        const suffixPattern = /\{[^}]+_(\d+)\}/g;
        const suffixes = new Set<string>();

        let match;
        while ((match = suffixPattern.exec(currentSfdt)) !== null) {
            suffixes.add(match[1]); // Extract the number part
        }

        const sortedSuffixes = Array.from(suffixes).sort((a, b) => parseInt(a) - parseInt(b));
        console.log('🔍 Found suffixes in document:', sortedSuffixes);

        return sortedSuffixes;
    } catch (error) {
        console.error('❌ Error scanning document for suffixes:', error);
        return [];
    }
};

// Function to reset document to original state
const resetDocumentToOriginal = async (
    editor: DocumentEditorContainerComponent | null,
    originalSfdt: string | null
): Promise<boolean> => {
    try {
        if (!editor?.documentEditor) {
            console.error('❌ DocumentEditor is null, cannot reset');
            return false;
        }

        if (!originalSfdt) {
            console.error('❌ No original SFDT stored, cannot reset');
            return false;
        }

        console.log('🔄 Resetting document to original state...');
        editor.documentEditor.open(originalSfdt);
        console.log('✅ Document reset to original state');

        return true;
    } catch (error) {
        console.error('❌ Error resetting document:', error);
        return false;
    }
};

const applyDataToSyncfusion = async (
    editor: DocumentEditorContainerComponent | null,
    data: ProcessingData,
    targetSuffix: string = ''
): Promise<boolean> => {
    try {
        console.log('🔄 Starting Syncfusion data insertion...', data.diaChi);
        if (!editor?.documentEditor) {
            console.error('❌ DocumentEditor is null');
            return false;
        }
        const currentSfdt = editor.documentEditor.serialize();
        if (!currentSfdt) {
            console.error('❌ Failed to serialize document');
            return false;
        }
        const { day: dayCurrent, month: monthCurent, year: yearCurrent } = getCurrentDateParts();

        // Create replace map for exact placeholder matching with optional target suffix
        const suffix = targetSuffix ? `_${targetSuffix}` : '';
        const replaceMap: Record<string, string> = {
            [`{ho_ten${suffix}}`]: data.hoTen || data.ho_ten || '',
            [`{so_cccd${suffix}}`]: data.so_cccd || data.cccd || '',
            [`{so_cmnd${suffix}}`]: data.so_cmnd || data.cmnd || '',
            [`{ngay_sinh${suffix}}`]: data.ngaySinh || data.ngay_sinh || '',
            [`{gioi_tinh${suffix}}`]: data.gioiTinh || data.gioi_tinh || '',
            [`{noi_cu_tru${suffix}}`]: data.diaChi || data.noiCuTru || data.noi_cu_tru || '',
            [`{ngay_cap${suffix}}`]: data.ngayCap || data.ngay_cap || '',
            // Current date time
            '{ngay_hientai}': dayCurrent.toString() || '',
            '{thang_hientai}': monthCurent.toString() || '',
            '{nam_hientai': yearCurrent.toString() || ''
        };
        console.log('📝 Replace map:', replaceMap);
        let totalReplacements = 0;
        let modifiedSfdt = currentSfdt;
        for (const [placeholder, value] of Object.entries(replaceMap)) {
            if (value) {
                const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                const beforeLength = modifiedSfdt.length;
                modifiedSfdt = modifiedSfdt.replace(regex, value);
                const afterLength = modifiedSfdt.length;
                if (beforeLength !== afterLength) {
                    totalReplacements++;
                    console.log(`✅ Replaced "${placeholder}" with "${value}" in SFDT`);
                }
            }
        }
        if (totalReplacements > 0) {
            console.log('🔄 Loading modified document...');
            editor.documentEditor.open(modifiedSfdt);
            console.log('✅ Document reloaded with replacements');
        }
        console.log(`🎯 Total replacements made: ${totalReplacements}`);
        return true;
    } catch (error: any) {
        console.error('❌ Error in applyDataToSyncfusion:', error);
        return false;
    }
};
// --- COMPONENT CHÍNH ---
function TemplateFillerComponent() {
    const [csvRecords, setCsvRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        doiTuong: [],
        capThucHien: [],
        thuTucByLinhVuc: {}
    });
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [linhVucLoading, setLinhVucLoading] = useState(false);

    const navigate = useNavigate();
    const { history } = useRouter();

    const handlePrintClick = async () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            await sfContainerRef.current.documentEditor.print();
            await window.print();
            await history.back();
            await navigate({
                to: '/template-filler'
            });
            window.location.reload();
        } else {
            console.error('Document editor not ready to print.');
        }
    };

    const handleDownloadClick = () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            const fileName = editorState.selectedRecord?.selectedMauDon?.tenFile || 'Document.docx';
            sfContainerRef.current.documentEditor.save(fileName, 'Docx');
        } else {
            console.error('Document editor not ready to download.');
        }
    };
    const [filters, setFilters] = useState<FilterState>({
        searchText: '',
        linhVuc: '', // Sẽ lưu maLinhVuc thay vì tenLinhVuc
        doiTuong: '',
        capThucHien: '',
        availability: 'all'
    });
    const [filteredRecords, setFilteredRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [csvLoading, setCsvLoading] = useState(false);
    // State cho template editor
    const [editorState, setEditorState] = useState<TemplateEditorState>({
        selectedRecord: null,
        showEditorModal: false,
        syncfusionLoading: false,
        syncfusionDocumentReady: false,
        socketStatus: 'disconnected'
    });
    // State cho modal chọn mẫu đơn
    const [templateSelectionModal, setTemplateSelectionModal] = useState({
        open: false,
        record: null as EnhancedTTHCRecord | null
    });
    // State cho scan & fill panel
    const [scanState, setScanState] = useState({
        inputMode: 'ntsoft' as 'ntsoft' | 'scanner',
        inputText: '',
        extractedData: null as ProcessingData | null,
        isProcessing: false
    });

    // State cho multiple target management
    const [targetState, setTargetState] = useState({
        availableTargets: [] as string[], // Danh sách targets có thể sử dụng (dynamic từ document)
        selectedTarget: '', // Target được chọn hiện tại
        usedTargets: [] as string[], // Danh sách targets đã sử dụng
        originalSfdt: null as string | null // Lưu trữ document gốc để reset
    });

    // State cho working documents từ IndexedDB
    const [workingDocsState, setWorkingDocsState] = useState({
        workingDocsByCode: {} as { [maTTHC: string]: WorkingDocument },
        workingDocsListByCode: {} as { [maTTHC: string]: WorkingDocument[] },
        isLoading: false
    });

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'info'
    });

    // Working document functions
    const refreshWorkingDocuments = useCallback(async () => {
        try {
            setWorkingDocsState(prev => ({ ...prev, isLoading: true }));
            const allWorking = await db.workingDocumentsV2.orderBy('updatedAt').reverse().toArray();
            const byCode: { [maTTHC: string]: WorkingDocument } = {};
            const listByCode: { [maTTHC: string]: WorkingDocument[] } = {};

            allWorking.forEach(doc => {
                if (!doc.maTTHC) return;
                if (!listByCode[doc.maTTHC]) listByCode[doc.maTTHC] = [];
                listByCode[doc.maTTHC].push(doc);
                if (!byCode[doc.maTTHC]) byCode[doc.maTTHC] = doc;
            });

            setWorkingDocsState(prev => ({
                ...prev,
                workingDocsByCode: byCode,
                workingDocsListByCode: listByCode,
                isLoading: false
            }));

            console.log(`✅ Refreshed working documents: ${Object.keys(byCode).length} documents`);
        } catch (e) {
            console.error('❌ Failed to refresh working documents:', e);
            setWorkingDocsState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const getWorkingDocumentsForMaTTHC = useCallback(
        (maTTHC: string): WorkingDocument[] => {
            return workingDocsState.workingDocsListByCode[maTTHC] || [];
        },
        [workingDocsState.workingDocsListByCode]
    );

    const hasWorkingDocuments = useCallback(
        (maTTHC: string): boolean => {
            return workingDocsState.workingDocsListByCode[maTTHC]?.length > 0 || false;
        },
        [workingDocsState.workingDocsListByCode]
    );

    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);

    // Socket connection
    const { socketStatus, on, off } = useSocketConnection(SOCKET_URL);
    // Memoized values
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc];
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);
    // Memoized available templates for performance
    const availableTemplates = useMemo(() => {
        return filteredRecords.filter(r => r.danhSachMauDon && r.danhSachMauDon.length > 0);
    }, [filteredRecords]);
    // Memoized statistics for header
    const templateStats = useMemo(() => {
        const available = filteredRecords.filter(
            r => r.danhSachMauDon && r.danhSachMauDon.length > 0
        ).length;
        const total = filteredRecords.length;
        return { available, total };
    }, [filteredRecords]);
    // Event handlers
    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [filterType]: value
            };
            return newFilters;
        });
    }, []);
    const handleClearFilters = useCallback(() => {
        setFilters({
            searchText: '',
            linhVuc: '',
            doiTuong: '',
            capThucHien: '',
            availability: 'all'
        });
    }, []);
    //  Chọn template
    const handleSelectTemplate = useCallback(async (record: EnhancedTTHCRecord) => {
        console.log('🎯 Template selected:', record);

        // Kiểm tra xem record có mẫu đơn nào không
        if (!record.danhSachMauDon || record.danhSachMauDon.length === 0) {
            setSnackbar({
                open: true,
                message: `Mẫu đơn "${record.tenTTHC}" chưa có sẵn trong hệ thống`,
                severity: 'warning'
            });
            return;
        }

        // Nếu chỉ có 1 mẫu đơn, sử dụng trực tiếp
        if (record.danhSachMauDon.length === 1) {
            const singleMauDon = record.danhSachMauDon[0];
            const updatedRecord = { ...record, selectedMauDon: singleMauDon };

            setEditorState(prev => ({
                ...prev,
                selectedRecord: updatedRecord,
                showEditorModal: true,
                syncfusionLoading: true,
                syncfusionDocumentReady: false
            }));

            setSnackbar({
                open: true,
                message: `Đang tải mẫu: ${record.tenTTHC}`,
                severity: 'info'
            });
            return;
        }

        // Nếu có nhiều mẫu đơn, mở modal chọn mẫu
        setTemplateSelectionModal({
            open: true,
            record: record
        });
    }, []);
    const handleCloseEditor = useCallback(() => {
        setEditorState({
            selectedRecord: null,
            showEditorModal: false,
            syncfusionLoading: false,
            syncfusionDocumentReady: false,
            socketStatus: editorState.socketStatus
        });
        setScanState({
            inputMode: 'ntsoft',
            inputText: '',
            extractedData: null,
            isProcessing: false
        });
    }, [editorState.socketStatus]);
    const insertFieldIntoSyncfusion = useCallback((fieldPlaceholder: string) => {
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
            container.documentEditor.editor.insertText(fieldPlaceholder);
            setSnackbar({
                open: true,
                message: `Đã chèn field "${fieldPlaceholder}" vào document`,
                severity: 'success'
            });
        } catch (error) {
            console.error('❌ Error inserting field:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi chèn field vào document',
                severity: 'error'
            });
        }
    }, []);
    // Load template into Syncfusion editor with retry mechanism
    const loadTemplateIntoSyncfusion = useCallback(async (record: EnhancedTTHCRecord) => {
        console.log('🔄 Starting template load process for:', record.tenTTHC);
        // Retry function to wait for Syncfusion to be ready
        const waitForSyncfusion = async (maxRetries = 10): Promise<boolean> => {
            for (let i = 0; i < maxRetries; i++) {
                if (sfContainerRef.current?.documentEditor) {
                    console.log('✅ Syncfusion editor found, proceeding...');
                    return true;
                }
                console.log(`⏳ Waiting for Syncfusion editor (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return false;
        };
        const isReady = await waitForSyncfusion();
        if (!isReady) {
            console.error('❌ Syncfusion editor not ready after waiting');
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: 'Syncfusion editor không sẵn sàng. Vui lòng thử lại.',
                severity: 'error'
            });
            return;
        }
        try {
            console.log('🔄 Loading template into Syncfusion...');
            if (!record.selectedMauDon) {
                throw new Error('Không có mẫu đơn được chọn');
            }

            let blob: Blob;

            // Check if template is from IndexedDB
            if (record.selectedMauDon.isFromIndexedDB && record.selectedMauDon.workingDocument) {
                console.log('📦 Loading template from IndexedDB:', record.selectedMauDon.tenFile);
                blob = record.selectedMauDon.workingDocument.blob;
            } else {
                // Load from CSV template URL
                const templateUrl = buildDocxUrlForRecord(record, record.selectedMauDon);
                console.log('📁 Template URL:', templateUrl);
                const res = await fetch(templateUrl);
                if (!res.ok) {
                    console.error('❌ Failed to fetch template:', res.status, res.statusText);
                    throw new Error(`Không thể tải file mẫu: ${res.status} ${res.statusText}`);
                }
                blob = await res.blob();
            }

            console.log('📦 Template blob size:', blob.size, 'bytes');
            const form = new FormData();
            form.append('files', blob, record.selectedMauDon.tenFile);
            console.log('🔄 Converting DOCX to SFDT...');
            console.log('🌐 Syncfusion service URL:', SYNCFUSION_SERVICE_URL + 'Import');
            const importRes = await fetch(`${SYNCFUSION_SERVICE_URL}Import`, {
                method: 'POST',
                body: form
            });
            if (!importRes.ok) {
                console.error(
                    '❌ Syncfusion import failed:',
                    importRes.status,
                    importRes.statusText
                );
                throw new Error(`Lỗi khi import file: ${importRes.status} ${importRes.statusText}`);
            }
            const sfdtText = await importRes.text();
            console.log('✅ SFDT conversion completed, length:', sfdtText.length);
            if (!sfdtText || sfdtText.length < 100) {
                throw new Error('SFDT conversion returned invalid data');
            }
            console.log('🔄 Opening document in Syncfusion editor...');
            sfContainerRef.current!.documentEditor.open(sfdtText);
            // Wait longer for document to be fully loaded
            setTimeout(() => {
                try {
                    const testSfdt = sfContainerRef.current?.documentEditor?.serialize();
                    if (testSfdt && testSfdt.length > 100) {
                        // Scan document for available suffixes
                        const availableSuffixes = scanDocumentForSuffixes(sfContainerRef.current);
                        console.log(
                            '📋 Document loaded with available targets:',
                            availableSuffixes
                        );

                        // Update target state with scanned suffixes and save original document
                        setTargetState(prev => ({
                            ...prev,
                            availableTargets: availableSuffixes,
                            selectedTarget: '',
                            usedTargets: [],
                            originalSfdt: testSfdt // Save original document for reset
                        }));

                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Syncfusion document ready for data insertion');
                        const suffixMessage =
                            availableSuffixes.length > 0
                                ? ` (Tìm thấy ${availableSuffixes.length} đối tượng: ${availableSuffixes.map(s => `_${s}`).join(', ')})`
                                : ' (Không tìm thấy suffix đặc biệt)';

                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${record.tenTTHC}${suffixMessage}`,
                            severity: 'success'
                        });
                    } else {
                        throw new Error('Document not properly loaded');
                    }
                } catch (error) {
                    console.warn('⚠️ Error checking document readiness:', error);
                    // Still mark as ready to allow user interaction
                    setEditorState(prev => ({
                        ...prev,
                        syncfusionDocumentReady: true,
                        syncfusionLoading: false
                    }));
                }
            }, 2000); // Increased timeout
        } catch (e: any) {
            console.error('❌ Error loading Syncfusion document:', e);
            setEditorState(prev => ({
                ...prev,
                syncfusionLoading: false,
                syncfusionDocumentReady: false
            }));
            setSnackbar({
                open: true,
                message: e?.message || 'Không thể mở tài liệu trong Syncfusion',
                severity: 'error'
            });
        }
    }, []);
    // Effects
    useEffect(() => {
        setEditorState(prev => ({ ...prev, socketStatus }));
    }, [socketStatus]);
    // Load JSON data on component mount
    useEffect(() => {
        const loadData = async () => {
            setCsvLoading(true);
            try {
                const jsonResponse = await fetch('/DanhSachTTHC.json');
                if (!jsonResponse.ok) {
                    throw new Error('Không thể tải dữ liệu JSON');
                }
                const jsonContent = await jsonResponse.json();
                const rawRecords = parseJSONData(jsonContent);
                const enhancedRecords = await enhanceRecordsWithAvailability(rawRecords);
                setCsvRecords(enhancedRecords);
                setFilterOptions(createFilterOptions(rawRecords));
                setFilteredRecords(enhancedRecords);
                const availableCount = enhancedRecords.filter(
                    r => r.danhSachMauDon && r.danhSachMauDon.length > 0
                ).length;
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

    // Load lĩnh vực data from repository
    useEffect(() => {
        const loadLinhVuc = async () => {
            setLinhVucLoading(true);
            try {
                const data = await linhVucRepository.getLinhVucList();
                setLinhVucList(data);
                console.log('✅ Loaded lĩnh vực from repository:', data.length, 'items');

                // Log mapping between repository and CSV data for debugging
                const csvLinhVuc = filterOptions.linhVuc;
                console.log('📊 CSV lĩnh vực count:', csvLinhVuc.length);
                console.log('📊 Repository lĩnh vực count:', data.length);

                // Show success message
                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} lĩnh vực từ cơ sở dữ liệu`,
                    severity: 'success'
                });
            } catch (error) {
                console.error('❌ Error loading lĩnh vực:', error);
                setSnackbar({
                    open: true,
                    message: 'Không thể tải danh sách lĩnh vực',
                    severity: 'error'
                });
            } finally {
                setLinhVucLoading(false);
            }
        };

        loadLinhVuc();
    }, [filterOptions.linhVuc]);

    // Load working documents from IndexedDB on component mount
    useEffect(() => {
        refreshWorkingDocuments();
    }, [refreshWorkingDocuments]);

    // Filter records when filters change
    useEffect(() => {
        const filtered = filterRecords(csvRecords, filters, linhVucList);
        setFilteredRecords(filtered);
    }, [csvRecords, filters, linhVucList]);
    // Load template when editor modal opens
    useEffect(() => {
        console.log('Modal state changed:', {
            showEditorModal: editorState.showEditorModal,
            selectedRecord: editorState.selectedRecord?.tenTTHC || 'none',
            syncfusionLoading: editorState.syncfusionLoading
        });
        if (editorState.showEditorModal && editorState.selectedRecord) {
            console.log('🚀 Triggering template load for:', editorState.selectedRecord.tenTTHC);
            loadTemplateIntoSyncfusion(editorState.selectedRecord);
        }
    }, [editorState.showEditorModal, editorState.selectedRecord, loadTemplateIntoSyncfusion]);
    // Socket event handlers for mobile data
    useEffect(() => {
        const handleDataReceived = async (data: ProcessingData) => {
            if (!editorState.selectedRecord || !editorState.syncfusionDocumentReady) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng chọn và mở mẫu đơn trước khi nhận dữ liệu.',
                    severity: 'warning'
                });
                return;
            }
            if (data) {
                try {
                    console.log('🔌 Received data from mobile app via socket:', data);
                    console.log('🎯 Current selected target:', targetState.selectedTarget);
                    const processingData = convertScannedInfoToProcessingData(data);
                    console.log('🔄 Converted mobile data to ProcessingData:', processingData);
                    const success = await applyDataToSyncfusion(
                        sfContainerRef.current,
                        processingData,
                        targetState.selectedTarget
                    );

                    // Update extracted data in scan state
                    setScanState(prev => ({
                        ...prev,
                        extractedData: processingData
                    }));

                    if (success) {
                        // Remove target from available list if it was used
                        const usedTarget = targetState.selectedTarget;
                        if (usedTarget) {
                            setTargetState(prev => ({
                                ...prev,
                                availableTargets: prev.availableTargets.filter(
                                    t => t !== usedTarget
                                ),
                                usedTargets: [...prev.usedTargets, usedTarget],
                                selectedTarget: ''
                            }));

                            setSnackbar({
                                open: true,
                                message: `Đã chèn dữ liệu cho đối tượng _${usedTarget} từ NTS DocumentAI`,
                                severity: 'success'
                            });
                        } else {
                            setSnackbar({
                                open: true,
                                message: 'Đã chèn dữ liệu (mặc định) từ NTS DocumentAI',
                                severity: 'success'
                            });
                        }
                    } else {
                        setSnackbar({
                            open: true,
                            message: 'Lỗi khi chèn dữ từ NTS DocumentAI',
                            severity: 'error'
                        });
                    }
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : 'Lỗi không xác định.';
                    setSnackbar({
                        open: true,
                        message: `Lỗi xử lý dữ liệu`,
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
        editorState.selectedRecord,
        editorState.syncfusionDocumentReady,
        targetState.selectedTarget
    ]);
    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);
    // Scan & Fill Panel Handlers
    const handleInputModeChange = useCallback((mode: 'ntsoft' | 'scanner') => {
        setScanState(prev => ({ ...prev, inputMode: mode }));
        console.log('Input mode', mode);
    }, []);
    const handleInputTextChange = useCallback((text: string) => {
        setScanState(prev => ({ ...prev, inputText: text }));
    }, []);
    const handleOpenDocumentAI = useCallback(() => {
        // Logic để mở Document AI app
        setSnackbar({
            open: true,
            message: 'Đang mở NTSoft Document AI...',
            severity: 'info'
        });
    }, []);
    const handleAnalyzeAndFill = useCallback(async () => {
        if (!scanState.inputText.trim()) {
            setSnackbar({
                open: true,
                message: 'Vui lòng nhập dữ liệu cần phân tích',
                severity: 'warning'
            });
            return;
        }
        if (!editorState.selectedRecord || !editorState.syncfusionDocumentReady) {
            setSnackbar({
                open: true,
                message: 'Vui lòng mở mẫu đơn trước khi điền dữ liệu',
                severity: 'warning'
            });
            return;
        }
        setScanState(prev => ({ ...prev, isProcessing: true }));
        try {
            const scannedInfo = processDataIntelligently(scanState.inputText);
            const processingData = convertScannedInfoToProcessingData({
                ...scannedInfo,
                ngaySinh: formatDDMMYYYY(scannedInfo.ngaySinh),
                ngayCap: formatDDMMYYYY(scannedInfo.ngayCap)
            });
            setScanState(prev => ({
                ...prev,
                extractedData: processingData,
                isProcessing: false
            }));
            // Apply data to Syncfusion editor
            const success = await applyDataToSyncfusion(
                sfContainerRef.current,
                processingData,
                targetState.selectedTarget
            );
            if (success) {
                // Remove target from available list if it was used
                const usedTarget = targetState.selectedTarget;
                if (usedTarget) {
                    setTargetState(prev => ({
                        ...prev,
                        availableTargets: prev.availableTargets.filter(t => t !== usedTarget),
                        usedTargets: [...prev.usedTargets, usedTarget],
                        selectedTarget: ''
                    }));

                    setSnackbar({
                        open: true,
                        message: `Đã phân tích và điền dữ liệu cho đối tượng _${usedTarget} thành công!`,
                        severity: 'success'
                    });
                } else {
                    setSnackbar({
                        open: true,
                        message: 'Đã phân tích và điền dữ liệu (mặc định) thành công!',
                        severity: 'success'
                    });
                }
            } else {
                setSnackbar({
                    open: true,
                    message: 'Lỗi khi điền dữ liệu vào document',
                    severity: 'error'
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            setScanState(prev => ({ ...prev, isProcessing: false }));
            setSnackbar({
                open: true,
                message: `Lỗi phân tích dữ liệu: ${errorMessage}`,
                severity: 'error'
            });
        }
    }, [scanState.inputText, editorState.selectedRecord, editorState.syncfusionDocumentReady]);
    console.log('🎨 TemplateFillerComponent render:', {
        csvRecordsCount: csvRecords.length,
        filteredRecordsCount: filteredRecords.length,
        showEditorModal: editorState.showEditorModal,
        selectedRecord: editorState.selectedRecord?.tenTTHC,
        syncfusionLoading: editorState.syncfusionLoading,
        syncfusionReady: editorState.syncfusionDocumentReady
    });
    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleAnalyzeAndFill();
        }
    };

    const customToolbarItems = ['Print'];

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    p: { xs: 1, sm: 1, md: 1 }
                }}
            >
                {/* <Card
                    sx={{
                        mb: 4,
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <CardHeader
                        title="🔍 Tìm kiếm nhanh"
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                        <TextField
                            fullWidth
                            size="medium"
                            value={filters.searchText}
                            onChange={e => handleFilterChange('searchText', e.target.value)}
                            placeholder="🔍 Tìm kiếm thủ tục, mã, lĩnh vực, đối tượng, quyết định công bố..."
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                    },
                                    '&.Mui-focused': {
                                        boxShadow: '0 4px 20px rgba(25,118,210,0.25)'
                                    }
                                }
                            }}
                        />
                    </CardContent>
                </Card> */}

                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        p: 2,
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                        mb: 1
                    }}
                >
                    <TextField
                        size="small"
                        value={filters.searchText}
                        onChange={e => handleFilterChange('searchText', e.target.value)}
                        placeholder="Tìm kiếm thủ tục, mã, lĩnh vực..."
                        variant="outlined"
                        sx={{
                            minWidth: 220,
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                                },
                                '&.Mui-focused': {
                                    boxShadow: '0 4px 20px rgba(25,118,210,0.25)'
                                }
                            }
                        }}
                    />
                    <Autocomplete
                        size="small"
                        options={['', ...linhVucList.map(lv => lv.maLinhVuc)]}
                        value={filters.linhVuc}
                        onChange={(event, newValue) => {
                            handleFilterChange('linhVuc', newValue || '');

                            // Debug: Log thông tin lĩnh vực được chọn
                            if (newValue) {
                                const selectedLinhVuc = linhVucList.find(
                                    lv => lv.maLinhVuc === newValue
                                );
                                console.log('🎯 Selected lĩnh vực:', {
                                    maLinhVuc: newValue,
                                    tenLinhVuc: selectedLinhVuc?.tenLinhVuc,
                                    csvMatch: filterOptions.linhVuc.includes(
                                        selectedLinhVuc?.tenLinhVuc || ''
                                    )
                                });
                            }
                        }}
                        getOptionLabel={option => {
                            if (!option) return 'Tất cả';
                            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === option);
                            return linhVuc ? linhVuc.tenLinhVuc : option;
                        }}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label={`Lĩnh vực (${linhVucList.length})`}
                                placeholder={linhVucLoading ? 'Đang tải...' : 'Chọn lĩnh vực'}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {linhVucLoading && <CircularProgress size={20} />}
                                            {params.InputProps.endAdornment}
                                        </>
                                    )
                                }}
                            />
                        )}
                        loading={linhVucLoading}
                        sx={{ minWidth: 250, maxWidth: 250 }}
                        renderOption={(props, option) => {
                            if (!option) {
                                return (
                                    <Box component="li" {...props}>
                                        <Typography variant="body2">Tất cả</Typography>
                                    </Box>
                                );
                            }

                            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === option);
                            return (
                                <Box component="li" {...props}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5,
                                            width: '100%'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {linhVuc?.tenLinhVuc || option}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mã: {option}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        }}
                    />
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Lĩnh vực</InputLabel>
                        <Select
                            value={filters.linhVuc}
                            onChange={e => handleFilterChange('linhVuc', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.linhVuc.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Đối tượng</InputLabel>
                        <Select
                            value={filters.doiTuong}
                            onChange={e => handleFilterChange('doiTuong', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.doiTuong.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200, maxWidth: 200 }}
                        options={filterOptions.doiTuong}
                        value={filters.doiTuong || null}
                        onChange={(e, newValue) => handleFilterChange('doiTuong', newValue || '')}
                        renderInput={params => (
                            <TextField {...params} label="Đối tượng" placeholder="Tất cả" />
                        )}
                    />
                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200, maxWidth: 200 }}
                        options={filterOptions.capThucHien}
                        value={filters.capThucHien || null}
                        onChange={(e, newValue) =>
                            handleFilterChange('capThucHien', newValue || '')
                        }
                        renderInput={params => (
                            <TextField {...params} label="Cấp thực hiện" placeholder="Tất cả" />
                        )}
                    />

                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Cấp thực hiện</InputLabel>
                        <Select
                            value={filters.capThucHien}
                            onChange={e => handleFilterChange('capThucHien', e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả</em>
                            </MenuItem>
                            {filterOptions.capThucHien.map(item => (
                                <MenuItem key={item} value={item}>
                                    {item}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl> */}
                    {/* <LinhVucListComponent /> */}
                    {/* <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                        <InputLabel>Trạng thái mẫu</InputLabel>
                        <Select
                            value={filters.availability}
                            onChange={e => handleFilterChange('availability', e.target.value)}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="available">Có sẵn mẫu</MenuItem>
                            <MenuItem value="unavailable">Chưa có mẫu</MenuItem>
                        </Select>
                    </FormControl> */}
                </Box>
                {/* Template List */}
                <Card
                    sx={{
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                        height: '90vh'
                    }}
                >
                    <CardHeader
                        title="Danh sách mẫu đơn"
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                        // action={
                        //     <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        //         <Button
                        //             variant="outlined"
                        //             size="small"
                        //             onClick={refreshWorkingDocuments}
                        //             disabled={workingDocsState.isLoading}
                        //             startIcon={<RestartAltIcon />}
                        //             sx={{
                        //                 borderRadius: 1,
                        //                 textTransform: 'none',
                        //                 fontWeight: 600,
                        //                 borderColor: 'success.main',
                        //                 color: 'success.main',
                        //                 '&:hover': {
                        //                     borderColor: 'success.dark',
                        //                     backgroundColor: 'success.light',
                        //                     color: 'success.dark'
                        //                 }
                        //             }}
                        //         >
                        //             {workingDocsState.isLoading ? 'Đang tải...' : '🔄 Làm mới IndexedDB'}
                        //         </Button>
                        //         <Chip
                        //             icon={<CheckCircleIcon />}
                        //             label={`${availableTemplates.length} có sẵn`}
                        //             color="success"
                        //             size="small"
                        //             variant="filled"
                        //             sx={{
                        //                 fontWeight: 600,
                        //                 '& .MuiChip-icon': {
                        //                     color: 'inherit'
                        //                 }
                        //             }}
                        //         />
                        //         <Chip
                        //             label={`${filteredRecords.length} tổng cộng`}
                        //             color="primary"
                        //             size="small"
                        //             variant="outlined"
                        //             sx={{ fontWeight: 500 }}
                        //         />
                        //         {/* IndexedDB working documents count */}
                        //         {Object.keys(workingDocsState.workingDocsListByCode).length > 0 && (
                        //             <Chip
                        //                 icon={<Star />}
                        //                 label={`${Object.keys(workingDocsState.workingDocsListByCode).length} từ IndexedDB`}
                        //                 color="success"
                        //                 size="small"
                        //                 variant="outlined"
                        //                 sx={{
                        //                     fontWeight: 500,
                        //                     borderColor: 'success.main',
                        //                     color: 'success.main'
                        //                 }}
                        //             />
                        //         )}
                        //     </Box>
                        // }
                    />
                    <CardContent>
                        {csvLoading ? (
                            <Box sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <CircularProgress size={24} />
                                    <Typography
                                        variant="body1"
                                        color="primary"
                                        sx={{ fontWeight: 500 }}
                                    >
                                        Đang tải danh sách mẫu đơn...
                                    </Typography>
                                </Box>
                                {/* Skeleton Loading */}
                                {[1, 2, 3].map(item => (
                                    <Box
                                        key={item}
                                        sx={{
                                            mb: 3,
                                            p: 3,
                                            borderRadius: 1,
                                            border: '1px solid #e0e0e0',
                                            animation: 'pulse 1.5s ease-in-out infinite alternate'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <Box sx={{ flex: 1 }}>
                                                <Box
                                                    sx={{
                                                        height: 24,
                                                        bgcolor: '#f0f0f0',
                                                        borderRadius: 1,
                                                        mb: 2,
                                                        width: '70%',
                                                        animation:
                                                            'shimmer 1.5s ease-in-out infinite'
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 16,
                                                        bgcolor: '#f5f5f5',
                                                        borderRadius: 1,
                                                        mb: 1,
                                                        width: '50%'
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 16,
                                                        bgcolor: '#f5f5f5',
                                                        borderRadius: 1,
                                                        width: '60%'
                                                    }}
                                                />
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                    alignItems: 'flex-end'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: 24,
                                                        width: 80,
                                                        bgcolor: '#e8f5e8',
                                                        borderRadius: 12
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        height: 32,
                                                        width: 120,
                                                        bgcolor: '#e3f2fd',
                                                        borderRadius: 1
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    overflowY: 'auto',
                                    pr: 1,
                                    pt: 1,
                                    '&::-webkit-scrollbar': {
                                        width: '8px'
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '4px'
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#c1c1c1',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            background: '#a8a8a8'
                                        }
                                    }
                                }}
                            >
                                {availableTemplates.map((record, index) => (
                                    <TemplateCard
                                        key={`${record.maTTHC}-${index}`}
                                        record={record}
                                        index={index}
                                        onSelect={handleSelectTemplate}
                                        onSelectTemplate={handleSelectTemplate}
                                        hasWorkingDocuments={hasWorkingDocuments(record.maTTHC)}
                                        workingDocumentsCount={
                                            getWorkingDocumentsForMaTTHC(record.maTTHC).length
                                        }
                                    />
                                ))}
                                {availableTemplates.length === 0 && (
                                    <Paper
                                        sx={{
                                            p: 6,
                                            textAlign: 'center',
                                            borderRadius: 1,
                                            background:
                                                'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                            border: '2px dashed #dee2e6'
                                        }}
                                    >
                                        <Box sx={{ mb: 3 }}>
                                            <Typography
                                                variant="h1"
                                                sx={{
                                                    fontSize: '4rem',
                                                    opacity: 0.7,
                                                    mb: 2
                                                }}
                                            >
                                                📄
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="h5"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                fontWeight: 600
                                            }}
                                        >
                                            Không tìm thấy mẫu đơn nào
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            color="text.secondary"
                                            sx={{ mb: 3 }}
                                        >
                                            Thử thay đổi bộ lọc để tìm kiếm mẫu đơn phù hợp với nhu
                                            cầu của bạn
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={handleClearFilters}
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600
                                            }}
                                        >
                                            🔄 Xóa tất cả bộ lọc
                                        </Button>
                                    </Paper>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
                {/* Syncfusion Editor Modal */}
                <Dialog
                    open={editorState.showEditorModal}
                    onClose={handleCloseEditor}
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            width: { xs: '100vw', sm: '100vw' },
                            height: { xs: '100vh', sm: '100vh' },
                            maxHeight: { xs: '100vh', sm: '100vh' },
                            maxWidth: { xs: '100vw', sm: '100vw' },
                            // borderRadius: { xs: 0, sm: 3 },
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                            overflow: 'hidden',
                            margin: { xs: 0, sm: 'auto' }
                        },
                        '& .MuiBackdrop-root': {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)'
                        }
                    }}
                >
                    <DialogTitle
                        style={{
                            padding: 0,
                            margin: 0
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingRight: 2,
                                paddingLeft: 2
                            }}
                        >
                            <Typography
                                style={{
                                    paddingLeft: 10
                                }}
                                fontWeight={'bold'}
                            >
                                NTS DocumentAI
                            </Typography>
                            <Box>
                                <IconButton onClick={handleCloseEditor}>
                                    <Close
                                        style={{
                                            fontSize: 24
                                        }}
                                    />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent
                        sx={{
                            p: 0,
                            height: 'calc(100% - 120px)',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', lg: 'row' },
                                width: '100%',
                                height: '100%',
                                gap: { xs: 1, sm: 2 },
                                p: { xs: 1, sm: 2 }
                            }}
                        >
                            <Card
                                sx={{
                                    position: 'relative',
                                    height: { xs: '60%', lg: '100%' },
                                    width: { xs: '100%', lg: '70%' },
                                    borderRadius: { xs: 1, sm: 2 },
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                    background: 'rgba(255,255,255,0.95)',
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography
                                            variant="body1"
                                            sx={{ fontWeight: 700, color: 'primary.main' }}
                                        >
                                            Mẫu đơn/tờ khai
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="small"
                                            onClick={async () => {
                                                try {
                                                    const resetSuccess =
                                                        await resetDocumentToOriginal(
                                                            sfContainerRef.current,
                                                            targetState.originalSfdt
                                                        );

                                                    if (resetSuccess) {
                                                        const availableSuffixes =
                                                            scanDocumentForSuffixes(
                                                                sfContainerRef.current
                                                            );

                                                        setTargetState(prev => ({
                                                            ...prev,
                                                            availableTargets: availableSuffixes,
                                                            selectedTarget: '',
                                                            usedTargets: []
                                                        }));

                                                        setSnackbar({
                                                            open: true,
                                                            message:
                                                                'Đã reset mẫu về trạng thái ban đầu',
                                                            severity: 'success'
                                                        });
                                                    } else {
                                                        setSnackbar({
                                                            open: true,
                                                            message: 'Lỗi khi reset mẫu',
                                                            severity: 'error'
                                                        });
                                                    }
                                                } catch (error) {
                                                    console.error(
                                                        '❌ Error in reset handler:',
                                                        error
                                                    );
                                                    setSnackbar({
                                                        open: true,
                                                        message: 'Lỗi khi reset mẫu',
                                                        severity: 'error'
                                                    });
                                                }
                                            }}
                                            startIcon={<RestartAltIcon />}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Khôi phục mẫu
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => {
                                                if (editorState.selectedRecord) {
                                                    setTemplateSelectionModal({
                                                        open: true,
                                                        record: editorState.selectedRecord
                                                    });
                                                }
                                            }}
                                            startIcon={<EditIcon />}
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Đổi mẫu
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={handleDownloadClick}
                                            startIcon={<Download />}
                                            disabled={!editorState.syncfusionDocumentReady}
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            Tải xuống
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={handlePrintClick}
                                            startIcon={<PrintIcon />}
                                            disabled={!editorState.syncfusionDocumentReady}
                                            sx={{
                                                borderRadius: 1,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            In
                                        </Button>
                                    </Box>
                                </Box>
                                <CardContent
                                    sx={{
                                        height: '100%'
                                    }}
                                >
                                    {editorState.syncfusionLoading && (
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
                                    {!editorState.syncfusionDocumentReady &&
                                        !editorState.syncfusionLoading && (
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
                                                    Đang chuẩn bị tài liệu
                                                </Typography>
                                            </Box>
                                        )}
                                    <DocumentEditorContainerComponent
                                        id="sf-docx-editor-modal"
                                        ref={sfContainerRef}
                                        serviceUrl={SYNCFUSION_SERVICE_URL}
                                        enableToolbar={false}
                                        showPropertiesPane={false}
                                        height={'100%'}
                                        fileMenuItems={['Print']}
                                        enableLocalPaste={true}
                                    />
                                    {/* <DocumentEditorContainerComponent
                                        id="sf-docx-editor-modal"
                                        ref={sfContainerRef}
                                        serviceUrl={SYNCFUSION_SERVICE_URL}
                                        enableToolbar={true}
                                        showPropertiesPane={false}
                                        height={'100%'}
                                        style={{
                                            display: 'block',
                                            borderWidth: '0',
                                            borderColor: '0'
                                        }}
                                        toolbarMode={'Ribbon'}
                                        ribbonLayout={'Classic'}
                                        locale="vi-VN"
                                        fileMenuItems={['Print']}
                                    /> */}
                                </CardContent>
                            </Card>
                            <Card
                                sx={{
                                    width: { xs: '100%', lg: '30%' },
                                    height: { xs: '40%', lg: '100%' },
                                    borderRadius: { xs: 1, sm: 2 },
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    overflow: 'hidden'
                                }}
                            >
                                <CardContent
                                    sx={{ p: 3, height: 'calc(100% - 60px)', overflow: 'auto' }}
                                >
                                    <Box sx={{ mb: 4 }}>
                                        {/* Target Selector - Chung cho cả 2 modes */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1, fontWeight: 600 }}
                                            >
                                                Chọn đối tượng để điền dữ liệu:
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FormControl
                                                    size="small"
                                                    sx={{ maxWidth: 120, minWidth: 120 }}
                                                >
                                                    <InputLabel>Đối tượng</InputLabel>
                                                    <Select
                                                        size="small"
                                                        value={targetState.selectedTarget}
                                                        label="Đối tượng"
                                                        onChange={e =>
                                                            setTargetState(prev => ({
                                                                ...prev,
                                                                selectedTarget: e.target.value
                                                            }))
                                                        }
                                                        disabled={
                                                            targetState.availableTargets.length ===
                                                            0
                                                        }
                                                    >
                                                        <MenuItem value="">
                                                            <em>Mặc định</em>
                                                        </MenuItem>
                                                        {targetState.availableTargets.map(
                                                            target => (
                                                                <MenuItem
                                                                    key={target}
                                                                    value={target}
                                                                >
                                                                    Đối tượng {target} (_{target})
                                                                </MenuItem>
                                                            )
                                                        )}
                                                    </Select>
                                                </FormControl>
                                            </Box>
                                            {targetState.usedTargets.length > 0 && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mt: 1 }}
                                                >
                                                    Đã sử dụng:{' '}
                                                    {targetState.usedTargets
                                                        .map(t => `_${t}`)
                                                        .join(', ')}
                                                </Typography>
                                            )}
                                            {targetState.availableTargets.length === 0 && (
                                                <Typography
                                                    variant="body2"
                                                    color="info.main"
                                                    sx={{ mt: 1, fontStyle: 'italic' }}
                                                >
                                                    💡 Mẫu này không có trường đặc biệt (_1, _2,
                                                    _3). Sử dụng chế độ "Mặc định" để điền dữ liệu.
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                mb: 3,
                                                p: 1,
                                                background: 'rgba(0,0,0,0.05)',
                                                borderRadius: 1
                                            }}
                                        >
                                            <Button
                                                variant={
                                                    scanState.inputMode === 'ntsoft'
                                                        ? 'contained'
                                                        : 'outlined'
                                                }
                                                startIcon={<SmartphoneIcon />}
                                                size="medium"
                                                sx={{
                                                    flex: 1,
                                                    textTransform: 'none',
                                                    borderRadius: 1.5,
                                                    fontWeight: 600,
                                                    ...(scanState.inputMode === 'ntsoft' && {
                                                        background:
                                                            'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                        boxShadow: '0 4px 15px rgba(25,118,210,0.4)'
                                                    })
                                                }}
                                                onClick={() => handleInputModeChange('ntsoft')}
                                            >
                                                NTSoft AI
                                            </Button>
                                            <Button
                                                variant={
                                                    scanState.inputMode === 'scanner'
                                                        ? 'contained'
                                                        : 'outlined'
                                                }
                                                startIcon={<AdfScannerIcon />}
                                                size="medium"
                                                sx={{
                                                    flex: 1,
                                                    textTransform: 'none',
                                                    borderRadius: 1.5,
                                                    fontWeight: 600,
                                                    ...(scanState.inputMode === 'scanner' && {
                                                        background:
                                                            'linear-gradient(45deg, #9c27b0, #e91e63)',
                                                        boxShadow: '0 4px 15px rgba(156,39,176,0.4)'
                                                    })
                                                }}
                                                onClick={() => handleInputModeChange('scanner')}
                                            >
                                                Scanner
                                            </Button>
                                        </Box>
                                        {scanState.inputMode !== 'scanner' ? (
                                            <Box
                                                sx={{
                                                    borderRadius: 1,
                                                    p: 2,
                                                    border: '1px solid rgba(25,118,210,0.2)'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        mb: 2
                                                    }}
                                                >
                                                    <Chip
                                                        icon={
                                                            <WifiIcon
                                                                style={{
                                                                    color: 'white'
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            socketStatus === 'connected'
                                                                ? 'Đã kết nối'
                                                                : 'Mất kết nối'
                                                        }
                                                        variant="filled"
                                                        sx={{
                                                            backgroundColor:
                                                                socketStatus === 'connected'
                                                                    ? 'success.main'
                                                                    : 'error.main',
                                                            color: 'white',
                                                            fontWeight: 600,
                                                            animation:
                                                                socketStatus === 'connected'
                                                                    ? 'pulse 2s infinite'
                                                                    : 'none'
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            mb: 1,
                                                            fontWeight: 600,
                                                            color: 'primary.main'
                                                        }}
                                                    >
                                                        Hướng dẫn sử dụng
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            lineHeight: 1.2,
                                                            fontStyle: 'italic'
                                                        }}
                                                    >
                                                        1. Mở ứng dụng{' '}
                                                        <strong>NTSoft Document AI</strong>
                                                        <br />
                                                        2. Quét QR code CCCD/CMND
                                                        <br />
                                                        3. Dữ liệu sẽ tự động điền vào mẫu đơn
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    // background:
                                                    //     'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)',
                                                    borderRadius: 1,
                                                    p: 2,
                                                    border: '1px solid rgba(156,39,176,0.2)'
                                                }}
                                            >
                                                <Box sx={{ textAlign: 'center', mb: 2 }}>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: 'secondary.main'
                                                        }}
                                                    >
                                                        Hướng dẫn sử dụng
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        lineHeight: 1.6,
                                                        fontStyle: 'italic',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    1. Đặt con trỏ vào ô nhập liệu
                                                    <br />
                                                    2. Kết nối máy quét và quét
                                                    <br />
                                                    3. <strong>Dữ liệu</strong> sẽ tự động chèn vào
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    {/* Input Section */}
                                    {scanState.inputMode === 'scanner' && (
                                        <>
                                            <Box sx={{ mb: 4 }}>
                                                <TextField
                                                    autoFocus
                                                    multiline
                                                    rows={5}
                                                    fullWidth
                                                    value={scanState.inputText}
                                                    onKeyDown={handleKeyDown}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>
                                                    ) => handleInputTextChange(e.target.value)}
                                                    placeholder="Ví dụ: 012345678901|012345678901|NGUYEN VAN A|01/01/1990|Nam|Hà Nội|01/01/2022"
                                                    variant="outlined"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 1,
                                                            background:
                                                                'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                                                        },
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '0.9rem',
                                                            fontFamily:
                                                                'Monaco, "Lucida Console", monospace',
                                                            lineHeight: 1.6
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        </>
                                    )}
                                    <Box sx={{ my: 3 }}>
                                        <Divider
                                            sx={{
                                                borderColor: 'rgba(0,0,0,0.1)',
                                                '&::before, &::after': {
                                                    borderColor: 'rgba(0,0,0,0.1)'
                                                }
                                            }}
                                        >
                                            <Chip
                                                label="Thông tin thủ tục"
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'primary.main',
                                                    color: 'white',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </Divider>
                                    </Box>
                                    {/* Thông tin thủ tục Section */}
                                    <Box>
                                        {[
                                            {
                                                label: 'Lĩnh vực',
                                                value:
                                                    editorState.selectedRecord?.linhVuc ||
                                                    '— Chưa chọn mẫu —',
                                                subValue: (() => {
                                                    if (!editorState.selectedRecord?.linhVuc)
                                                        return null;
                                                    // Tìm maLinhVuc tương ứng với tenLinhVuc
                                                    const linhVuc = linhVucList.find(
                                                        lv =>
                                                            lv.tenLinhVuc ===
                                                            editorState.selectedRecord?.linhVuc
                                                    );
                                                    return linhVuc
                                                        ? `Mã: ${linhVuc.maLinhVuc}`
                                                        : null;
                                                })()
                                            },
                                            {
                                                label: 'Tên thủ tục',
                                                value:
                                                    editorState.selectedRecord?.tenTTHC ||
                                                    '— Chưa chọn mẫu —'
                                            },
                                            {
                                                label: 'Đối tượng thực hiện',
                                                value:
                                                    editorState.selectedRecord?.doiTuong ||
                                                    '— Chưa chọn mẫu —'
                                            },
                                            {
                                                label: 'Mã thủ tục',
                                                value:
                                                    editorState.selectedRecord?.maTTHC ||
                                                    '— Chưa chọn mẫu —'
                                            },
                                            {
                                                label: 'Cấp thực hiện',
                                                value:
                                                    editorState.selectedRecord?.capThucHien ||
                                                    '— Chưa chọn mẫu —'
                                            },
                                            {
                                                label: 'Quyết định công bố',
                                                value:
                                                    editorState.selectedRecord?.qdCongBo ||
                                                    '— Chưa chọn mẫu —'
                                            }
                                        ].map((field, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'start',
                                                    mb: 1
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: 'text.secondary',
                                                        minWidth: 160 // 👈 căn label gọn gàng
                                                    }}
                                                >
                                                    {field.label}:
                                                </Typography>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color:
                                                                field.value &&
                                                                field.value !== '— Chưa chọn mẫu —'
                                                                    ? 'text.primary'
                                                                    : 'text.disabled',
                                                            fontStyle:
                                                                field.value &&
                                                                field.value !== '— Chưa chọn mẫu —'
                                                                    ? 'normal'
                                                                    : 'italic'
                                                        }}
                                                    >
                                                        {field.value}
                                                    </Typography>
                                                    {field.subValue && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontStyle: 'italic' }}
                                                        >
                                                            {field.subValue}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    </DialogContent>
                </Dialog>
                {/* Modal chọn mẫu đơn */}
                <Dialog
                    open={templateSelectionModal.open}
                    onClose={() => setTemplateSelectionModal({ open: false, record: null })}
                    maxWidth="md"
                    fullWidth
                    sx={{
                        '& .MuiDialog-paper': {
                            borderRadius: 1,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    <Box
                        sx={{
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            color: 'white',
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Chọn mẫu đơn - {templateSelectionModal.record?.tenTTHC}
                        </Typography>
                        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={refreshWorkingDocuments}
                                disabled={workingDocsState.isLoading}
                                sx={{
                                    color: 'white',
                                    borderColor: 'white',
                                    '&:hover': {
                                        borderColor: 'white',
                                        backgroundColor: 'rgba(255,255,255,0.1)'
                                    }
                                }}
                            >
                                {workingDocsState.isLoading ? (
                                    <CircularProgress size={16} sx={{ color: 'white' }} />
                                ) : (
                                    '🔄 Làm mới IndexedDB'
                                )}
                            </Button>
                            <IconButton
                                onClick={() => setTemplateSelectionModal({ open: false, record: null })}
                                sx={{ color: 'white' }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box> */}
                    </Box>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Vui lòng chọn một mẫu đơn từ danh sách bên dưới để tiếp tục:
                        </Typography>

                        {/* CSV Templates Section */}
                        {templateSelectionModal.record?.danhSachMauDon &&
                            templateSelectionModal.record.danhSachMauDon.length > 0 && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn hệ thống
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            mb: 4
                                        }}
                                    >
                                        {templateSelectionModal.record.danhSachMauDon.map(
                                            (mauDon, index) => (
                                                <Paper
                                                    key={`csv-${index}`}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 3,
                                                        borderRadius: 1,
                                                        border: '2px solid transparent',
                                                        background:
                                                            'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow:
                                                                '0 8px 25px rgba(25,118,210,0.15)',
                                                            borderColor: '#1976d2'
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        // Cập nhật selectedMauDon cho record
                                                        const updatedRecord = {
                                                            ...templateSelectionModal.record!,
                                                            selectedMauDon: mauDon
                                                        };
                                                        setTemplateSelectionModal({
                                                            open: false,
                                                            record: null
                                                        });

                                                        // Trực tiếp mở editor thay vì gọi handleSelectTemplate
                                                        setEditorState(prev => ({
                                                            ...prev,
                                                            selectedRecord: updatedRecord,
                                                            showEditorModal: true,
                                                            syncfusionLoading: true,
                                                            syncfusionDocumentReady: false
                                                        }));

                                                        setSnackbar({
                                                            open: true,
                                                            message: `Đang tải mẫu: ${updatedRecord.tenTTHC}`,
                                                            severity: 'info'
                                                        });
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{ fontWeight: 600, mb: 1 }}
                                                            >
                                                                {mauDon.tenFile}
                                                            </Typography>
                                                            {mauDon.tenGiayTo && (
                                                                <Typography
                                                                    variant="body2"
                                                                    color="text.secondary"
                                                                >
                                                                    {mauDon.tenGiayTo}
                                                                </Typography>
                                                            )}
                                                            <Typography
                                                                variant="caption"
                                                                color="primary"
                                                                sx={{ fontStyle: 'italic' }}
                                                            >
                                                                {mauDon.duongDan}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            justifyContent: 'flex-end'
                                                        }}
                                                    >
                                                        <Button
                                                            variant="contained"
                                                            size="medium"
                                                            startIcon={<EditIcon />}
                                                            sx={{
                                                                borderRadius: 1,
                                                                textTransform: 'none',
                                                                fontWeight: 600,
                                                                background:
                                                                    'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                                '&:hover': {
                                                                    background:
                                                                        'linear-gradient(45deg, #1565c0, #1976d2)',
                                                                    transform: 'translateY(-2px)'
                                                                },
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        >
                                                            Sử dụng mẫu này
                                                        </Button>
                                                    </Box>
                                                </Paper>
                                            )
                                        )}
                                    </Box>
                                </>
                            )}

                        {/* IndexedDB Working Documents Section */}
                        {templateSelectionModal.record?.maTTHC &&
                            hasWorkingDocuments(templateSelectionModal.record.maTTHC) && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn được thiết lập
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {getWorkingDocumentsForMaTTHC(
                                            templateSelectionModal.record.maTTHC
                                        ).map((workingDoc, index) => (
                                            <Paper
                                                key={`indexeddb-${index}`}
                                                variant="outlined"
                                                sx={{
                                                    p: 3,
                                                    borderRadius: 1,
                                                    border: '2px solid transparent',
                                                    background:
                                                        'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow:
                                                            '0 8px 25px rgba(25,118,210,0.15)',
                                                        borderColor: '#1976d2'
                                                    }
                                                }}
                                                onClick={() => {
                                                    // Create a custom mauDon object from working document
                                                    const customMauDon = {
                                                        tenGiayTo: `Tài liệu đã lưu - ${workingDoc.fileName}`,
                                                        tenFile: workingDoc.fileName,
                                                        duongDan: `IndexedDB - ${new Date(workingDoc.updatedAt).toLocaleDateString('vi-VN')}`,
                                                        isFromIndexedDB: true,
                                                        workingDocument: workingDoc
                                                    };

                                                    // Cập nhật selectedMauDon cho record
                                                    const updatedRecord = {
                                                        ...templateSelectionModal.record!,
                                                        selectedMauDon: customMauDon
                                                    };
                                                    setTemplateSelectionModal({
                                                        open: false,
                                                        record: null
                                                    });

                                                    // Trực tiếp mở editor thay vì gọi handleSelectTemplate
                                                    setEditorState(prev => ({
                                                        ...prev,
                                                        selectedRecord: updatedRecord,
                                                        showEditorModal: true,
                                                        syncfusionLoading: true,
                                                        syncfusionDocumentReady: false
                                                    }));

                                                    setSnackbar({
                                                        open: true,
                                                        message: `Đang tải mẫu từ IndexedDB: ${workingDoc.fileName}`,
                                                        severity: 'info'
                                                    });
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{ fontWeight: 600, mb: 1 }}
                                                        >
                                                            {workingDoc.fileName}
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Mẫu đơn tùy chỉnh
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="primary"
                                                            sx={{ fontStyle: 'italic' }}
                                                        >
                                                            {workingDoc.fileName}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'flex-end'
                                                    }}
                                                >
                                                    <Button
                                                        variant="contained"
                                                        size="medium"
                                                        startIcon={<EditIcon />}
                                                        sx={{
                                                            borderRadius: 1,
                                                            textTransform: 'none',
                                                            fontWeight: 600,
                                                            background:
                                                                'linear-gradient(45deg, #1976d2, #42a5f5)',
                                                            '&:hover': {
                                                                background:
                                                                    'linear-gradient(45deg, #1565c0, #1976d2)',
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        Sử dụng mẫu này
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </>
                            )}

                        {/* No templates message */}
                        {(!templateSelectionModal.record?.danhSachMauDon ||
                            templateSelectionModal.record.danhSachMauDon.length === 0) &&
                            (!templateSelectionModal.record?.maTTHC ||
                                !hasWorkingDocuments(templateSelectionModal.record.maTTHC)) && (
                                <Paper
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        borderRadius: 1,
                                        background:
                                            'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                        border: '2px dashed #dee2e6'
                                    }}
                                >
                                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                                        📄 Không có mẫu đơn nào
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Không tìm thấy mẫu đơn nào cho thủ tục này trong hệ thống
                                        hoặc IndexedDB.
                                    </Typography>
                                </Paper>
                            )}
                    </DialogContent>
                </Dialog>
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
        </>
    );
}
export const Route = createLazyFileRoute('/template-filler/')({
    component: TemplateFillerComponent
});
