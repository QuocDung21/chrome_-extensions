import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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
        console.log(`🚀 Gửi yêu cầu API: ${config.method?.toUpperCase()} ${config.url}`);

        // Gán cứng token bạn đã cung cấp
        const token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiI5ZjhkN2VhZS04ZTdkLTRhNWUtODJkOC01ZjQzNjYwMTczNTkiLCJUZW5EYW5nTmhhcCI6IkFkbWluIiwiZXhwIjoxNzU3NDk3Mzg1LCJpc3MiOiJOVFNPRlQiLCJhdWQiOiJOVFNPRlQifQ.vBIoSpe09yNa4rneaWIs0MCrq9OrHOUap7RuNuSkzhk';

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
