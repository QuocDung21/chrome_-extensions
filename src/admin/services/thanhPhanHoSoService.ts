// src/admin/services/thanhPhanHoSoTTHCService.ts
import { AxiosError } from 'axios';

import apiService from './axios.cofig';

// Giả định file config axios của bạn ở đây

/**
 * Định nghĩa cấu trúc cho một đối tượng Thành Phần Hồ Sơ TTHC.
 */
export interface ThanhPhanHoSoTTHC {
    thanhPhanHoSoTTHCID: string;
    thuTucHanhChinhID: string;
    tenThanhPhanHoSoTTHC: string;
    tenTepDinhKem: string;
    duongDanTepDinhKem: string;
    duongDanTepDinhKemLocal?: string; // Local file path/ID for offline access
    soBanChinh: string;
    soBanSao: string;
    ghiChu: string | null;
}

/**
 * Định nghĩa cấu trúc cho phản hồi API getall của Thành Phần Hồ Sơ.
 */
export interface ThanhPhanHoSoTTHCApiResponse {
    items: ThanhPhanHoSoTTHC[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Định nghĩa cấu trúc lỗi và phản hồi chung (có thể đã có ở file khác).
 */
export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    error?: ApiError;
}

class ThanhPhanHoSoTTHCApiService {
    private handleError(error: AxiosError): ApiError {
        if (error.response) {
            return {
                message: (error.response.data as any)?.message || error.message || 'Lỗi từ máy chủ',
                status: error.response.status,
                code: error.code
            };
        } else if (error.request) {
            return {
                message: 'Lỗi mạng, không nhận được phản hồi'
            };
        }
        return {
            message: error.message || 'Có lỗi không xác định xảy ra'
        };
    }

    /**
     * Lấy danh sách Thành Phần Hồ Sơ theo Mã Thủ Tục Hành Chính.
     * @param pageNumber Số trang hiện tại.
     * @param pageSize Số mục trên mỗi trang.
     * @param maThuTucHanhChinh Mã của thủ tục hành chính cần lấy hồ sơ.
     * @returns Một Promise chứa ApiResponse với dữ liệu ThanhPhanHoSoTTHCApiResponse.
     */
    async getAllThanhPhanHoSoTTHC(
        pageNumber: number,
        pageSize: number,
        maThuTucHanhChinh: string
    ): Promise<ApiResponse<ThanhPhanHoSoTTHCApiResponse>> {
        try {
            const response = await apiService.get<any>('/ThanhPhanHoSoTTHC/getall', {
                params: {
                    pageNumber,
                    pageSize,
                    maThuTucHanhChinh
                }
            });

            const serverData = response.data.Result;
            const transformedData: ThanhPhanHoSoTTHCApiResponse = {
                items: serverData.Items.map((item: any) => ({
                    thanhPhanHoSoTTHCID: item.ThanhPhanHoSoTTHCID,
                    thuTucHanhChinhID: item.ThuTucHanhChinhID,
                    tenThanhPhanHoSoTTHC: item.TenThanhPhanHoSoTTHC,
                    tenTepDinhKem: item.TenTepDinhKem,
                    duongDanTepDinhKem: item.DuongDanTepDinhKem,
                    soBanChinh: item.SoBanChinh,
                    soBanSao: item.SoBanSao,
                    ghiChu: item.GhiChu
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
            console.error('❌ Lỗi khi gọi API Thành Phần Hồ Sơ TTHC:', error);
            return {
                success: false,
                data: null,
                error: this.handleError(error as AxiosError)
            };
        }
    }
}

// Xuất một instance duy nhất của service (singleton pattern)
export const thanhPhanHoSoTTHCApiService = new ThanhPhanHoSoTTHCApiService();
