import axios, { AxiosError, AxiosInstance } from 'axios';

// URL cơ sở của API
const API_BASE_URL = 'http://laptrinhid.qlns.vn/api';

/**
 * Định nghĩa cấu trúc cho một đối tượng Lĩnh Vực.
 */
export interface LinhVuc {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

/**
 * Định nghĩa cấu trúc cho phản hồi từ API getall của LinhVuc.
 */
export interface LinhVucApiResponse {
    items: LinhVuc[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
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
 * Định nghĩa cấu trúc phản hồi chung, tương tự như trong dự án của bạn.
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error?: ApiError;
}

class LinhVucApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        // Khởi tạo một instance của axios với cấu hình mặc định
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            timeout: 15000, // Timeout sau 15 giây
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // (Tùy chọn) Thêm interceptor để log request/response nếu cần
        this.axiosInstance.interceptors.request.use(config => {
            console.log(`🚀 Gửi yêu cầu API: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        });
    }

    /**
     * Xử lý lỗi từ axios và chuyển đổi thành định dạng ApiError.
     * @param error Lỗi trả về từ Axios.
     * @returns Một đối tượng ApiError.
     */
    private handleError(error: AxiosError): ApiError {
        if (error.response) {
            // Lỗi từ phía server (có response trả về)
            return {
                message: (error.response.data as any)?.message || error.message || 'Lỗi từ máy chủ',
                status: error.response.status,
                code: error.code
            };
        } else if (error.request) {
            // Lỗi mạng (không nhận được response)
            return {
                message: 'Lỗi mạng, không nhận được phản hồi'
            };
        }
        // Lỗi khác
        return {
            message: error.message || 'Có lỗi không xác định xảy ra'
        };
    }

    /**
     * Lấy danh sách Lĩnh Vực có phân trang.
     * @param pageNumber Số trang hiện tại.
     * @param pageSize Số mục trên mỗi trang.
     * @returns Một Promise chứa ApiResponse với dữ liệu LinhVucApiResponse.
     */
    async getAllLinhVuc(
        pageNumber: number,
        pageSize: number
    ): Promise<ApiResponse<LinhVucApiResponse>> {
        try {
            // Gọi API bằng phương thức GET
            const response = await this.axiosInstance.get<LinhVucApiResponse>('/LinhVuc/getall', {
                params: {
                    pageNumber,
                    pageSize
                }
            });

            // Trả về dữ liệu nếu thành công
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            // Trả về lỗi nếu thất bại
            return {
                success: false,
                data: null,
                error: this.handleError(error as AxiosError)
            };
        }
    }
}

// Xuất một instance duy nhất của service (singleton pattern)
export const linhVucApiService = new LinhVucApiService();
