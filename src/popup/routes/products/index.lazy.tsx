import { ReactElement, useEffect, useState } from 'react';

import { useSnackbar } from 'notistack';

import { Refresh, ShoppingCart } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    IconButton,
    Rating,
    Stack,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import PopupContent from '@/popup/modules/core/components/PopupContent/PopupContent';
import PopupHeader from '@/popup/modules/core/components/PopupHeader/PopupHeader';
import { apiService } from '@/shared/services/api';
import { Product } from '@/shared/types/api';

export const Route = createLazyFileRoute('/products/')({
    component: Products
});

function Products(): ReactElement {
    const { enqueueSnackbar } = useSnackbar();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProducts = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load only first 3 products for popup (limited space)
            const response = await apiService.getLimitedProducts(3);
            if (response.success) {
                setProducts(response.data);
                enqueueSnackbar('Products loaded successfully!', { variant: 'success' });
            } else {
                setError(response.error?.message || 'Failed to load products');
                enqueueSnackbar('Failed to load products', { variant: 'error' });
            }
        } catch (err) {
            setError('Network error occurred');
            enqueueSnackbar('Network error occurred', { variant: 'error' });
            console.error('Error loading products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const openFullDashboard = async () => {
        try {
            await chrome.runtime.openOptionsPage();
        } catch (error) {
            console.error('Failed to open admin dashboard:', error);
            enqueueSnackbar('Failed to open admin dashboard', { variant: 'error' });
        }
    };

    return (
        <>
            <PopupHeader />
            <PopupContent>
                <Box sx={{ p: 2 }}>
                    {/* Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Featured Products
                        </Typography>
                        <IconButton size="small" onClick={loadProducts} disabled={loading}>
                            <Refresh />
                        </IconButton>
                    </Box>

                    {/* Loading */}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={32} />
                        </Box>
                    )}

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Products */}
                    {!loading && !error && (
                        <Stack spacing={2}>
                            {products.map(product => (
                                <Card key={product.id} sx={{ display: 'flex', height: 120 }}>
                                    <CardMedia
                                        component="img"
                                        sx={{ width: 80, objectFit: 'contain', p: 1 }}
                                        image={product.image}
                                        alt={product.title}
                                    />
                                    <CardContent sx={{ flex: 1, p: 1, '&:last-child': { pb: 1 } }}>
                                        <Typography
                                            variant="subtitle2"
                                            component="h3"
                                            sx={{
                                                fontWeight: 600,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                mb: 0.5,
                                                lineHeight: 1.2
                                            }}
                                        >
                                            {product.title}
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 0.5
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                color="primary"
                                                sx={{ fontWeight: 600, fontSize: '1rem' }}
                                            >
                                                ${product.price}
                                            </Typography>
                                            <Chip
                                                label={product.category}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem', height: 20 }}
                                            />
                                        </Box>

                                        <Box
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                        >
                                            <Rating
                                                value={product.rating.rate}
                                                precision={0.1}
                                                readOnly
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                ({product.rating.count})
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}

                    {/* View More Button */}
                    {!loading && !error && products.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<ShoppingCart />}
                                onClick={openFullDashboard}
                            >
                                View All Products
                            </Button>
                        </Box>
                    )}

                    {/* Empty State */}
                    {!loading && !error && products.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                No products available
                            </Typography>
                        </Box>
                    )}
                </Box>
            </PopupContent>
        </>
    );
}
