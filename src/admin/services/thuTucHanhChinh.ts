// src/admin/services/thuTucHanhChinh.ts
import { AxiosError } from 'axios';

import apiService from './axios.cofig';

/**
 * MỚI: Cập nhật interface với đầy đủ các trường từ API
 */
export interface ThuTucHanhChinh {
    thuTucHanhChinhID: string;
    maThuTucHanhChinh: string;
    tenThuTucHanhChinh: string;
    maCapHanhChinh: string;
    loaiThuTucHanhChinh: number;
    maLinhVuc: string;
    trinhTuThucHien: string;
    cachThucHien: string;
    doiTuongThucHien: string;
    diaChiTiepNhan: string;
    yeuCau: string;
    ketQuaThucHien: string;
    moTa: string;
    canCuPhapLy: string;
    vanBanID: string;
}

export interface ThuTucHanhChinhApiResponse {
    items: ThuTucHanhChinh[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

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

class ThuTucHanhChinhApiService {
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

    async getAllThuTucHanhChinh(
        pageNumber: number,
        pageSize: number,
        maLinhVuc?: string
    ): Promise<ApiResponse<ThuTucHanhChinhApiResponse>> {
        try {
            const params: { pageNumber: number; pageSize: number; maLinhVuc?: string } = {
                pageNumber,
                pageSize
            };
            if (maLinhVuc) {
                params.maLinhVuc = maLinhVuc;
            }

            const response = await apiService.get<any>('/ThuTucHanhChinh/getall', {
                params
            });

            const serverData = response.data;

            // MỚI: Cập nhật logic map để chuyển đổi tất cả các trường
            const transformedData: ThuTucHanhChinhApiResponse = {
                items: serverData.Items.map((item: any) => ({
                    thuTucHanhChinhID: item.ThuTucHanhChinhID,
                    maThuTucHanhChinh: item.MaThuTucHanhChinh,
                    tenThuTucHanhChinh: item.TenThuTucHanhChinh,
                    maCapHanhChinh: item.MaCapHanhChinh,
                    loaiThuTucHanhChinh: item.LoaiThuTucHanhChinh,
                    maLinhVuc: item.MaLinhVuc,
                    trinhTuThucHien: item.TrinhTuThucHien,
                    cachThucHien: item.CachThucHien,
                    doiTuongThucHien: item.DoiTuongThucHien,
                    diaChiTiepNhan: item.DiaChiTiepNhan,
                    yeuCau: item.YeuCau,
                    ketQuaThucHien: item.KetQuaThucHien,
                    moTa: item.MoTa,
                    canCuPhapLy: item.CanCuPhapLy,
                    vanBanID: item.VanBanID
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
            console.error('❌ Lỗi khi gọi API Thủ Tục Hành Chính:', error);
            return {
                success: false,
                data: null,
                error: this.handleError(error as AxiosError)
            };
        }
    }
}

export const thuTucHanhChinhApiService = new ThuTucHanhChinhApiService();
