import axios from 'axios';

export interface WordFillApiResponse {
  success: boolean;
  message: string;
  filePath?: string;
  replacements?: number;
  error?: string;
}

export interface WordFillData {
  so_cccd?: string;
  so_cmnd?: string;
  ho_ten?: string;
  gioi_tinh?: string;
  ngay_sinh?: string;
  noi_cu_tru?: string;
  ngay_cap_cccd?: string;
  [key: string]: string | undefined;
}

class WordFillApiService {
  private apiUrl: string = 'http://localhost:5003';

  /**
   * Set the API URL
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Check if the API is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/health`);
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Error checking Word Fill API health:', error);
      return false;
    }
  }

  /**
   * Fill a Word document with data
   */
  async fillDocument(file: File, data: WordFillData): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add data fields to form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value);
        }
      });

      const response = await axios.post(`${this.apiUrl}/fill`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      return new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
    } catch (error) {
      console.error('Error filling document:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error filling document');
    }
  }

  /**
   * Convert a .doc file to .docx
   */
  async convertDocToDocx(file: File): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${this.apiUrl}/convert`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      return new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
    } catch (error) {
      console.error('Error converting document:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error converting document');
    }
  }

  /**
   * Get the default field mappings supported by the API
   */
  getDefaultFieldMappings(): Record<string, string> {
    return {
      // Số CCCD
      "Số CCCD": "so_cccd",
      "CCCD": "so_cccd",
      "Căn cước công dân": "so_cccd",
      "Số căn cước": "so_cccd",
      "Số căn cước công dân": "so_cccd",
      "Số CMND hoặc căn cước công dân": "so_cccd",

      // Số CMND
      "Số CMND": "so_cmnd",
      "CMND": "so_cmnd",
      "Chứng minh nhân dân": "so_cmnd",
      "Số chứng minh": "so_cmnd",
      "Số chứng minh nhân dân": "so_cmnd",

      // Họ và tên
      "Họ và tên": "ho_ten",
      "Họ, chữ đệm, tên": "ho_ten",
      "Họ tên": "ho_ten",
      "Họ, chữ đệm, tên người yêu cầu": "ho_ten",
      "Tên": "ho_ten",

      // Giới tính
      "Giới tính": "gioi_tinh",
      "Phái": "gioi_tinh",
      "Nam/Nữ": "gioi_tinh",

      // Ngày sinh
      "Ngày sinh": "ngay_sinh",
      "Ngày, tháng, năm sinh": "ngay_sinh",
      "Sinh ngày": "ngay_sinh",
      "Năm sinh": "ngay_sinh",

      // Nơi cư trú
      "Nơi cư trú": "noi_cu_tru",
      "Địa chỉ cư trú": "noi_cu_tru",
      "Chỗ ở hiện tại": "noi_cu_tru",
      "Địa chỉ": "noi_cu_tru",

      // Ngày cấp CCCD
      "Ngày cấp CCCD": "ngay_cap_cccd",
      "Ngày cấp": "ngay_cap_cccd",
      "Cấp ngày": "ngay_cap_cccd",
      "Ngày cấp căn cước": "ngay_cap_cccd"
    };
  }

  /**
   * Get the default data fields
   */
  getDefaultData(): WordFillData {
    return {
      so_cccd: '123456789012',
      so_cmnd: '123456789',
      ho_ten: 'Nguyễn Văn A',
      gioi_tinh: 'Nam',
      ngay_sinh: '01/01/1990',
      noi_cu_tru: '123 Đường ABC, Quận 1, TP.HCM',
      ngay_cap_cccd: '15/05/2020',
      current_date: new Date().toLocaleDateString('vi-VN')
    };
  }
}

// Export singleton instance
export const wordFillApiService = new WordFillApiService();
export default wordFillApiService;