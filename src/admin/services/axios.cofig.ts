import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import authService from './authService';

const API_BASE_URL = 'http://laptrinhid.qlns.vn/api';

const apiService: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

apiService.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token_ = authService.getToken();
        console.log('token_', token_)
        console.log(`🚀 Gửi yêu cầu API: ${config.method?.toUpperCase()} ${config.url}`);

        const token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiIxNzgzZWQ3YS0xYzJlLTRhMzYtOWZhMi1hMjkyMGM0NzFjNDEiLCJUZW5EYW5nTmhhcCI6InZvdGFtcGh1Yzk5OTk5QGdtYWlsLmNvbSIsImV4cCI6MTc2MDE0ODU3NiwiaXNzIjoiTlRTT0ZUIiwiYXVkIjoiTlRTT0ZUIn0.kuGIdgD4u1d56kIS-VTa8i9lA1ZBihNOFMZOYee3hu4';

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Đã đính kèm token vào header.');
        }

        return config;
    },
    error => {
        // Xử lý lỗi của request
        return Promise.reject(error);
    }
);

export default apiService;
