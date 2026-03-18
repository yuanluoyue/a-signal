import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, logout } from '@/utils/auth';
import { history } from 'umi';
import { message } from 'antd';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api/v1' 
  : '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    console.log('[API Interceptor] Token:', token ? 'exists' : 'undefined');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    // 如果后端返回统一格式 { success: true, data: ..., timestamp: ... }，则提取 data
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      return data.data;
    }
    return data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          message.error('登录已过期，请重新登录');
          logout();
          history.push('/login');
          break;
        case 403:
          message.error('没有权限执行此操作');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 422:
          const errorData = data as { message?: string; errors?: Record<string, string[]> };
          if (errorData.errors) {
            const firstError = Object.values(errorData.errors)[0]?.[0];
            message.error(firstError || '请求参数错误');
          } else {
            message.error(errorData.message || '请求参数错误');
          }
          break;
        case 500:
          message.error('服务器错误，请稍后重试');
          break;
        default:
          message.error((data as { message?: string })?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

export default api;
