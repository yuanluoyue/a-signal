import client from './client';
import type { User } from './types';
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from './types';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/auth/login', data);
    return response as unknown as LoginResponse;
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await client.post<LoginResponse>('/auth/register', data);
    return response as unknown as LoginResponse;
  },

  getMe: async (): Promise<User> => {
    const response = await client.get<User>('/auth/me');
    return response as unknown as User;
  },

  getProfile: async (): Promise<User> => {
    const response = await client.get<User>('/auth/me');
    return response as unknown as User;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await client.put<User>('/auth/profile', data);
    return response as unknown as User;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await client.put('/auth/password', data);
  },
};
