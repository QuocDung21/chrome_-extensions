import { ProcessingData } from '../components/word-mapper/templateUtils';

const Utils = {
    convertScannedInfoToProcessingData: (data: any): ProcessingData => {
        // Handle mobile socket data format
        if (data.so_cccd || data.so_cmnd || data.ho_ten) {
            console.log('📱 Detected mobile socket data format, using as-is');
            return {
                ...data,
                cccd: data.cccd || data.so_cccd || '',
                cmnd: data.cmnd || data.so_cmnd || '',
                hoTen: data.hoTen || data.ho_ten || '',
                ngaySinh: data.ngaySinh || data.ngay_sinh || '',
                gioiTinh: data.gioiTinh || data.gioi_tinh || '',
                diaChi: data.diaChi || data.noi_cu_tru || '',
                ngayCap: data.ngayCap || data.ngay_cap || '',
                so_cccd: data.so_cccd || data.cccd || '',
                so_cmnd: data.so_cmnd || data.cmnd || '',
                ho_ten: data.ho_ten || data.hoTen || '',
                ngay_sinh: data.ngay_sinh || data.ngaySinh || '',
                gioi_tinh: data.gioi_tinh || data.gioiTinh || '',
                noi_cu_tru: data.noi_cu_tru || data.diaChi || '',
                ngay_cap: data.ngay_cap || data.ngayCap || '',
                // Tách ngày/tháng/năm
                ns_ngay: data.ns_ngay || '',
                ns_thang: data.ns_thang || '',
                ns_nam: data.ns_nam || '',
                nc_ngay: data.nc_ngay || '',
                nc_thang: data.nc_thang || '',
                nc_nam: data.nc_nam || ''
            } as ProcessingData;
        }
        return data;
    },
    getTemplateName: (template: any) => {
        return template.tenThanhPhanHoSoTTHC;
    }
};

export default Utils;
