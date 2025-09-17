import axios, { AxiosResponse } from 'axios';

import { ConfigConstant } from '../constant/config.constant';

// Types for authentication
export interface LoginRequest {
    TenDangNhap: string;
    MatKhau: string;
}

export interface LoginResponse {
    token: string;
    refreshToken?: string;
    user?: {
        id: string;
        email?: string;
        name?: string;
        groupName?: string;
        linkId?: string;
    };
    expiresIn?: number;
    tokenType?: string;
}

// Raw API response shape
interface ApiLoginResponse {
    UserId: string;
    TokenType: string;
    AccessToken: string;
    ExpiresIn: number;
    RefreshToken: string;
    ErrorMessage?: string | null;
    LienKetID?: string | null;
    NhomNguoiDung?: string | null;
}

export interface AuthError {
    message: string;
    status?: number;
    code?: string;
}

class AuthService {
    private baseURL: string;

    constructor() {
        this.baseURL = ConfigConstant.API_URL;
    }

    /**
     * Login user with email and password
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        try {
            const response: AxiosResponse<ApiLoginResponse> = await axios.post(
                `${this.baseURL}/api/Authentication/login`,
                credentials,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const data = response.data;

            // Handle server-returned error message even on 200
            if (!data?.AccessToken || data?.ErrorMessage) {
                throw {
                    message: data?.ErrorMessage || 'Đăng nhập thất bại',
                    status: 400,
                    code: 'LOGIN_FAILED'
                } as AuthError;
            }

            // Map API response to internal shape
            const mapped: LoginResponse = {
                token: data.AccessToken,
                refreshToken: data.RefreshToken,
                expiresIn: data.ExpiresIn,
                tokenType: data.TokenType,
                user: {
                    id: data.UserId,
                    name: undefined,
                    email: undefined,
                    groupName: data.NhomNguoiDung ?? undefined,
                    linkId: data.LienKetID ?? undefined
                }
            };

            return mapped;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Logout user (clear tokens from storage)
     */
    logout(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    }

    /**
     * Get stored authentication token
     */
    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    /**
     * Store authentication data
     */
    setAuthData(data: LoginResponse): void {
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }
        if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken);
        }
        if (data.user) {
            localStorage.setItem('user_data', JSON.stringify(data.user));
        }
    }

    /**
     * Get stored user data
     */
    getUserData(): any | null {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const token = this.getToken();
        return !!token;
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): AuthError {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const message = error.response.data?.message || error.response.data?.error || 'Đã xảy ra lỗi từ server';
            
            return {
                message: this.getErrorMessage(status, message),
                status,
                code: error.response.data?.code
            };
        } else if (error.request) {
            // Network error
            return {
                message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
                code: 'NETWORK_ERROR'
            };
        } else {
            // Other error
            return {
                message: error.message || 'Đã xảy ra lỗi không xác định',
                code: 'UNKNOWN_ERROR'
            };
        }
    }

    /**
     * Get user-friendly error messages
     */
    private getErrorMessage(status: number, defaultMessage: string): string {
        switch (status) {
            case 400:
                return 'Thông tin đăng nhập không hợp lệ';
            case 401:
                return 'Email hoặc mật khẩu không đúng';
            case 403:
                return 'Tài khoản của bạn đã bị khóa';
            case 404:
                return 'Không tìm thấy tài khoản';
            case 429:
                return 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau';
            case 500:
                return 'Lỗi server. Vui lòng thử lại sau';
            default:
                return defaultMessage;
        }
    }
}

export default new AuthService();
