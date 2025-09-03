import React from 'react';

import { Edit as EditIcon, Star as StarIcon } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';

import { ThuTucHanhChinh } from '@/admin/services/thuTucHanhChinh';

interface ApiTemplateCardProps {
    record: ThuTucHanhChinh;
    onSelect: (record: ThuTucHanhChinh) => void;
}

export const ApiTemplateCard = React.memo<ApiTemplateCardProps>(({ record, onSelect }) => {
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <StarIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
                        <Typography variant="body2" color="text.secondary">
                            <Typography component="span" fontWeight="500">
                                Mã TTHC:
                            </Typography>{' '}
                            {record.maThuTucHanhChinh}
                        </Typography>
                    </Box>
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
                                background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Chi tiết
                    </Button>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack spacing={1.5} sx={{ my: 2 }}>
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
                            {record.tenThuTucHanhChinh}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                        >
                            Mã lĩnh vực:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: '500' }}>
                            {record.maLinhVuc}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}
                        >
                            Đối tượng:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: '500' }}>
                            {record.doiTuongThucHien || 'Công dân Việt Nam'}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
});

ApiTemplateCard.displayName = 'ApiTemplateCard';
