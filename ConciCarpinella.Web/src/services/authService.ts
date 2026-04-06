import api from './api';
import type { LoginRequest, LoginResponse } from '../types';

export const authService = {
  login: async (datos: LoginRequest): Promise<LoginResponse> => {
    const resp = await api.post<LoginResponse>('/auth/login', datos);
    return resp.data;
  },
};
