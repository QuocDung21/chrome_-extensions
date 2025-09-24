import apiService from './axios.cofig';

/**
 * Định nghĩa cấu trúc cho request chuyển đổi địa bàn hành chính.
 */
export interface ChuyenDoiDiaBanRequest {
    InputAddress: string;
}

/**
 * Định nghĩa cấu trúc cho response chuyển đổi địa bàn hành chính.
 */
export interface ChuyenDoiDiaBanResponse {
    Succeeded: boolean;
    Errors: string[];
    Result: string;
}

/**
 * Định nghĩa cấu trúc lỗi API chung.
 */
export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

/**
 * Định nghĩa cấu trúc phản hồi chung.
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error?: ApiError;
}

class ChuyenDoiApiService {
    /**
     * Chuyển đổi địa bàn hành chính.
     * @param inputAddress Địa chỉ đầu vào cần chuyển đổi.
     * @returns Một Promise chứa ApiResponse với dữ liệu địa chỉ đã chuyển đổi.
     */
    async chuyenDoiDiaBan(inputAddress: string): Promise<ApiResponse<ChuyenDoiDiaBanResponse>> {
        try {
            const requestData: ChuyenDoiDiaBanRequest = {
                InputAddress: inputAddress
            };

            const response = await apiService.post<ChuyenDoiDiaBanResponse>(
                '/DiaBanHanhChinh/chuyendoidiaBan',
                requestData
            );

            console.log('✅ Phản hồi từ API chuyển đổi địa bàn:', response.data);

            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            console.error('❌ Lỗi khi gọi API chuyển đổi địa bàn:', error);

            const apiError: ApiError = {
                message:
                    error.response?.data?.message ||
                    error.message ||
                    'Có lỗi xảy ra khi chuyển đổi địa bàn',
                status: error.response?.status,
                code: error.response?.data?.code
            };

            return {
                success: false,
                data: null,
                error: apiError
            };
        }
    }
}

export const chuyenDoiApiService = new ChuyenDoiApiService();
