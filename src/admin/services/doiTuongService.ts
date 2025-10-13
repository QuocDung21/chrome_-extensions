import apiService from './axios.cofig';

/** Đối tượng thực hiện (camelCase) */
export interface DoiTuongThucHien {
  maDoiTuongThucHien: string;
  tenDoiTuongThucHien: string;
}

/** Lỗi API chung */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/** Khung phản hồi chung */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
}

/**
 * Service gọi API “Đối tượng thực hiện”
 * Endpoint: /DoiTuongThucHien/getcombo
 * Response mẫu:
 * {
 *   "Succeeded": true,
 *   "Errors": [],
 *   "Result": [
 *     { "MaDoiTuongThucHien": "1", "TenDoiTuongThucHien": "Cá nhân" }, ...
 *   ]
 * }
 */
class DoiTuongThucHienApiService {
  async getAllDoiTuongThucHien(): Promise<ApiResponse<DoiTuongThucHien[]>> {
    try {
      const response = await apiService.get<any>('/DoiTuongThucHien/getcombo');
      const serverData = response?.data?.Result ?? [];

      const items: DoiTuongThucHien[] = (Array.isArray(serverData) ? serverData : []).map(
        (item: any) => ({
          maDoiTuongThucHien: String(item.MaDoiTuongThucHien ?? '').trim(),
          tenDoiTuongThucHien: String(item.TenDoiTuongThucHien ?? '').trim()
        })
      ).filter(x => x.maDoiTuongThucHien && x.tenDoiTuongThucHien);

      return { success: true, data: items };
    } catch (error: any) {
      console.error('❌ Lỗi khi gọi API Đối tượng thực hiện:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi không xác định',
          status: error?.response?.status,
          code: error?.code
        }
      };
    }
  }
}

export const doiTuongThucHienApiService = new DoiTuongThucHienApiService();