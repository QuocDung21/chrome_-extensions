import { useState } from 'react';

import { Add as AddIcon, CheckCircle, Edit, Error } from '@mui/icons-material';
import { Box, Button, IconButton, Link, Paper, TextField, Typography } from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import checkUrlExists from '@/utils/checkUrlExists';

interface ServiceInfo {
    name: string;
    description: string;
    adminFunctions: number;
    softwareForms: number;
}

interface ServiceStep {
    step: string;
    url: string;
    status?: 'checking' | 'valid' | 'invalid' | 'unchecked';
    isEditing?: boolean;
}

const serviceInfo: ServiceInfo = {
    name: 'Dịch vụ công trực tuyến',
    description: 'Hệ thống hỗ trợ thực hiện các thủ tục hành chính và quản lý tài liệu điện tử',
    adminFunctions: 5,
    softwareForms: 5
};

const softwareSteps = [
    { step: '3.1', description: '' },
    { step: '3.2', description: '' },
    { step: '3.3', description: '' },
    { step: '3.4', description: '' },
    { step: '3.5', description: '' }
];

function InfoPage() {
    const [adminLinks, setAdminLinks] = useState<ServiceStep[]>([]);
    const [linkCounter, setLinkCounter] = useState(1);
    const [newUrl, setNewUrl] = useState('');
    const [urlError, setUrlError] = useState('');
    const [isCheckingUrl, setIsCheckingUrl] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingUrl, setEditingUrl] = useState('');

    // Hàm kiểm tra định dạng URL
    const isValidUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleAddAdminLink = async () => {
        if (linkCounter >= 6) return;

        const trimmedUrl = newUrl.trim();
        if (!trimmedUrl) return;

        // Reset error
        setUrlError('');

        // Kiểm tra định dạng URL
        if (!isValidUrl(trimmedUrl)) {
            setUrlError(
                'URL không đúng định dạng. Vui lòng nhập URL hợp lệ (http:// hoặc https://)'
            );
            return;
        }

        // Kiểm tra URL đã tồn tại trong danh sách chưa
        const isDuplicate = adminLinks.some(link => link.url === trimmedUrl);
        if (isDuplicate) {
            setUrlError('URL này đã tồn tại trong danh sách');
            return;
        }

        // Thêm URL vào danh sách
        const newLink: ServiceStep = {
            step: `2.${linkCounter}`,
            url: trimmedUrl
        };
        setAdminLinks(prev => [...prev, newLink]);
        setLinkCounter(prev => prev + 1);
        setNewUrl('');
    };

    const handleCheckLinks = async () => {
        if (adminLinks.length === 0) {
            alert('Chưa có đường dẫn nào để kiểm tra');
            return;
        }

        setIsCheckingUrl(true);

        // Cập nhật trạng thái checking cho tất cả links
        setAdminLinks(prev => prev.map(link => ({ ...link, status: 'checking' as const })));

        // Kiểm tra từng URL
        for (let i = 0; i < adminLinks.length; i++) {
            const link = adminLinks[i];
            const exists = await checkUrlExists(link.url);

            // Cập nhật trạng thái cho URL này
            setAdminLinks(prev =>
                prev.map((item, index) =>
                    index === i
                        ? { ...item, status: exists ? ('valid' as const) : ('invalid' as const) }
                        : item
                )
            );
        }

        setIsCheckingUrl(false);
    };

    const handleAnalyzeLinks = () => {
        if (adminLinks.length === 0) {
            alert('Chưa có đường dẫn nào để phân tích');
            return;
        }

        let analysis = `Phân tích ${adminLinks.length} đường dẫn:\n\n`;

        const domains = adminLinks.map(link => {
            try {
                return new URL(link.url).hostname;
            } catch {
                return 'Invalid URL';
            }
        });

        const uniqueDomains = [...new Set(domains)];
        analysis += `Số domain khác nhau: ${uniqueDomains.length}\n`;
        analysis += `Các domain:\n`;
        uniqueDomains.forEach(domain => {
            const count = domains.filter(d => d === domain).length;
            analysis += `• ${domain} (${count} link)\n`;
        });

        alert(analysis);
    };

    const handleEditUrl = (index: number) => {
        setEditingIndex(index);
        setEditingUrl(adminLinks[index].url);
    };

    const handleSaveEdit = async (index: number) => {
        const trimmedUrl = editingUrl.trim();

        if (!isValidUrl(trimmedUrl)) {
            alert('URL không đúng định dạng. Vui lòng nhập URL hợp lệ (http:// hoặc https://)');
            return;
        }

        // Kiểm tra URL đã tồn tại trong danh sách chưa (trừ URL hiện tại)
        const isDuplicate = adminLinks.some((link, i) => i !== index && link.url === trimmedUrl);
        if (isDuplicate) {
            alert('URL này đã tồn tại trong danh sách');
            return;
        }

        // Cập nhật URL và reset trạng thái
        setAdminLinks(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, url: trimmedUrl, status: 'unchecked' as const } : item
            )
        );

        setEditingIndex(null);
        setEditingUrl('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingUrl('');
    };

    return (
        <Box sx={{ p: 3, maxWidth: '100%', mx: 'auto' }}>
            {/* CSS for spinner animation */}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>

            {/* Header */}
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
                Thông tin ứng dụng
            </Typography>

            {/* Service Information Section */}
            <Paper sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
                <Typography
                    variant="h6"
                    sx={{ mb: 3, fontWeight: 600, borderBottom: '1px solid #e0e0e0', pb: 1 }}
                >
                    1. Thông tin gói dịch vụ
                </Typography>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>- Tên gói:</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2, ml: 2 }}>
                        - .....
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                            - Số lượng thủ tục hành chính của phần mềm dịch vụ công:{' '}
                            {serviceInfo.adminFunctions} thủ tục
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                bgcolor: '#00695c',
                                color: 'white',
                                '&:hover': { bgcolor: '#004d40' },
                                minWidth: 60
                            }}
                        >
                            Tạo
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                            - Số lượng form nhập liệu phần mềm kế toán, quản lý chuyên ngành và số
                            hóa: {serviceInfo.softwareForms} chức năng
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                bgcolor: '#00695c',
                                color: 'white',
                                '&:hover': { bgcolor: '#004d40' },
                                minWidth: 60
                            }}
                        >
                            Tạo
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Admin Procedures Section */}
            <Paper sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        2. Đường dẫn nhập liệu thủ tục hành chính
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleCheckLinks}
                            disabled={isCheckingUrl || adminLinks.length === 0}
                            sx={{
                                bgcolor: '#ff9800',
                                color: 'white',
                                '&:hover': { bgcolor: '#f57c00' },
                                '&:disabled': { bgcolor: '#ccc', color: '#666' }
                            }}
                        >
                            {isCheckingUrl ? 'Đang kiểm tra...' : 'Kiểm tra'}
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleAnalyzeLinks}
                            sx={{
                                bgcolor: '#00695c',
                                color: 'white',
                                '&:hover': { bgcolor: '#004d40' }
                            }}
                        >
                            Phân tích
                        </Button>
                    </Box>
                </Box>

                {/* Add URL Input */}
                {linkCounter <= 5 ? (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Nhập URL (ví dụ: https://example.com)"
                                value={newUrl}
                                onChange={e => {
                                    setNewUrl(e.target.value);
                                    if (urlError) setUrlError(''); // Clear error when typing
                                }}
                                error={!!urlError}
                                sx={{ flex: 1 }}
                                onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                        handleAddAdminLink();
                                    }
                                }}
                            />
                            <IconButton
                                onClick={handleAddAdminLink}
                                disabled={!newUrl.trim() || isCheckingUrl}
                                sx={{
                                    bgcolor: '#00695c',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#004d40' },
                                    '&:disabled': { bgcolor: '#ccc', color: '#666' }
                                }}
                            >
                                <AddIcon />
                            </IconButton>
                        </Box>
                        {urlError && (
                            <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                {urlError}
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                        >
                            Đã đạt giới hạn tối đa 5 đường dẫn (2.1 - 2.5)
                        </Typography>
                    </Box>
                )}

                {/* Links List */}
                <Box>
                    {adminLinks.map((item, index) => (
                        <Box
                            key={index}
                            sx={{
                                mb: 2,
                                p: 2,
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                            }}
                        >
                            {/* Status Icon */}
                            <Box sx={{ minWidth: 24 }}>
                                {item.status === 'checking' && (
                                    <Box
                                        sx={{
                                            width: 20,
                                            height: 20,
                                            border: '2px solid #ccc',
                                            borderTop: '2px solid #1976d2',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}
                                    />
                                )}
                                {item.status === 'valid' && (
                                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                                )}
                                {item.status === 'invalid' && (
                                    <Error sx={{ color: '#f44336', fontSize: 20 }} />
                                )}
                            </Box>

                            {/* Step Label */}
                            <Typography variant="body1" sx={{ minWidth: 60 }}>
                                {item.step}.
                            </Typography>

                            {/* URL Display/Edit */}
                            <Box sx={{ flex: 1 }}>
                                {editingIndex === index ? (
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField
                                            size="small"
                                            value={editingUrl}
                                            onChange={e => setEditingUrl(e.target.value)}
                                            sx={{ flex: 1 }}
                                            onKeyPress={e => {
                                                if (e.key === 'Enter') {
                                                    handleSaveEdit(index);
                                                } else if (e.key === 'Escape') {
                                                    handleCancelEdit();
                                                }
                                            }}
                                        />
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => handleSaveEdit(index)}
                                            sx={{
                                                bgcolor: '#4caf50',
                                                '&:hover': { bgcolor: '#388e3c' }
                                            }}
                                        >
                                            Lưu
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                        >
                                            Hủy
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Link
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                color:
                                                    item.status === 'invalid'
                                                        ? '#f44336'
                                                        : '#1976d2',
                                                textDecoration: 'underline',
                                                '&:hover': { textDecoration: 'none' },
                                                flex: 1,
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {item.url}
                                        </Link>
                                        {item.status === 'invalid' && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditUrl(index)}
                                                sx={{ color: '#1976d2' }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Software Forms Section */}
            <Paper sx={{ p: 3, border: '1px solid #e0e0e0' }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        3. Đường dẫn nhập liệu phần mềm kế toán, quản lý chuyên ngành và số hóa
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                bgcolor: '#ff9800',
                                color: 'white',
                                '&:hover': { bgcolor: '#f57c00' }
                            }}
                        >
                            Kiểm tra
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                bgcolor: '#00695c',
                                color: 'white',
                                '&:hover': { bgcolor: '#004d40' }
                            }}
                        >
                            Phân tích
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                    {softwareSteps.map((item, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body1">{item.step}.</Typography>
                        </Box>
                    ))}
                    <Typography variant="body1">...</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        size="large"
                        sx={{
                            bgcolor: '#4caf50',
                            color: 'white',
                            '&:hover': { bgcolor: '#388e3c' },
                            px: 4
                        }}
                    >
                        Hoàn thành
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export const Route = createLazyFileRoute('/info/')({
    component: InfoPage
});
