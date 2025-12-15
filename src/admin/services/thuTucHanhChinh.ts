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
    maLinhVuc: string; // Để backward compatibility
    linhVuc?: {
        maLinhVuc: string;
        tenLinhVuc: string;
        maNganh: string;
        moTa: string;
    }; // Mới: object LinhVuc từ API
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

            const serverData = response.data.Result;

            // MỚI: Cập nhật logic map để chuyển đổi tất cả các trường
            const transformedData: ThuTucHanhChinhApiResponse = {
                items: serverData.Items.map((item: any) => {
                    console.log('🔄 Mapping ThuTucHanhChinh item:', {
                        hasLinhVucObject: !!item.LinhVuc,
                        linhVucObject: item.LinhVuc,
                        oldMaLinhVuc: item.MaLinhVuc
                    });

                    return {
                        thuTucHanhChinhID: item.ThuTucHanhChinhID,
                        maThuTucHanhChinh: item.MaThuTucHanhChinh,
                        tenThuTucHanhChinh: item.TenThuTucHanhChinh,
                        maCapHanhChinh: item.MaCapHanhChinh || item.CapHanhChinh,
                        loaiThuTucHanhChinh: item.LoaiThuTucHanhChinh,
                        // Xử lý cả old format (MaLinhVuc string) và new format (LinhVuc object)
                        maLinhVuc: item.LinhVuc?.MaLinhVuc || item.MaLinhVuc,
                        linhVuc: item.LinhVuc
                            ? {
                                maLinhVuc: item.LinhVuc.MaLinhVuc,
                                tenLinhVuc: item.LinhVuc.TenLinhVuc,
                                maNganh: item.LinhVuc.MaNganh,
                                moTa: item.LinhVuc.MoTa
                            }
                            : undefined,
                        trinhTuThucHien: item.TrinhTuThucHien,
                        cachThucHien: item.CachThucHien,
                        doiTuongThucHien: item.DoiTuongThucHien,
                        diaChiTiepNhan: item.DiaChiTiepNhan,
                        yeuCau: item.YeuCau,
                        ketQuaThucHien: item.KetQuaThucHien,
                        moTa: item.MoTa,
                        canCuPhapLy: item.CanCuPhapLy,
                        vanBanID: item.VanBanID
                    };
                }),
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
