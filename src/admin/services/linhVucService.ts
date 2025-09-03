import apiService from './axios.cofig';

export interface LinhVuc {
    maLinhVuc: string;
    tenLinhVuc: string;
    maNganh: string;
    moTa: string;
}

/**
 * Định nghĩa cấu trúc cho phản hồi từ API getall của LinhVuc (sử dụng camelCase).
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
    /**
     * Xử lý lỗi từ axios và chuyển đổi thành định dạng ApiError.
     * @param error Lỗi trả về từ Axios.
     * @returns Một đối tượng ApiError.
     */

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
            const response = await apiService.get<any>('/LinhVuc/getall', {
                params: {
                    pageNumber,
                    pageSize
                }
            });

            const serverData = response.data;
            const transformedData: LinhVucApiResponse = {
                items: serverData.Items.map((item: any) => ({
                    maLinhVuc: item.MaLinhVuc,
                    tenLinhVuc: item.TenLinhVuc,
                    maNganh: item.MaNganh,
                    moTa: item.MoTa
                })),
                totalCount: serverData.TotalCount,
                pageNumber: serverData.PageNumber,
                pageSize: serverData.PageSize,
                totalPages: serverData.TotalPages
            };
            return {
                success: true,
                data: transformedData
            };
        } catch (error) {
            console.error('❌ Lỗi khi gọi API:', error);
            return {
                success: false,
                data: null
            };
        }
    }
}

export const linhVucApiService = new LinhVucApiService();
