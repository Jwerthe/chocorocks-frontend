// src/services/authService.ts
import { supabase } from '@/lib/supabase';
import { LoginCredentials, User, AuthUserResponse, ApiError } from '@/types/auth';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Clase de error personalizada para API
export class AuthError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

// Interfaz para la respuesta de Supabase
interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

class AuthService {
  private readonly TOKEN_KEY = 'auth-token';
  private readonly REFRESH_TOKEN_KEY = 'refresh-token';

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      // 1. Validar credenciales
      this.validateCredentials(credentials);

      // 2. Autenticar con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new AuthError(this.translateSupabaseError(error.message), error.message);
      }

      if (!data.session) {
        throw new AuthError('No se pudo establecer la sesión');
      }

      // 3. Guardar tokens en cookies
      this.saveTokens(data.session);

      // 4. Validar con backend y obtener información del usuario
      const userInfo = await this.validateTokenWithBackend(data.session.access_token);
      
      return userInfo;
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Error al iniciar sesión'
      );
    }
  }

  async logout(): Promise<void> {
    try {
      // 1. Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error al cerrar sesión en Supabase:', error.message);
      }
      
      // 2. Eliminar tokens de cookies
      this.clearTokens();
    } catch (error: unknown) {
      console.error('Error al cerrar sesión:', error);
      // Aún así elimina los tokens locales
      this.clearTokens();
    }
  }

  async validateTokenWithBackend(token: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/chocorocks/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Token inválido o expirado', 'INVALID_TOKEN', 401);
        }
        throw new AuthError('Error del servidor', 'SERVER_ERROR', response.status);
      }

      const userData: AuthUserResponse = await response.json();
      return this.mapAuthUserResponseToUser(userData);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new AuthError('Error de conexión con el servidor', 'NETWORK_ERROR');
      }
      throw new AuthError('Error al validar token', 'VALIDATION_ERROR');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      return await this.validateTokenWithBackend(token);
    } catch (error: unknown) {
      // Token inválido, limpiar cookies
      this.clearTokens();
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        this.clearTokens();
        return null;
      }

      this.saveTokens(data.session);
      return data.session.access_token;
    } catch (error: unknown) {
      console.error('Error al refrescar token:', error);
      this.clearTokens();
      return null;
    }
  }

  getToken(): string | null {
    return Cookies.get(this.TOKEN_KEY) || null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Métodos privados
  private validateCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new AuthError('Email y contraseña son requeridos', 'MISSING_CREDENTIALS');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new AuthError('Email no válido', 'INVALID_EMAIL');
    }

    if (credentials.password.length < 6) {
      throw new AuthError('La contraseña debe tener al menos 6 caracteres', 'WEAK_PASSWORD');
    }
  }

  private saveTokens(session: SupabaseSession): void {
    const cookieOptions = {
      expires: 7, // 7 días
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    Cookies.set(this.TOKEN_KEY, session.access_token, cookieOptions);
    Cookies.set(this.REFRESH_TOKEN_KEY, session.refresh_token, cookieOptions);
  }

  private clearTokens(): void {
    Cookies.remove(this.TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }

  private mapAuthUserResponseToUser(authResponse: AuthUserResponse): User {
    return {
      id: authResponse.id,
      email: authResponse.email,
      name: authResponse.name,
      role: authResponse.role as 'ADMIN' | 'EMPLOYEE',
      isAuthenticated: authResponse.isAuthenticated,
    };
  }

  private translateSupabaseError(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Credenciales inválidas. Verifica tu email y contraseña.',
      'Email not confirmed': 'Email no confirmado. Revisa tu bandeja de entrada.',
      'Too many requests': 'Demasiados intentos. Intenta de nuevo en unos minutos.',
      'User not found': 'Usuario no encontrado.',
      'Invalid email': 'Email no válido.',
    };

    return errorMap[errorMessage] || errorMessage || 'Error de autenticación';
  }
}

export const authService = new AuthService();