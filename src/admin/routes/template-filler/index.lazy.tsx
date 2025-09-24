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
    MoreHoriz,
    Person as PersonIcon,
    Print as PrintIcon,
    RestartAlt as RestartAltIcon,
    Star,
    Wc as WcIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
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
    Icon,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    SelectChangeEvent,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
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

import { ApiTemplateCard } from '@/admin/components/template-filler/ApiTemplateCard';
import { DataSyncPanel } from '@/admin/components/template-filler/DataSyncPanel';
import { SyncfusionEditorModal } from '@/admin/components/template-filler/SyncfusionEditorModal';
import { ConfigConstant } from '@/admin/constant/config.constant';
import { WorkingDocument, db } from '@/admin/db/db';
import { linhVucRepository } from '@/admin/repository/LinhVucRepository';
import { thanhPhanHoSoTTHCRepository } from '@/admin/repository/ThanhPhanHoSoTTHCRepository';
import { thuTucHCRepository } from '@/admin/repository/ThuTucHCRepository';
import { chuyenDoiApiService } from '@/admin/services/chuyenDoiService';
import { dataSyncService } from '@/admin/services/dataSyncService';
import { LinhVuc, linhVucApiService } from '@/admin/services/linhVucService';
import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';
import { DataSyncDebug } from '@/admin/utils/dataSyncDebug';
import { formatDDMMYYYY, getCurrentDateParts } from '@/admin/utils/formatDate';
import Utils from '@/admin/utils/utils';

DocumentEditorContainerComponent.Inject(Toolbar, Ribbon, Print);
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
    // Optional properties for API template support
    isApiTemplate?: boolean;
    duongDanTepDinhKem?: string;
    tenThanhPhan?: string;
    soBanChinh?: string;
    soBanSao?: string;
    ghiChu?: string | null;
    // Optional property for offline support
    isFromOffline?: boolean;
    thanhPhanHoSoTTHCID?: string;
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
    socketStatus: 'connected' | 'disconnected' | 'connecting' | 'error' | 'disabled';
}

