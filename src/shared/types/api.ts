// API types for FakeStore API
export interface Product {
    id: number;
    title: string;
    price: number;
    description: string;
    category: string;
    image: string;
    rating: {
        rate: number;
        count: number;
    };
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: ApiError;
}

// API endpoints
export const API_ENDPOINTS = {
    PRODUCTS: 'https://fakestoreapi.com/products',
    PRODUCT_BY_ID: (id: number) => `https://fakestoreapi.com/products/${id}`,
    CATEGORIES: 'https://fakestoreapi.com/products/categories',
    PRODUCTS_BY_CATEGORY: (category: string) => `https://fakestoreapi.com/products/category/${category}`,
} as const;

// API configuration
export const API_CONFIG = {
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
} as const;
