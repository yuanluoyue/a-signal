import api from './api';
import { User } from '@/utils/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nickname: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatarSeed?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response as unknown as LoginResponse;
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response as unknown as LoginResponse;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response as unknown as User;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response as unknown as User;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await api.put<User>('/auth/profile', data);
    return response as unknown as User;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.put('/auth/password', data);
  },
};