// --- CUSTOM HOOKS ---
const useSocketConnection = (apiUrl: string) => {
    const [socketStatus, setSocketStatus] = useState<
        'connected' | 'disconnected' | 'connecting' | 'error' | 'disabled'
    >('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        // Check if socket URL is valid
        if (!apiUrl || apiUrl.trim() === '') {
            console.warn('⚠️ Socket URL is not configured, disabling socket connection');
            setSocketStatus('disabled');
            return;
        }

        if (socketRef.current?.connected) return;

        console.log(`🔌 Attempting to connect to socket: ${apiUrl}`);
        setSocketStatus('connecting');

        try {
            socketRef.current = io(apiUrl, {
                transports: ['websocket'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: ConfigConstant.SOCKET_RECONNECT_ATTEMPTS,
                reconnectionDelay: ConfigConstant.SOCKET_RECONNECT_DELAY
            });

            socketRef.current.on('connect', () => {
                console.log('✅ Socket connected successfully');
                setSocketStatus('connected');
                setReconnectAttempts(0);
            });

            socketRef.current.on('disconnect', reason => {
                console.log('🔌 Socket disconnected:', reason);
                setSocketStatus('disconnected');
            });

            socketRef.current.on('connect_error', error => {
                console.error('❌ Socket connection error:', error);
                setSocketStatus('error');
                setReconnectAttempts(prev => prev + 1);
            });

            socketRef.current.on('reconnect', attemptNumber => {
                console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
                setSocketStatus('connected');
                setReconnectAttempts(0);
            });

            socketRef.current.on('reconnect_failed', () => {
                console.error('❌ Socket reconnection failed');
                setSocketStatus('error');
            });
        } catch (error) {
            console.error('❌ Failed to initialize socket:', error);
            setSocketStatus('error');
        }
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

const createFilterOptionsFromIndexDB = (
    thuTucHcList: ThuTucHanhChinh[],
    linhVucList: LinhVuc[]
): FilterOptions => {
    const linhVucSet = new Set<string>();
    const doiTuongSet = new Set<string>();
    const capThucHienSet = new Set<string>();
    const thuTucByLinhVuc: { [linhVuc: string]: string[] } = {};

    thuTucHcList.forEach(thuTucHC => {
        // Get linhVuc name from maLinhVuc
        const linhVuc = linhVucList.find(lv => lv.maLinhVuc === thuTucHC.maLinhVuc);
        const linhVucName = linhVuc?.tenLinhVuc || thuTucHC.maLinhVuc;

        if (linhVucName && thuTucHC.tenThuTucHanhChinh) {
            const tenLinhVuc = linhVucName.trim();
            const tenThuTuc = thuTucHC.tenThuTucHanhChinh.trim();
            linhVucSet.add(tenLinhVuc);

            if (!thuTucByLinhVuc[tenLinhVuc]) {
                thuTucByLinhVuc[tenLinhVuc] = [];
            }
            if (!thuTucByLinhVuc[tenLinhVuc].includes(tenThuTuc)) {
                thuTucByLinhVuc[tenLinhVuc].push(tenThuTuc);
            }
        }

        // Extract doiTuong options
        if (thuTucHC.doiTuongThucHien) {
            const doiTuongList = thuTucHC.doiTuongThucHien
                .split(';')
                .map(dt => dt.trim())
                .filter(dt => dt);
            doiTuongList.forEach(dt => doiTuongSet.add(dt));
        }

        // Extract capThucHien options
        if (thuTucHC.maCapHanhChinh) {
            capThucHienSet.add(thuTucHC.maCapHanhChinh.trim());
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

// Tạo filter options cho lĩnh vực từ linhVucList trực tiếp
const createLinhVucFilterOptions = (linhVucList: LinhVuc[]): string[] => {
    return linhVucList.map(lv => lv.tenLinhVuc).sort();
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

const filterThuTucHanhChinh = (
    thuTucHcList: ThuTucHanhChinh[],
    filters: FilterState,
    linhVucList: LinhVuc[]
): ThuTucHanhChinh[] => {
    return thuTucHcList.filter(thuTucHC => {
        // Search text filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const linhVuc = linhVucList.find(lv => lv.maLinhVuc === thuTucHC.maLinhVuc);
            const searchableText = [
                thuTucHC.tenThuTucHanhChinh,
                thuTucHC.maThuTucHanhChinh,
                linhVuc?.tenLinhVuc || thuTucHC.maLinhVuc,
                thuTucHC.doiTuongThucHien,
                thuTucHC.moTa
            ]
                .join(' ')
                .toLowerCase();
            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        // Lĩnh vực filter - filters.linhVuc chứa tenLinhVuc, cần map về maLinhVuc để so sánh
        if (filters.linhVuc) {
            // Tìm lĩnh vực từ tenLinhVuc để lấy maLinhVuc
            const selectedLinhVuc = linhVucList.find(lv => lv.tenLinhVuc === filters.linhVuc);
            if (selectedLinhVuc) {
                // So sánh maLinhVuc của thuTucHC với maLinhVuc của lĩnh vực được chọn
                if (thuTucHC.maLinhVuc !== selectedLinhVuc.maLinhVuc) {
                    return false;
                }
            } else {
                // Fallback: nếu không tìm thấy, có thể filters.linhVuc là maLinhVuc
                if (thuTucHC.maLinhVuc !== filters.linhVuc) {
                    return false;
                }
            }
        }

        if (filters.doiTuong && !thuTucHC.doiTuongThucHien.includes(filters.doiTuong)) {
            return false;
        }
        if (filters.capThucHien && !thuTucHC.maCapHanhChinh.includes(filters.capThucHien)) {
            return false;
        }

        // Note: availability filter không áp dụng cho IndexedDB data vì templates được load từ API riêng

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

// Hàm chuyển đổi địa chỉ sử dụng API
const convertAddress = async (address: string): Promise<string> => {
    if (!address || address.trim() === '') {
        return address;
    }

    try {
        console.log('🔄 Converting address:', address);
        const result = await chuyenDoiApiService.chuyenDoiDiaBan(address);

        if (result.success && result.data?.Succeeded) {
            console.log('✅ Address converted successfully:', result.data.Result);
            return result.data.Result;
        } else {
            console.warn(
                '⚠️ Address conversion failed, using original address:',
                result.error?.message
            );
            return address;
        }
    } catch (error) {
        console.error('❌ Error converting address:', error);
        return address; // Return original address if conversion fails
    }
};

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
                                </Typography>
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
            </Card>
        );
    }
);
//#endregion TemplateCard

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

//#region  Function to reset document to original state
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
//#endregion

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

        // Convert address before applying
        const originalAddress = data.diaChi || data.noiCuTru || data.noi_cu_tru || '';
        const convertedAddress = await convertAddress(originalAddress);

        // Create replace map for exact placeholder matching with optional target suffix
        const suffix = targetSuffix ? `_${targetSuffix}` : '';
        const replaceMap: Record<string, string> = {
            [`{ho_ten${suffix}}`]: data.hoTen || data.ho_ten || '',
            [`{so_cccd${suffix}}`]: data.so_cccd || data.cccd || '',
            [`{so_cmnd${suffix}}`]: data.so_cmnd || data.cmnd || '',
            [`{ngay_sinh${suffix}}`]: data.ngaySinh || data.ngay_sinh || '',
            [`{gioi_tinh${suffix}}`]: data.gioiTinh || data.gioi_tinh || '',
            [`{noi_cu_tru${suffix}}`]: convertedAddress,
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
// #region --- COMPONENT CHÍNH ---
function TemplateFillerComponent() {
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        linhVuc: [],
        doiTuong: [],
        capThucHien: [],
        thuTucByLinhVuc: {}
    });
    const [linhVucList, setLinhVucList] = useState<LinhVuc[]>([]);
    const [thuTucHcList, setThuTucHcList] = useState<ThuTucHanhChinh[]>([]);
    const [filteredThuTucHcList, setFilteredThuTucHcList] = useState<ThuTucHanhChinh[]>([]);
    const [linhVucLoading, setLinhVucLoading] = useState(false);
    const [isDataSynced, setIsDataSynced] = useState(false);
    const [showSyncPanel, setShowSyncPanel] = useState(false);

    const testData = db.linhVuc.toArray();

    useEffect(() => {
        console.log('testData', testData);
    }, [testData]);

    // Add currentCodeRef for template management
    const currentCodeRef = useRef<string>('');

    const navigate = useNavigate();
    const { history } = useRouter();

    const handlePrintClick = async () => {
        if (sfContainerRef.current && sfContainerRef.current.documentEditor) {
            await sfContainerRef.current.documentEditor.print(window);
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
        linhVuc: '', // Sẽ lưu tenLinhVuc để dễ hiểu và hiển thị
        doiTuong: '',
        capThucHien: '',
        availability: 'all'
    });
    const [dataLoading, setDataLoading] = useState(false);
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

    // State cho offline files từ API
    const [offlineFilesState, setOfflineFilesState] = useState({
        downloadedFiles: {} as { [thanhPhanHoSoTTHCID: string]: boolean },
        totalDownloaded: 0,
        totalSize: 0
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

    // Refresh offline files information
    const refreshOfflineFiles = useCallback(async () => {
        try {
            const stats = await thanhPhanHoSoTTHCRepository.getStorageStats();
            const allFiles = await thanhPhanHoSoTTHCRepository.getAllLocalFiles();

            const downloadedFiles: { [thanhPhanHoSoTTHCID: string]: boolean } = {};
            allFiles.forEach(file => {
                downloadedFiles[file.thanhPhanHoSoTTHCID] = true;
            });

            setOfflineFilesState({
                downloadedFiles,
                totalDownloaded: stats.totalFiles,
                totalSize: stats.totalSize
            });

            console.log(
                `📊 Offline files stats: ${stats.totalFiles} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
            );
        } catch (error) {
            console.error('❌ Failed to refresh offline files:', error);
        }
    }, []);

    const sfContainerRef = useRef<DocumentEditorContainerComponent | null>(null);

    // Socket connection
    const { socketStatus, on, off } = useSocketConnection(ConfigConstant.SOCKET_URL);
    // Memoized values
    const availableThuTuc = useMemo(() => {
        if (!filters.linhVuc || !filterOptions.thuTucByLinhVuc[filters.linhVuc]) {
            return [];
        }
        return filterOptions.thuTucByLinhVuc[filters.linhVuc];
    }, [filters.linhVuc, filterOptions.thuTucByLinhVuc]);
    // Memoized statistics for header
    const templateStats = useMemo(() => {
        const total = filteredThuTucHcList.length;
        return {
            available: total, // All records from IndexedDB are considered available
            total,
            offlineFiles: offlineFilesState.totalDownloaded,
            offlineSize: offlineFilesState.totalSize
        };
    }, [filteredThuTucHcList, offlineFilesState]);
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
    const handleResetDocument = useCallback(async () => {
        try {
            const resetSuccess = await resetDocumentToOriginal(
                sfContainerRef.current,
                targetState.originalSfdt
            );

            if (resetSuccess) {
                const availableSuffixes = scanDocumentForSuffixes(sfContainerRef.current);

                setTargetState(prev => ({
                    ...prev,
                    availableTargets: availableSuffixes,
                    selectedTarget: '',
                    usedTargets: []
                }));

                setSnackbar({
                    open: true,
                    message: 'Đã làm mới mẫu',
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
            console.error('❌ Error in reset handler:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi reset mẫu',
                severity: 'error'
            });
        }
    }, [targetState.originalSfdt]);

    const handleApiTemplateSelect = async (templateData: {
        record: ThuTucHanhChinh;
        template: any; // ThanhPhanHoSoTTHC
    }) => {
        console.log('🎯 API Template selected:', templateData);

        try {
            const { record, template } = templateData;

            // Check if there are existing working documents for this TTHC
            const hasExistingWorkingDocs = hasWorkingDocuments(record.maThuTucHanhChinh);
            console.log(
                `🔍 API template selection - Has existing working docs for ${record.maThuTucHanhChinh}:`,
                hasExistingWorkingDocs
            );

            // Create a compatible record for the editor
            const selectedMauDon = {
                tenFile: template.tenTepDinhKem,
                tenGiayTo: template.tenThanhPhanHoSoTTHC,
                tenThanhPhan: template.tenThanhPhanHoSoTTHC,
                soBanChinh: template.soBanChinh,
                soBanSao: template.soBanSao,
                ghiChu: template.ghiChu,
                duongDanTepDinhKem: template.duongDanTepDinhKem,
                duongDan: `API Template`, // This will be used by loadTemplateIntoSyncfusion
                // Mark this as an API template for special handling
                isApiTemplate: true,
                // Store template ID for offline access
                thanhPhanHoSoTTHCID: template.thanhPhanHoSoTTHCID
            };

            const editorRecord = {
                maTTHC: record.maThuTucHanhChinh,
                tenTTHC: record.tenThuTucHanhChinh,
                linhVuc: record.maLinhVuc,
                doiTuong: record.doiTuongThucHien,
                selectedMauDon: selectedMauDon,
                // Add danhSachMauDon array with the single selected template
                danhSachMauDon: [selectedMauDon]
            } as any; // Type assertion for compatibility

            if (hasExistingWorkingDocs) {
                // If there are working documents, show template selection modal with both API template and working documents
                console.log(
                    '📋 Showing template selection modal with API template + working documents'
                );
                setTemplateSelectionModal({
                    open: true,
                    record: editorRecord
                });

                const message = `Đã tìm thấy ${getWorkingDocumentsForMaTTHC(record.maThuTucHanhChinh).length} bản sao tùy chỉnh. Hãy chọn mẫu bạn muốn sử dụng.`;
                setSnackbar({
                    open: true,
                    message,
                    severity: 'info'
                });
            } else {
                // If no working documents, directly open editor with API template
                console.log('🚀 Directly opening editor with API template (no working documents)');
                setEditorState(prev => ({
                    ...prev,
                    selectedRecord: editorRecord,
                    showEditorModal: true,
                    syncfusionLoading: true,
                    syncfusionDocumentReady: false
                }));

                const message = `Đang tải mẫu ${template.tenThanhPhanHoSoTTHC}`;
                setSnackbar({
                    open: true,
                    message,
                    severity: 'info'
                });
            }
        } catch (error) {
            console.error('❌ Error handling API template selection:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi xử lý mẫu API',
                severity: 'error'
            });
        }
    };

    const handleTemplateSelectionOpen = useCallback(() => {
        console.log('🎯 Opening template selection modal');
        if (editorState.selectedRecord) {
            setTemplateSelectionModal({
                open: true,
                record: editorState.selectedRecord
            });
        } else {
            setSnackbar({
                open: true,
                message: 'Chưa có thủ tục được chọn',
                severity: 'warning'
            });
        }
    }, [editorState.selectedRecord]);

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

            // Check if this is an API template
            if (record.selectedMauDon.isApiTemplate) {
                console.log(
                    '🎯 Loading API template:',
                    record.selectedMauDon.tenFile,
                    'ID:',
                    record.selectedMauDon.thanhPhanHoSoTTHCID
                );

                try {
                    // Check if we have the required ID
                    if (!record.selectedMauDon.thanhPhanHoSoTTHCID) {
                        throw new Error('Không có ID thành phần hồ sơ hợp lệ');
                    }

                    // Try to get file blob (will download if not available locally)
                    const fileBlob = await thanhPhanHoSoTTHCRepository.getFileBlobForUse(
                        record.selectedMauDon.thanhPhanHoSoTTHCID
                    );

                    if (fileBlob) {
                        blob = fileBlob;
                        console.log(
                            '✅ API template loaded successfully, size:',
                            blob.size,
                            'bytes'
                        );
                    } else {
                        // Fallback to direct API download
                        console.log(
                            '🔄 Fallback: Loading API template directly from URL:',
                            record.selectedMauDon.duongDanTepDinhKem
                        );

                        const apiUrl = `http://laptrinhid.qlns.vn/uploads/tthc/${record.selectedMauDon.duongDanTepDinhKem}`;
                        const apiRes = await fetch(apiUrl);

                        if (!apiRes.ok) {
                            throw new Error(
                                `Không thể tải mẫu từ API: ${apiRes.status} ${apiRes.statusText}`
                            );
                        }

                        blob = await apiRes.blob();
                        console.log(
                            '✅ Fallback API template loaded successfully, size:',
                            blob.size,
                            'bytes'
                        );
                    }
                } catch (error) {
                    console.error('❌ Error loading API template:', error);
                    throw new Error(
                        `Lỗi khi tải mẫu API: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
                    );
                }
            }
            // Check if template is from IndexedDB
            else if (
                record.selectedMauDon.isFromIndexedDB &&
                record.selectedMauDon.workingDocument
            ) {
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

            // Validate blob first
            if (blob.size === 0) {
                throw new Error('File rỗng hoặc bị lỗi');
            }

            const form = new FormData();
            form.append('files', blob, record.selectedMauDon.tenFile);
            console.log('🔄 Converting DOCX to SFDT...');
            console.log(
                '🌐 Syncfusion service URL:',
                ConfigConstant.SYNCFUSION_SERVICE_URL + 'Import'
            );

            // Try multiple Syncfusion service URLs as fallback
            const serviceUrls = [
                ConfigConstant.SYNCFUSION_SERVICE_URL,
                'https://services.syncfusion.com/js/production/api/documenteditor/',
                'https://ej2services.syncfusion.com/production/web-services/api/documenteditor/'
            ];

            let importRes;
            let lastError;

            for (let i = 0; i < serviceUrls.length; i++) {
                const serviceUrl = serviceUrls[i];
                console.log(
                    `🔄 Trying Syncfusion service URL (${i + 1}/${serviceUrls.length}):`,
                    serviceUrl + 'Import'
                );

                try {
                    // Create manual abort controller for better browser compatibility
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);

                    try {
                        // Try import with current service URL
                        importRes = await fetch(`${serviceUrl}Import`, {
                            method: 'POST',
                            body: form,
                            mode: 'cors',
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    if (importRes.ok) {
                        console.log(
                            `✅ Successfully connected to Syncfusion service: ${serviceUrl}`
                        );
                        break; // Success, exit loop
                    } else {
                        console.warn(
                            `⚠️ Service ${serviceUrl} returned ${importRes.status}: ${importRes.statusText}`
                        );
                        lastError = new Error(
                            `Service returned ${importRes.status}: ${importRes.statusText}`
                        );
                    }
                } catch (error: any) {
                    console.warn(`⚠️ Failed to connect to service ${serviceUrl}:`, error.message);
                    lastError = error;

                    // If this is not the last URL, continue trying
                    if (i < serviceUrls.length - 1) {
                        console.log('🔄 Trying next service URL...');
                        continue;
                    }
                }
            }

            // If no service worked, throw detailed error
            if (!importRes || !importRes.ok) {
                console.error('❌ All Syncfusion services failed');

                if (lastError?.name === 'AbortError' || lastError?.message.includes('timeout')) {
                    throw new Error(
                        `Tất cả dịch vụ Syncfusion không phản hồi. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.\n\nCác service đã thử:\n${serviceUrls.map(url => `- ${url}`).join('\n')}`
                    );
                } else if (
                    lastError?.message.includes('CORS') ||
                    lastError?.message.includes('blocked')
                ) {
                    throw new Error(
                        `Không thể kết nối tới bất kỳ dịch vụ Syncfusion nào do chính sách CORS.\n\nVui lòng liên hệ quản trị viên để:\n1. Cấu hình CORS headers\n2. Thiết lập local Syncfusion service\n3. Sử dụng proxy server`
                    );
                } else if (importRes?.status === 404) {
                    throw new Error(
                        `Tất cả dịch vụ Syncfusion đều không khả dụng (404).\n\nVui lòng:\n1. Liên hệ quản trị viên để cập nhật service URL\n2. Kiểm tra kết nối internet\n3. Thiết lập local Syncfusion service`
                    );
                } else if (importRes?.status && importRes.status >= 500) {
                    throw new Error(
                        `Lỗi server Syncfusion (${importRes.status}). Tất cả các service đều gặp sự cố. Vui lòng thử lại sau.`
                    );
                } else {
                    throw new Error(
                        `Không thể kết nối tới bất kỳ dịch vụ Syncfusion nào.\n\nLỗi cuối: ${lastError?.message || 'Unknown error'}\n\nVui lòng liên hệ quản trị viên để hỗ trợ.`
                    );
                }
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
                                : ' (Không tìm thấy trường đặc biệt)';

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
    // Memoized filter options to prevent unnecessary re-creation
    const memoizedFilterOptions = useMemo(() => {
        if (thuTucHcList.length > 0 && linhVucList.length > 0) {
            const options = createFilterOptionsFromIndexDB(thuTucHcList, linhVucList);
            // Sử dụng linhVucList trực tiếp cho combo box lĩnh vực
            const linhVucOptions = createLinhVucFilterOptions(linhVucList);
            console.log('✅ Updated filter options from IndexedDB data:', {
                linhVuc: linhVucOptions.length,
                doiTuong: options.doiTuong.length,
                capThucHien: options.capThucHien.length
            });
            return {
                ...options,
                linhVuc: linhVucOptions
            };
        }
        return {
            linhVuc: [],
            doiTuong: [],
            capThucHien: [],
            thuTucByLinhVuc: {}
        };
    }, [thuTucHcList, linhVucList]);

    // Update filter options only when memoized value changes
    useEffect(() => {
        setFilterOptions(memoizedFilterOptions);
    }, [memoizedFilterOptions]);

    //#region LOAD TTHC
    const loadThuTucHanhChinh = async () => {
        setDataLoading(true);
        try {
            // Kiểm tra xem dữ liệu đã được đồng bộ chưa
            const synced = await dataSyncService.isDataSynced();
            setIsDataSynced(synced);

            if (synced) {
                // Sử dụng dữ liệu từ IndexedDB
                const data = await db.thuTucHanhChinh.toArray();
                setThuTucHcList(data);
                console.log('✅ Loaded TTHC from IndexedDB:', data.length, 'items');

                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} thủ tục hành chính từ IndexedDB`,
                    severity: 'success'
                });
            } else {
                // Fallback: tải từ API như cũ
                const data = await thuTucHCRepository.getAllThuTucHCApi();
                setThuTucHcList(data);
                console.log('📡 Loaded TTHC from API:', data.length, 'items');

                setSnackbar({
                    open: true,
                    message: `Đã tải ${data.length} thủ tục hành chính từ API`,
                    severity: 'success'
                });
            }
        } catch (err) {
            console.error('Lỗi khi tải thủ tục hành chính:', err);
            setSnackbar({
                open: true,
                message: 'Không thể tải dữ liệu thủ tục hành chính',
                severity: 'error'
            });
        } finally {
            setDataLoading(false);
        }
    };
    useEffect(() => {
        loadThuTucHanhChinh();
    }, []);

    const handleSelectThuTucHanhChinh = (record: ThuTucHanhChinh) => {
        // Mở rộng: Thêm logic xử lý khi người dùng nhấn "Chi tiết"
        // Ví dụ: Mở một modal hiển thị đầy đủ thông tin hoặc điều hướng sang trang khác
        alert(
            `Bạn đã chọn thủ tục:\n\nID: ${record.thuTucHanhChinhID}\nTên: ${record.tenThuTucHanhChinh}`
        );
    };

    // Removed old handleApiTemplateSelect - using new one above
    //#endregion

    //#region LOAD LINH VUC
    useEffect(() => {
        const loadLinhVuc = async () => {
            setLinhVucLoading(true);
            try {
                // Kiểm tra xem dữ liệu đã được đồng bộ chưa
                const synced = await dataSyncService.isDataSynced();

                if (synced) {
                    // Sử dụng dữ liệu từ IndexedDB
                    const data = await db.linhVuc.toArray();
                    setLinhVucList(data);
                    console.log('✅ Loaded lĩnh vực from IndexedDB:', data.length, 'items');
                } else {
                    const data = await linhVucRepository.getLinhVucList();
                    setLinhVucList(data);
                    console.log('📡 Loaded lĩnh vực from repository:', data.length, 'items');
                }

                // Show success message
                // setSnackbar({
                //     open: true,
                //     message: `Đã tải lĩnh vực từ ${synced ? 'IndexedDB' : 'cơ sở dữ liệu'}`,
                //     severity: 'success'
                // });
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
    }, [isDataSynced]);
    //#endregion

    // Load working documents from IndexedDB on component mount
    useEffect(() => {
        refreshWorkingDocuments();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load offline files information on component mount
    useEffect(() => {
        refreshOfflineFiles();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Memoized filtered data to prevent unnecessary filtering
    const memoizedFilteredData = useMemo(() => {
        const filtered = filterThuTucHanhChinh(thuTucHcList, filters, linhVucList);
        console.log('🔍 Filtered data:', {
            total: thuTucHcList.length,
            filtered: filtered.length,
            filters
        });
        return filtered;
    }, [thuTucHcList, filters, linhVucList]);

    // Update filtered state when memoized value changes
    useEffect(() => {
        setFilteredThuTucHcList(memoizedFilteredData);
    }, [memoizedFilteredData]);
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
    }, [editorState.showEditorModal, editorState.selectedRecord]); // eslint-disable-line react-hooks/exhaustive-deps
    // Socket event handlers for mobile data
    useEffect(() => {
        const handleDataReceived = async (data: ProcessingData) => {
            // Only process data if socket is connected
            if (socketStatus !== 'connected') {
                console.log('⚠️ Socket not connected, ignoring data:', socketStatus);
                return;
            }

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
                    const processingData = Utils.convertScannedInfoToProcessingData(data);
                    console.log('🔄 Converted mobile data to ProcessingData:', processingData);
                    console.log(
                        'first',
                        processingData.diaChi ||
                            processingData.noiCuTru ||
                            processingData.noi_cu_tru
                    );

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
                            setTargetState(prev => {
                                const remainingTargets = prev.availableTargets.filter(
                                    t => t !== usedTarget
                                );
                                // Tự động chọn target tiếp theo nếu có sẵn
                                const nextTarget =
                                    remainingTargets.length > 0 ? remainingTargets[0] : '';
                                return {
                                    ...prev,
                                    availableTargets: remainingTargets,
                                    usedTargets: [...prev.usedTargets, usedTarget],
                                    selectedTarget: nextTarget
                                };
                            });

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
        socketStatus,
        editorState.selectedRecord,
        editorState.syncfusionDocumentReady,
        targetState.selectedTarget
    ]);

    // Handle target change with auto-reset when switching to default after using specific targets
    const handleTargetChange = useCallback(
        async (newTarget: string) => {
            const currentTarget = targetState.selectedTarget;
            const hasUsedTargets = targetState.usedTargets.length > 0;

            // If switching to default ('') after using specific targets, reset document first
            if (newTarget === '' && currentTarget !== '' && hasUsedTargets) {
                console.log(
                    '🔄 Switching to default after using specific targets, resetting document...'
                );
                const resetSuccess = await resetDocumentToOriginal(
                    sfContainerRef.current,
                    targetState.originalSfdt
                );

                if (resetSuccess) {
                    // Re-scan document to get fresh available targets
                    const availableSuffixes = scanDocumentForSuffixes(sfContainerRef.current);
                    setTargetState(prev => ({
                        ...prev,
                        availableTargets: availableSuffixes,
                        selectedTarget: newTarget,
                        usedTargets: [] // Reset used targets since we reset the document
                    }));

                    setSnackbar({
                        open: true,
                        message: 'Đã đặt lại mẫu để chọn mặc định',
                        severity: 'info'
                    });
                } else {
                    setSnackbar({
                        open: true,
                        message: 'Không thể đặt lại mẫu, vui lòng thử lại',
                        severity: 'error'
                    });
                    return; // Don't change target if reset failed
                }
            } else {
                // Normal target change
                setTargetState(prev => ({
                    ...prev,
                    selectedTarget: newTarget
                }));
            }
        },
        [targetState.selectedTarget, targetState.usedTargets, targetState.originalSfdt]
    );

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // Handle sync completion
    const handleSyncComplete = useCallback(async () => {
        await loadThuTucHanhChinh();
        setShowSyncPanel(false);
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
            const processingData = Utils.convertScannedInfoToProcessingData({
                ...scannedInfo,
                ngaySinh: formatDDMMYYYY(scannedInfo.ngaySinh),
                ngayCap: formatDDMMYYYY(scannedInfo.ngayCap)
            });

            // Convert address if present
            if (processingData.diaChi || processingData.noiCuTru || processingData.noi_cu_tru) {
                const originalAddress =
                    processingData.diaChi ||
                    processingData.noiCuTru ||
                    processingData.noi_cu_tru ||
                    '';
                const convertedAddress = await convertAddress(originalAddress);

                // Update the processing data with converted address
                processingData.diaChi = convertedAddress;
                processingData.noiCuTru = convertedAddress;
                processingData.noi_cu_tru = convertedAddress;
            }

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
                    setTargetState(prev => {
                        const remainingTargets = prev.availableTargets.filter(
                            t => t !== usedTarget
                        );
                        // Tự động chọn target tiếp theo nếu có sẵn
                        const nextTarget = remainingTargets.length > 0 ? remainingTargets[0] : '';
                        return {
                            ...prev,
                            availableTargets: remainingTargets,
                            usedTargets: [...prev.usedTargets, usedTarget],
                            selectedTarget: nextTarget
                        };
                    });

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
    }, [
        scanState.inputText,
        editorState.selectedRecord,
        editorState.syncfusionDocumentReady,
        targetState.selectedTarget
    ]);

    const handleKeyDown = useCallback(
        async (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await handleAnalyzeAndFill();
            }
        },
        [handleAnalyzeAndFill]
    );

    const customToolbarItems = ['Print'];

    // Load working documents from IndexedDB on component mount
    useEffect(() => {
        refreshWorkingDocuments();
    }, [refreshWorkingDocuments]);

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
                    {/* Data Sync Panel Toggle */}
                    <Button
                        variant={isDataSynced ? 'contained' : 'outlined'}
                        color={isDataSynced ? 'success' : 'primary'}
                        onClick={() => setShowSyncPanel(!showSyncPanel)}
                        sx={{ ml: 'auto', minWidth: 120 }}
                    >
                        {isDataSynced ? '✅ Đã đồng bộ' : '🔄 Đồng bộ dữ liệu'}
                    </Button>
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
                        options={['', ...filterOptions.linhVuc]}
                        value={filters.linhVuc}
                        onChange={(event, newValue) => {
                            handleFilterChange('linhVuc', newValue || '');
                        }}
                        getOptionLabel={option => {
                            if (!option) return 'Tất cả';
                            return option; // option is already tenLinhVuc
                        }}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label={`Lĩnh vực (${filterOptions.linhVuc.length})`}
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

                            // Find corresponding maLinhVuc for display
                            const linhVuc = linhVucList.find(lv => lv.tenLinhVuc === option);
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
                                            {option}
                                        </Typography>
                                        {linhVuc && (
                                            <Typography variant="caption" color="text.secondary">
                                                Mã: {linhVuc.maLinhVuc}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        }}
                    />
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
                </Box>

                {/* Data Sync Panel */}
                {showSyncPanel && <DataSyncPanel onSyncComplete={handleSyncComplete} />}

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
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Danh sách mẫu đơn
                                </Typography>
                                {templateStats.offlineFiles > 0 && (
                                    <Chip
                                        icon={<Download />}
                                        label={`${templateStats.offlineFiles}  (${(templateStats.offlineSize / 1024 / 1024).toFixed(1)} MB)`}
                                        color="success"
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                )}
                            </Box>
                        }
                        sx={{
                            pb: 0,
                            '& .MuiCardHeader-title': {
                                fontSize: '1.1rem',
                                fontWeight: 600
                            }
                        }}
                    />
                    <CardContent
                        sx={{
                            flex: 1,
                            height: '100%'
                        }}
                    >
                        {dataLoading ? (
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
                                    height: '100%',
                                    overflowY: 'auto',
                                    pr: 1,
                                    pt: 1,
                                    paddingBottom: 0,
                                    flex: 1,
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
                                {filteredThuTucHcList.map((data, index) => (
                                    <ApiTemplateCard
                                        key={`${data.thuTucHanhChinhID}-${index}`}
                                        record={data}
                                        linhVucList={linhVucList}
                                        onSelect={handleSelectThuTucHanhChinh}
                                        onTemplateSelect={handleApiTemplateSelect}
                                        hasWorkingDocuments={hasWorkingDocuments(
                                            data.maThuTucHanhChinh
                                        )}
                                        workingDocumentsCount={
                                            getWorkingDocumentsForMaTTHC(data.maThuTucHanhChinh)
                                                .length
                                        }
                                    />
                                ))}
                                {filteredThuTucHcList.length === 0 && (
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
                <SyncfusionEditorModal
                    editorState={editorState}
                    scanState={scanState}
                    targetState={targetState}
                    linhVucList={linhVucList}
                    socketStatus={socketStatus}
                    onClose={handleCloseEditor}
                    onDownload={handleDownloadClick}
                    onPrint={handlePrintClick}
                    onTargetChange={handleTargetChange}
                    onInputModeChange={handleInputModeChange}
                    onInputTextChange={handleInputTextChange}
                    onKeyDown={handleKeyDown}
                    onTemplateSelectionOpen={handleTemplateSelectionOpen}
                    onResetDocument={handleResetDocument}
                    sfContainerRef={sfContainerRef}
                />

                {/* Template Selection Modal */}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                                onClick={() =>
                                    setTemplateSelectionModal({ open: false, record: null })
                                }
                                sx={{ color: 'white' }}
                            >
                                <Close />
                            </IconButton>
                        </Box>
                    </Box>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Vui lòng chọn một mẫu đơn từ danh sách bên dưới để tiếp tục:
                        </Typography>

                        {/* API + CSV Templates Section */}
                        {templateSelectionModal.record?.danhSachMauDon &&
                            templateSelectionModal.record.danhSachMauDon.length > 0 && (
                                <>
                                    <Typography
                                        variant="h6"
                                        sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
                                    >
                                        Mẫu đơn
                                        {templateSelectionModal.record.selectedMauDon
                                            ?.isApiTemplate && (
                                            <Chip
                                                label="API Template"
                                                color="primary"
                                                size="small"
                                                sx={{ ml: 1, fontWeight: 600 }}
                                            />
                                        )}
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
                                                <Card
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
                                                </Card>
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
                                        sx={{
                                            mb: 2,
                                            color: 'success.main',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}
                                    >
                                        Mẫu đơn đã thiết lập (
                                        {
                                            getWorkingDocumentsForMaTTHC(
                                                templateSelectionModal.record.maTTHC
                                            ).length
                                        }{' '}
                                        bản sao)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {getWorkingDocumentsForMaTTHC(
                                            templateSelectionModal.record.maTTHC
                                        ).map((workingDoc, index) => (
                                            <Card
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
                                                        message: `Đang tải mẫu đã thiết lập: ${workingDoc.fileName}`,
                                                        severity: 'info'
                                                    });
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        mb: 2
                                                    }}
                                                >
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2,
                                                                mb: 1
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="h6"
                                                                sx={{ fontWeight: 600 }}
                                                            >
                                                                {workingDoc.fileName}
                                                            </Typography>
                                                            <Chip
                                                                label="Bản sao tùy chỉnh"
                                                                color="success"
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    fontSize: '0.65rem'
                                                                }}
                                                            />
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 0.5
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                📄 Kích thước:{' '}
                                                                {(
                                                                    workingDoc.blob.size / 1024
                                                                ).toFixed(1)}{' '}
                                                                KB
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                            >
                                                                📅 Cập nhật:{' '}
                                                                {new Date(
                                                                    workingDoc.updatedAt
                                                                ).toLocaleString('vi-VN')}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="success.main"
                                                                sx={{
                                                                    fontStyle: 'italic',
                                                                    fontWeight: 500,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5
                                                                }}
                                                            >
                                                                💾 Đã lưu
                                                            </Typography>
                                                        </Box>
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
                                                                'linear-gradient(45deg, #4caf50, #66bb6a)',
                                                            color: 'white',
                                                            '&:hover': {
                                                                background:
                                                                    'linear-gradient(45deg, #388e3c, #4caf50)',
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        Sử dụng bản tùy chỉnh
                                                    </Button>
                                                </Box>
                                            </Card>
                                        ))}
                                    </Box>
                                </>
                            )}

                        {/* No templates message */}
                        {(!templateSelectionModal.record?.danhSachMauDon ||
                            templateSelectionModal.record.danhSachMauDon.length === 0) &&
                            (!templateSelectionModal.record?.maTTHC ||
                                !hasWorkingDocuments(templateSelectionModal.record.maTTHC)) && (
                                <Card
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
                                </Card>
                            )}
                    </DialogContent>
                </Dialog>

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
// //#endregion
export const Route = createLazyFileRoute('/template-filler/')({
    component: TemplateFillerComponent
});
