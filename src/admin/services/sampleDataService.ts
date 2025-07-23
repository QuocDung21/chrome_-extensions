import { DocumentData } from './documentService';

/**
 * Service to provide sample data for testing document generation
 */
class SampleDataService {
    /**
     * Get sample personal information data
     */
    getSamplePersonalData(): DocumentData {
        return {
            // Thông tin cá nhân
            ho_ten: 'Nguyễn Văn An',
            ngay_sinh: '15/03/1985',
            so_cccd: '001085123456',
            ngay_cap_cccd: '20/01/2020',
            noi_cap_cccd: 'Cục Cảnh sát ĐKQL cư trú và DLQG về dân cư',
            dia_chi_thuong_tru: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
            so_dien_thoai: '0901234567',
            email: 'nguyenvanan@email.com',
            
            // Thông tin kinh doanh
            ten_cua_hang: 'Cửa hàng tạp hóa An Phát',
            dia_chi_kinh_doanh: '456 Đường DEF, Phường UVW, Quận 2, TP.HCM',
            nganh_nghe: 'Bán lẻ hàng tạp hóa',
            von_dang_ky: '50,000,000',
            
            // Thông tin thuế
            ma_so_thue: '8765432109',
            thu_nhap_chiu_thue: '120,000,000',
            thue_phai_nop: '12,000,000',
            
            // Ngày tháng
            ngay_hien_tai: new Date().toLocaleDateString('vi-VN'),
            current_date: new Date().toLocaleDateString('vi-VN'),
            current_time: new Date().toLocaleTimeString('vi-VN'),
            current_datetime: new Date().toLocaleString('vi-VN')
        };
    }

    /**
     * Get sample business registration data
     */
    getSampleBusinessData(): DocumentData {
        return {
            ho_ten: 'Trần Thị Bình',
            ngay_sinh: '22/07/1990',
            so_cccd: '001090987654',
            ngay_cap_cccd: '15/05/2021',
            noi_cap_cccd: 'Cục Cảnh sát ĐKQL cư trú và DLQG về dân cư',
            dia_chi_thuong_tru: '789 Đường GHI, Phường RST, Quận 3, TP.HCM',
            so_dien_thoai: '0987654321',
            email: 'tranthibinh@email.com',
            
            ten_cua_hang: 'Salon tóc Bình An',
            dia_chi_kinh_doanh: '321 Đường JKL, Phường MNO, Quận 4, TP.HCM',
            nganh_nghe: 'Dịch vụ làm đẹp',
            von_dang_ky: '100,000,000',
            
            current_date: new Date().toLocaleDateString('vi-VN'),
            current_time: new Date().toLocaleTimeString('vi-VN'),
            current_datetime: new Date().toLocaleString('vi-VN')
        };
    }

    /**
     * Get sample tax declaration data
     */
    getSampleTaxData(): DocumentData {
        return {
            ho_ten: 'Lê Văn Cường',
            ma_so_thue: '1234567890',
            dia_chi: '555 Đường PQR, Phường STU, Quận 5, TP.HCM',
            so_cccd: '001075555666',
            ngay_cap_cccd: '10/10/2019',
            noi_cap_cccd: 'Cục Cảnh sát ĐKQL cư trú và DLQG về dân cư',
            
            thu_nhap_chiu_thue: '200,000,000',
            thue_phai_nop: '20,000,000',
            thue_da_nop: '15,000,000',
            thue_con_lai: '5,000,000',
            
            nam_thue: new Date().getFullYear().toString(),
            current_date: new Date().toLocaleDateString('vi-VN'),
            current_time: new Date().toLocaleTimeString('vi-VN'),
            current_datetime: new Date().toLocaleString('vi-VN')
        };
    }

    /**
     * Get comprehensive sample data combining all types
     */
    getComprehensiveSampleData(): DocumentData {
        return {
            ...this.getSamplePersonalData(),
            ...this.getSampleBusinessData(),
            ...this.getSampleTaxData(),
            
            // Additional fields
            gioi_tinh: 'Nam',
            dan_toc: 'Kinh',
            ton_giao: 'Không',
            trinh_do_hoc_van: 'Đại học',
            nghe_nghiep: 'Kinh doanh',
            
            // Bank information
            so_tai_khoan: '1234567890123',
            ngan_hang: 'Ngân hàng TMCP Á Châu (ACB)',
            chi_nhanh: 'Chi nhánh Sài Gòn',
            
            // Company information
            ten_cong_ty: 'Công ty TNHH ABC',
            ma_so_doanh_nghiep: '0123456789',
            dia_chi_cong_ty: '999 Đường XYZ, Phường ABC, Quận 1, TP.HCM',
            dien_thoai_cong_ty: '028-12345678',
            
            // Additional dates
            ngay_thanh_lap: '01/01/2020',
            ngay_bat_dau_kinh_doanh: '15/01/2020',
            ngay_ket_thuc_kinh_doanh: '31/12/2025'
        };
    }

    /**
     * Save sample data to Chrome storage for testing
     */
    async saveSampleDataToStorage(dataType: 'personal' | 'business' | 'tax' | 'comprehensive' = 'comprehensive'): Promise<void> {
        try {
            let sampleData: DocumentData;
            
            switch (dataType) {
                case 'personal':
                    sampleData = this.getSamplePersonalData();
                    break;
                case 'business':
                    sampleData = this.getSampleBusinessData();
                    break;
                case 'tax':
                    sampleData = this.getSampleTaxData();
                    break;
                default:
                    sampleData = this.getComprehensiveSampleData();
            }

            await chrome.storage.local.set({
                formData: sampleData,
                scrapedData: {
                    page_title: 'Trang web mẫu',
                    page_url: 'https://example.com',
                    scraped_at: new Date().toISOString()
                }
            });
            
            console.log('Sample data saved to storage:', sampleData);
        } catch (error) {
            console.error('Error saving sample data:', error);
            throw new Error('Không thể lưu dữ liệu mẫu');
        }
    }

    /**
     * Clear all data from Chrome storage
     */
    async clearStorageData(): Promise<void> {
        try {
            await chrome.storage.local.clear();
            console.log('Storage data cleared');
        } catch (error) {
            console.error('Error clearing storage data:', error);
            throw new Error('Không thể xóa dữ liệu');
        }
    }

    /**
     * Get current data from Chrome storage
     */
    async getCurrentStorageData(): Promise<DocumentData> {
        try {
            const result = await chrome.storage.local.get(['formData', 'scrapedData']);
            return {
                ...result.formData,
                ...result.scrapedData
            };
        } catch (error) {
            console.error('Error getting storage data:', error);
            return {};
        }
    }
}

// Export singleton instance
export const sampleDataService = new SampleDataService();
export default sampleDataService;
