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
        const token = authService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Đã đính kèm token vào header.');
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default apiService;
