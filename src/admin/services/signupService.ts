import axios, { AxiosResponse } from 'axios';

import { ConfigConstant } from '../constant/config.constant';

// Types for signup
export interface SignupRequest {
    HoVaTen: string;
    Email: string;
    SoDienThoai: string;
    DiaChi: string;
    MaSoThue: string;
    MatMa: string;
    BaseUrl: string;
    ChinhSachQuyenRiengTu: boolean;
}

export interface EmailCheckResponse {
    Succeeded: boolean;
    Errors: string[];
    Result: string | null;
}

export interface SignupResponse {
    Succeeded: boolean;
    Errors: string[];
    Result: any;
}

export interface SignupError {
    message: string;
    status?: number;
    code?: string;
}

class SignupService {
    private baseURL: string;

    constructor() {
        this.baseURL = ConfigConstant.API_URL;
    }

    /**
     * Check if email is available for registration
     */
    async checkEmail(email: string): Promise<EmailCheckResponse> {
        try {
            const response: AxiosResponse<EmailCheckResponse> = await axios.get(
                `${this.baseURL}/api/DangKy/kiemtraemaildangky`,
                {
                    params: { Email: email },
                    headers: {
                        'accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Register new user
     */
    async signup(userData: SignupRequest): Promise<SignupResponse> {
        try {
            const response: AxiosResponse<SignupResponse> = await axios.post(
                `${this.baseURL}/api/DangKy`,
                userData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    },
                    timeout: 15000
                }
            );

            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Resend verification email
     */
    async resendVerification(email: string): Promise<{ Succeeded: boolean; Errors: string[]; Result: { Verification: string } | null }> {
        try {
            const response: AxiosResponse<{ Succeeded: boolean; Errors: string[]; Result: { Verification: string } | null }> = await axios.post(
                `${this.baseURL}/api/DangKy/XacThucLaiEmail`,
                { Email: email },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): SignupError {
        if (error.response) {
            const status = error.response.status;
            const rawDetail: string | undefined = error.response.data?.detail;

            let code: string | undefined;
            let message: string | undefined;

            if (rawDetail) {
                const match = rawDetail.match(/^(\d+)[\s_]+(.+)$/);
                if (match) {
                    code = match[1];       // "1"
                    message = match[2];    // "Tài khoản chưa được kích hoạt."
                } else {
                    message = rawDetail;
                }
            }

            const rawMessage: string | undefined =
                error.response.data?.message || error.response.data?.error;

            if (!message) message = rawMessage || 'Đã xảy ra lỗi từ server';

            return {
                message,
                status,
                code
            };
        } else if (error.request) {
            return {
                message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
                code: 'NETWORK_ERROR'
            };
        } else {
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
                return 'Thông tin đăng ký không hợp lệ';
            case 409:
                return 'Email đã được sử dụng';
            case 422:
                return 'Dữ liệu không hợp lệ';
            case 500:
                return 'Lỗi server. Vui lòng thử lại sau';
            default:
                return defaultMessage;
        }
    }
}

export default new SignupService();
