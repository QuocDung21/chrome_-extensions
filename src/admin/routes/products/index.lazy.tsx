import { ReactElement, useEffect, useState } from 'react';

import { Refresh, ShoppingCart } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Grid,
    MenuItem,
    Pagination,
    Rating,
    TextField,
    Typography
} from '@mui/material';
import { createLazyFileRoute } from '@tanstack/react-router';

import LoadingSpinner from '@/admin/components/common/LoadingSpinner';
import { apiService } from '@/shared/services/api';
import { Product } from '@/shared/types/api';

export const Route = createLazyFileRoute('/products/')({
    component: Products
});

function Products(): ReactElement {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const ITEMS_PER_PAGE = 6;

    const loadProducts = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiService.getProducts();
            if (response.success) {
                setProducts(response.data);
            } else {
                setError(response.error?.message || 'Failed to load products');
            }
        } catch (err) {
            setError('Network error occurred');
            console.error('Error loading products:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await apiService.getCategories();
            if (response.success) {
                setCategories(['all', ...response.data]);
            }
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    // Filter products based on category and search term
    const filteredProducts = products.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchesSearch =
            product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
        setCurrentPage(page);
    };

    if (loading) {
        return <LoadingSpinner message="Loading products..." />;
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Products
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadProducts}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Search products"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search by title or description..."
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            select
                            label="Category"
                            value={selectedCategory}
                            onChange={e => handleCategoryChange(e.target.value)}
                        >
                            {categories.map(category => (
                                <MenuItem key={category} value={category}>
                                    {category === 'all'
                                        ? 'All Categories'
                                        : category.charAt(0).toUpperCase() + category.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Products Grid */}
            {paginatedProducts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No products found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or filter criteria
                    </Typography>
                </Box>
            ) : (
                <>
                    <Grid container spacing={3}>
                        {paginatedProducts.map(product => (
                            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <CardMedia
                                        component="img"
                                        height="200"
                                        image={product.image}
                                        alt={product.title}
                                        sx={{ objectFit: 'contain', p: 1 }}
                                    />
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" component="h2" gutterBottom noWrap>
                                            {product.title}
                                        </Typography>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {product.description}
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 1
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                color="primary"
                                                sx={{ fontWeight: 600 }}
                                            >
                                                ${product.price}
                                            </Typography>
                                            <Chip
                                                label={product.category}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Rating
                                                value={product.rating.rate}
                                                precision={0.1}
                                                readOnly
                                                size="small"
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                ({product.rating.count})
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                            />
                        </Box>
                    )}

                    {/* Results Info */}
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Showing {startIndex + 1}-
                            {Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
                            {filteredProducts.length} products
                        </Typography>
                    </Box>
                </>
            )}
        </Box>
    );
}
