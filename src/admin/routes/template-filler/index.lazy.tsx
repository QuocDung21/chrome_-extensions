import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { saveAs } from 'file-saver';
// --- THƯ VIỆN ---
import { Socket, io } from 'socket.io-client';

import { Global, css } from '@emotion/react';
// --- ICON ---
import {
    Add,
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
    Star,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import AdfScannerIcon from '@mui/icons-material/AdfScanner';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import {
    Alert,
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
    Toolbar
} from '@syncfusion/ej2-react-documenteditor';
import '@syncfusion/ej2-react-documenteditor/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import { createLazyFileRoute } from '@tanstack/react-router';

import { LinhVuc, linhVucApiService } from '@/admin/services/linhVucService';
import { formatDDMMYYYY } from '@/admin/utils/formatDate';

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
    isTemplateAvailable: boolean;
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
        // Check if any template in danhSachMauDon exists
        let hasAvailableTemplate = false;
        let selectedMauDon: MauDon | undefined;
        for (const mauDon of record.danhSachMauDon) {
            const exists = await checkTemplateExists(record, mauDon);
            if (exists) {
                hasAvailableTemplate = true;
                selectedMauDon = mauDon;
                break;
            }
        }
        enhancedRecords.push({
            ...record,
            isTemplateAvailable: hasAvailableTemplate,
            selectedMauDon
        });
    }
    return enhancedRecords;
};
const filterRecords = (
    records: EnhancedTTHCRecord[],
    filters: FilterState
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
        if (filters.linhVuc && !record.linhVuc.includes(filters.linhVuc)) {
            return false;
        }
        if (filters.doiTuong && !record.doiTuong.includes(filters.doiTuong)) {
            return false;
        }
        if (filters.capThucHien && !record.capThucHien.includes(filters.capThucHien)) {
            return false;
        }
        if (filters.availability === 'available' && !record.isTemplateAvailable) {
            return false;
        }
        if (filters.availability === 'unavailable' && record.isTemplateAvailable) {
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
        console.log('📱 Detected mobile socket format, using as-is');
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
// --- MEMOIZED COMPONENTS ---
// const TemplateCard = React.memo<{
//     record: EnhancedTTHCRecord;
//     index: number;
//     onSelect: (record: EnhancedTTHCRecord) => void;
//     onSelectTemplate: (record: EnhancedTTHCRecord) => void;
// }>(({ record, index, onSelect, onSelectTemplate }) => (
//     <Paper
//         variant="outlined"
//         sx={{
//             p: 3,
//             mb: 3,
//             borderRadius: 1,
//             border: '1px solid #939AA0FF',
//             background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
//             position: 'relative',
//             overflow: 'hidden',
//             '&::before': {
//                 content: '""',
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 background:
//                     'linear-gradient(135deg, rgba(25,118,210,0.03) 0%, rgba(66,165,245,0.03) 100%)',
//                 opacity: 0,
//                 transition: 'opacity 0.3s ease',
//                 zIndex: 0
//             },
//             '&:hover': {
//                 transform: 'translateY(-4px)',
//                 boxShadow: '0 12px 40px rgba(25,118,210,0.15)',
//                 borderColor: '#1976d2',
//                 '&::before': {
//                     opacity: 1
//                 }
//             },
//             transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
//             cursor: 'pointer',
//             animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
//         }}
//         onClick={() => onSelect(record)}
//     >
//         <Box
//             sx={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'flex-start',
//                 position: 'relative',
//                 zIndex: 1
//             }}
//         >
//             <Box sx={{ flex: 1, pr: 2 }}>
//                 <Typography
//                     variant="body2"
//                     sx={{
//                         fontWeight: 700,
//                         mb: 2,
//                         background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
//                         backgroundClip: 'text',
//                         WebkitBackgroundClip: 'text',
//                         WebkitTextFillColor: 'transparent',
//                         lineHeight: 1.2
//                     }}
//                 >
//                     {record.tenTTHC}
//                 </Typography>
//                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
//                     <Chip
//                         label={record.maTTHC}
//                         size="small"
//                         variant="outlined"
//                         color="primary"
//                         sx={{
//                             fontWeight: 600,
//                             fontSize: '0.75rem'
//                         }}
//                     />
//                     <Chip
//                         label={record.linhVuc}
//                         size="small"
//                         variant="filled"
//                         color="secondary"
//                         sx={{
//                             fontWeight: 500,
//                             fontSize: '0.75rem'
//                         }}
//                     />
//                 </Box>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                     <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
//                     <Typography variant="body2" color="text.secondary">
//                         {record.doiTuong || 'Công dân Việt Nam'}
//                     </Typography>
//                 </Box>
//             </Box>
//             <Box
//                 sx={{
//                     display: 'flex',
//                     flexDirection: 'column',
//                     gap: 2,
//                     alignItems: 'flex-end',
//                     minWidth: 140
//                 }}
//             >
//                 <Chip
//                     label={`${record.danhSachMauDon.length} mẫu`}
//                     color="success"
//                     size="small"
//                     variant="filled"
//                     sx={{
//                         fontWeight: 600,
//                         fontSize: '0.75rem',
//                         boxShadow: '0 2px 8px rgba(76,175,80,0.3)'
//                     }}
//                 />
//                 <Button
//                     variant="contained"
//                     size="medium"
//                     startIcon={<EditIcon />}
//                     onClick={e => {
//                         e.stopPropagation();
//                         onSelectTemplate(record);
//                     }}
//                     sx={{
//                         borderRadius: 1,
//                         textTransform: 'none',
//                         fontWeight: 600,
//                         px: 3,
//                         background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
//                         boxShadow: '0 4px 15px rgba(25,118,210,0.4)',
//                         '&:hover': {
//                             background: 'linear-gradient(45deg, #1565c0, #1976d2)',
//                             boxShadow: '0 6px 20px rgba(25,118,210,0.6)',
//                             transform: 'translateY(-2px)'
//                         },
//                         transition: 'all 0.3s ease'
//                     }}
//                 >
//                     Chọn mẫu
//                 </Button>
//             </Box>
//         </Box>
//     </Paper>
// ));

function LinhVucListComponent() {
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State mới để lưu mã lĩnh vực được chọn
    const [selectedLinhVuc, setSelectedLinhVuc] = useState('');

    useEffect(() => {
        const fetchLinhVuc = async () => {
            setLoading(true);
            setError(null);
            const response = await linhVucApiService.getAllLinhVuc(3, 100);

            if (response.success && response.data) {
                setLinhVucList(response.data.items);
            } else {
                setError(response.error?.message || 'Không thể tải dữ liệu.');
            }
            setLoading(false);
        };
        fetchLinhVuc();
    }, []);

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedLinhVuc(event.target.value);
    };

    if (loading) return <div>Đang tải danh sách lĩnh vực...</div>;
    if (error) return <div>Lỗi: {error}</div>;

    return (
        <FormControl fullWidth>
            <InputLabel id="linh-vuc-select-label">🏢 Lĩnh vực</InputLabel>
            <Select
                labelId="linh-vuc-select-label"
                value={selectedLinhVuc}
                label="🏢 Lĩnh vực"
                onChange={handleChange}
            >
                <MenuItem value="">
                    <em>Tất cả lĩnh vực</em>
                </MenuItem>
                {/* 3. Map qua danh sách và gán đúng giá trị */}
                {linhVucList.map(item => (
                    <MenuItem key={item.maLinhVuc} value={item.maLinhVuc}>
                        {item.tenLinhVuc}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

const TemplateCard = React.memo<{
    record: EnhancedTTHCRecord;
    index: number;
    onSelect: (record: EnhancedTTHCRecord) => void;
    onSelectTemplate: (record: EnhancedTTHCRecord) => void;
}>(({ record, index, onSelect, onSelectTemplate }) => {
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
                        justifyContent: 'flex-start',
                        mb: 1.5,
                        gap: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        <Typography component="span" fontWeight="500" fontSize={14}>
                            Cấp thực hiện:
                        </Typography>
                        {record.capThucHien}
                    </Typography>
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
            <Box sx={{ px: 1, pb: 1 }}>
                {/* <Box
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
                </Box> */}
                <CardActions
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1
                    }}
                >
                    {!hasTemplates ? (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            (Chưa có mẫu đơn/tờ khai trong dữ liệu)
                        </Typography>
                    ) : (
                        <Button variant="contained" size="small" onClick={() => onSelect(record)}>
                            Xem chi tiết
                        </Button>
                    )}
                </CardActions>
            </Box>
        </Card>
    );
});

TemplateCard.displayName = 'TemplateCard';
// Apply data to Syncfusion editor
const applyDataToSyncfusion = async (
    editor: DocumentEditorContainerComponent | null,
    data: ProcessingData
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
        // Create replace map for exact placeholder matching
        const replaceMap: Record<string, string> = {
            '{ho_ten}': data.hoTen || data.ho_ten || '',
            '{cccd}': data.cccd || data.so_cccd || '',
            '{cmnd}': data.cmnd || data.so_cmnd || '',
            '{so_cccd}': data.so_cccd || data.cccd || '',
            '{so_cmnd}': data.so_cmnd || data.cmnd || '',
            '{ngay_sinh}': data.ngaySinh || data.ngay_sinh || '',
            '{gioi_tinh}': data.gioiTinh || data.gioi_tinh || '',
            '{noi_cu_tru}': data.diaChi || data.noiCuTru || data.noi_cu_tru || '',
            '{dan_toc}': data.danToc || data.dan_toc || '',
            '{noi_cap}': data.noiCap || data.noi_cap || '',
            '{ngay_cap}': data.ngayCap || data.ngay_cap || '',
            '{ns_ngay}': data.ns_ngay || '',
            '{ns_thang}': data.ns_thang || '',
            '{ns_nam}': data.ns_nam || '',
            '{nc_ngay}': data.nc_ngay || '',
            '{nc_thang}': data.nc_thang || '',
            '{nc_nam}': data.nc_nam || ''
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
    // State cho danh sách mẫu
    const [csvRecords, setCsvRecords] = useState<EnhancedTTHCRecord[]>([]);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        doiTuong: [],
        capThucHien: [],
        thuTucByLinhVuc: {}
    });
    const handlePrintClick = async () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            await sfContainerRef.current.documentEditor.print();
        } else {
            console.error('Document editor not ready to print.');
        }
    };
    const handlePrintClickAlternative = async () => {
        try {
            if (!sfContainerRef.current || !sfContainerRef.current.documentEditor) {
                console.error('Document editor not ready to print.');
                setSnackbar({
                    open: true,
                    message: 'Document editor chưa sẵn sàng để in',
                    severity: 'error'
                });
                return;
            }
            if (!editorState.syncfusionDocumentReady) {
                setSnackbar({
                    open: true,
                    message: 'Vui lòng đợi document tải xong trước khi in',
                    severity: 'warning'
                });
                return;
            }
            // Sử dụng Print service module của Syncfusion
            console.log('🖨️ Using Syncfusion Print service...');
            // Lấy SFDT content
            const sfdtContent = sfContainerRef.current.documentEditor.serialize();
            if (!sfdtContent) {
                throw new Error('Không thể lấy nội dung tài liệu');
            }
            // Gửi đến Syncfusion Print service
            const printServiceUrl = `${SYNCFUSION_SERVICE_URL}SystemClipboard`;
            const response = await fetch(printServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: sfdtContent,
                    type: 'Print'
                })
            });
            if (response.ok) {
                // Trigger browser print dialog
                const printContent = await response.text();
                // Tạo iframe để print
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    iframeDoc.write(printContent);
                    iframeDoc.close();
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                }
                setSnackbar({
                    open: true,
                    message: 'Đã mở hộp thoại in',
                    severity: 'success'
                });
            } else {
                throw new Error(`Print service error: ${response.status}`);
            }
        } catch (error: any) {
            console.error('❌ Print service failed:', error);
            // Fallback to simple print
            try {
                sfContainerRef.current?.documentEditor?.print();
                setSnackbar({
                    open: true,
                    message: 'Sử dụng chức năng in mặc định',
                    severity: 'info'
                });
            } catch (fallbackError) {
                setSnackbar({
                    open: true,
                    message: `Lỗi khi in: ${error?.message || 'Không xác định'}`,
                    severity: 'error'
                });
            }
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
        linhVuc: '',
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
        return filteredRecords.filter(r => r.isTemplateAvailable);
    }, [filteredRecords]);
    // Memoized statistics for header
    const templateStats = useMemo(() => {
        const available = filteredRecords.filter(r => r.isTemplateAvailable).length;
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
        if (!record.isTemplateAvailable || !record.selectedMauDon) {
            setSnackbar({
                open: true,
                message: `Mẫu đơn "${record.tenTTHC}" chưa có sẵn trong hệ thống`,
                severity: 'warning'
            });
            return;
        }
        // Test template URL immediately
        const templateUrl = buildDocxUrlForRecord(record, record.selectedMauDon);
        console.log('🔍 Testing template URL:', templateUrl);
        setEditorState(prev => ({
            ...prev,
            selectedRecord: record,
            showEditorModal: true,
            syncfusionLoading: true,
            syncfusionDocumentReady: false
        }));
        setSnackbar({
            open: true,
            message: `Đang tải mẫu: ${record.tenTTHC}`,
            severity: 'info'
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
            const templateUrl = buildDocxUrlForRecord(record, record.selectedMauDon);
            console.log('📁 Template URL:', templateUrl);
            const res = await fetch(templateUrl);
            if (!res.ok) {
                console.error('❌ Failed to fetch template:', res.status, res.statusText);
                throw new Error(`Không thể tải file mẫu: ${res.status} ${res.statusText}`);
            }
            const blob = await res.blob();
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
                        setEditorState(prev => ({
                            ...prev,
                            syncfusionDocumentReady: true,
                            syncfusionLoading: false
                        }));
                        console.log('✅ Syncfusion document ready for data insertion');
                        setSnackbar({
                            open: true,
                            message: `Đã tải thành công: ${record.tenTTHC}`,
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
                    const processingData = convertScannedInfoToProcessingData(data);
                    console.log('🔄 Converted mobile data to ProcessingData:', processingData);
                    const success = await applyDataToSyncfusion(
                        sfContainerRef.current,
                        processingData
                    );
                    // Update extracted data in scan state
                    setScanState(prev => ({
                        ...prev,
                        extractedData: processingData
                    }));
                    if (success) {
                        setSnackbar({
                            open: true,
                            message: 'Đã chèn dữ liệu từ NTS DocumentAI',
                            severity: 'success'
                        });
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
    }, [on, off, editorState.selectedRecord, editorState.syncfusionDocumentReady]);
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
            const success = await applyDataToSyncfusion(sfContainerRef.current, processingData);
            if (success) {
                setSnackbar({
                    open: true,
                    message: 'Đã phân tích và điền dữ liệu thành công!',
                    severity: 'success'
                });
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
                <Card
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
                        title="Bộ lọc tìm kiếm"
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                        <LinhVucListComponent />
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: '1fr 1fr',
                                    md: 'repeat(4, 1fr)'
                                },
                                gap: 3,
                                mb: 2
                            }}
                        >
                            <FormControl
                                fullWidth
                                size="medium"
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
                            >
                                <InputLabel sx={{ fontWeight: 500 }}> Lĩnh vực</InputLabel>
                                <Select
                                    value={filters.linhVuc}
                                    label="🏢 Lĩnh vực"
                                    onChange={e => handleFilterChange('linhVuc', e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Tất cả lĩnh vực</em>
                                    </MenuItem>
                                    {filterOptions.linhVuc.map(item => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                fullWidth
                                size="medium"
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
                            >
                                <InputLabel sx={{ fontWeight: 500 }}> Đối tượng</InputLabel>
                                <Select
                                    value={filters.doiTuong}
                                    label="👥 Đối tượng"
                                    onChange={e => handleFilterChange('doiTuong', e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Tất cả đối tượng</em>
                                    </MenuItem>
                                    {filterOptions.doiTuong.map(item => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                fullWidth
                                size="medium"
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
                            >
                                <InputLabel sx={{ fontWeight: 500, fontSize: 14 }}>
                                    Cấp thực hiện
                                </InputLabel>
                                <Select
                                    value={filters.capThucHien}
                                    label=" Cấp thực hiện"
                                    onChange={e =>
                                        handleFilterChange('capThucHien', e.target.value)
                                    }
                                >
                                    <MenuItem value="">
                                        <em>Tất cả cấp</em>
                                    </MenuItem>
                                    {filterOptions.capThucHien.map(item => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl
                                fullWidth
                                size="medium"
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
                            >
                                <InputLabel sx={{ fontWeight: 500 }}>✅ Trạng thái mẫu</InputLabel>
                                <Select
                                    value={filters.availability}
                                    label="Trạng thái mẫu"
                                    onChange={e =>
                                        handleFilterChange('availability', e.target.value)
                                    }
                                >
                                    <MenuItem value="all">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Tất cả
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="available">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Có sẵn mẫu
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="unavailable">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Chưa có mẫu
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ pt: 0 }}>
                            <TextField
                                fullWidth
                                size="medium"
                                value={filters.searchText}
                                onChange={e => handleFilterChange('searchText', e.target.value)}
                                placeholder="Tìm kiếm thủ tục, mã, lĩnh vực, đối tượng, quyết định công bố..."
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
                        </Box>
                        {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                onClick={handleClearFilters}
                                size="medium"
                                sx={{
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 3,
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        </Box> */}
                    </CardContent>
                </Card>
                {/* Template List */}
                <Card
                    sx={{
                        borderRadius: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease'
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
                        action={
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                    icon={<CheckCircleIcon />}
                                    label={`${templateStats.available} có sẵn`}
                                    color="success"
                                    size="small"
                                    variant="filled"
                                    sx={{
                                        fontWeight: 600,
                                        '& .MuiChip-icon': {
                                            color: 'inherit'
                                        }
                                    }}
                                />
                                <Chip
                                    label={`${templateStats.total} tổng cộng`}
                                    color="primary"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontWeight: 500 }}
                                />
                            </Box>
                        }
                    />
                    <CardContent sx={{ pt: 0 }}>
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
                                    maxHeight: '65vh',
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
                                        onSelectTemplate={record => {
                                            setTemplateSelectionModal({
                                                open: true,
                                                record
                                            });
                                        }}
                                    />
                                ))}
                                {templateStats.available === 0 && (
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
                                        style={{
                                            display: 'block',
                                            borderWidth: '0',
                                            borderColor: '0'
                                        }}
                                        toolbarMode={'Ribbon'}
                                        locale="vi-VN"
                                    />
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
                                                label="Dữ liệu đã trích xuất"
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'primary.main',
                                                    color: 'white',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </Divider>
                                    </Box>
                                    {/* Results Section */}
                                    <Box>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr',
                                                gap: 2
                                            }}
                                        >
                                            {[
                                                {
                                                    label: 'Số CMND',
                                                    value:
                                                        scanState.extractedData?.cmnd ||
                                                        scanState.extractedData?.so_cmnd
                                                },
                                                {
                                                    label: 'Số CCCD',
                                                    value:
                                                        scanState.extractedData?.cccd ||
                                                        scanState.extractedData?.so_cccd
                                                },
                                                {
                                                    label: 'Họ tên',
                                                    value:
                                                        scanState.extractedData?.hoTen ||
                                                        scanState.extractedData?.ho_ten
                                                },
                                                {
                                                    label: 'Ngày sinh',
                                                    value:
                                                        scanState.extractedData?.ngaySinh ||
                                                        scanState.extractedData?.ngay_sinh
                                                },
                                                {
                                                    label: 'Giới tính',
                                                    value:
                                                        scanState.extractedData?.gioiTinh ||
                                                        scanState.extractedData?.gioi_tinh
                                                },
                                                {
                                                    label: 'Ngày cấp',
                                                    value:
                                                        scanState.extractedData?.ngayCap ||
                                                        scanState.extractedData?.ngay_cap
                                                },
                                                {
                                                    label: 'Địa chỉ',
                                                    value:
                                                        scanState.extractedData?.diaChi ||
                                                        scanState.extractedData?.noi_cu_tru
                                                }
                                            ].map((field, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        background: field.value
                                                            ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
                                                            : 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
                                                        borderRadius: 1,
                                                        p: 2,
                                                        border: field.value
                                                            ? '1px solid rgba(76,175,80,0.3)'
                                                            : '1px solid rgba(0,0,0,0.1)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: field.value
                                                                ? '0 4px 12px rgba(76,175,80,0.2)'
                                                                : '0 4px 12px rgba(0,0,0,0.1)'
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            mb: 1
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: field.value
                                                                    ? 'success.main'
                                                                    : 'text.secondary',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            {field.label}
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: field.value ? 600 : 400,
                                                            color: field.value
                                                                ? 'text.primary'
                                                                : 'text.secondary',
                                                            fontFamily: field.value
                                                                ? 'inherit'
                                                                : 'monospace',
                                                            fontSize: '0.9rem',
                                                            wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        {field.value || '— Chưa có dữ liệu —'}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
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
                        <IconButton
                            onClick={() => setTemplateSelectionModal({ open: false, record: null })}
                            sx={{ color: 'white' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Vui lòng chọn một mẫu đơn từ danh sách bên dưới để tiếp tục:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {templateSelectionModal.record?.danhSachMauDon.map((mauDon, index) => (
                                <Paper
                                    key={index}
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
                                            boxShadow: '0 8px 25px rgba(25,118,210,0.15)',
                                            borderColor: '#1976d2'
                                        }
                                    }}
                                    onClick={() => {
                                        // Cập nhật selectedMauDon cho record
                                        const updatedRecord = {
                                            ...templateSelectionModal.record!,
                                            selectedMauDon: mauDon
                                        };
                                        setTemplateSelectionModal({ open: false, record: null });
                                        handleSelectTemplate(updatedRecord);
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
                                                <Typography variant="body2" color="text.secondary">
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
