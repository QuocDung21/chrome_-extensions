import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

import { API_CONFIG, API_ENDPOINTS, ApiError, ApiResponse, Product } from '../types/api';

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            config => {
                console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            error => {
                console.error('❌ API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => {
                console.log(`✅ API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error: AxiosError) => {
                console.error('❌ API Response Error:', error);
                return Promise.reject(this.handleError(error));
            }
        );
    }

    private handleError(error: AxiosError): ApiError {
        if (error.response) {
            // Server responded with error status
            return {
                message: error.response.data?.message || error.message || 'Server error',
                status: error.response.status,
                code: error.code
            };
        } else if (error.request) {
            // Request was made but no response received
            return {
                message: 'Network error - no response received',
                code: error.code
            };
        } else {
            // Something else happened
            return {
                message: error.message || 'Unknown error occurred',
                code: error.code
            };
        }
    }

    private async retryRequest<T>(
        requestFn: () => Promise<AxiosResponse<T>>,
        attempts: number = API_CONFIG.RETRY_ATTEMPTS
    ): Promise<ApiResponse<T>> {
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await requestFn();
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                console.warn(`🔄 API Retry attempt ${i + 1}/${attempts}:`, error);

                if (i === attempts - 1) {
                    // Last attempt failed
                    return {
                        success: false,
                        data: null as any,
                        error: error as ApiError
                    };
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
            }
        }

        return {
            success: false,
            data: null as any,
            error: { message: 'Max retry attempts exceeded' }
        };
    }

    // Get all products
    async getProducts(): Promise<ApiResponse<Product[]>> {
        return this.retryRequest(() => this.axiosInstance.get<Product[]>(API_ENDPOINTS.PRODUCTS));
    }

    // Get product by ID
    async getProductById(id: number): Promise<ApiResponse<Product>> {
        return this.retryRequest(() =>
            this.axiosInstance.get<Product>(API_ENDPOINTS.PRODUCT_BY_ID(id))
        );
    }

    // Get all categories
    async getCategories(): Promise<ApiResponse<string[]>> {
        return this.retryRequest(() => this.axiosInstance.get<string[]>(API_ENDPOINTS.CATEGORIES));
    }

    // Get products by category
    async getProductsByCategory(category: string): Promise<ApiResponse<Product[]>> {
        return this.retryRequest(() =>
            this.axiosInstance.get<Product[]>(API_ENDPOINTS.PRODUCTS_BY_CATEGORY(category))
        );
    }

    // Get limited products (for pagination)
    async getLimitedProducts(limit: number): Promise<ApiResponse<Product[]>> {
        return this.retryRequest(() =>
            this.axiosInstance.get<Product[]>(`${API_ENDPOINTS.PRODUCTS}?limit=${limit}`)
        );
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
