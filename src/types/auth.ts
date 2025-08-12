// src/types/auth.ts (Actualizado con nuevos roles)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE'; // ⚠️ CAMBIO: Antes era 'USER', ahora 'EMPLOYEE'
  isAuthenticated: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Tipos para respuestas del backend
export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  isAuthenticated: boolean;
}

export interface AuthStatusResponse {
  isAuthenticated: boolean;
  user: AuthUserResponse | null;
}

// Tipo para errores de API
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Tipos para formularios
export interface FormErrors {
  [key: string]: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// Interfaces para componentes
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}