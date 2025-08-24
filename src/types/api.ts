// src/types/api.ts
import { User } from './auth';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface AuthStatusResponse {
  isAuthenticated: boolean;
  user: User | null;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  isAuthenticated: boolean;
}