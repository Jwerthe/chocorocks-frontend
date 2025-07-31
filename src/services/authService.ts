import { supabase } from '@/lib/supabase';
import { LoginCredentials, User } from '@/types/auth';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

class AuthService {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      // 1. Autenticar con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('No se pudo establecer la sesión');
      }

      // 2. Guardar token en cookies
      const token = data.session.access_token;
      Cookies.set('auth-token', token, {
        expires: 7, // 7 días
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // 3. Validar con backend y obtener información del usuario
      const userInfo = await this.validateTokenWithBackend(token);
      
      return userInfo;
    } catch (error: any) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  }

  async logout(): Promise<void> {
    try {
      // 1. Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // 2. Eliminar token de cookies
      Cookies.remove('auth-token');
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      // Aún así elimina el token local
      Cookies.remove('auth-token');
    }
  }

  async validateTokenWithBackend(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/chocorocks/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Token inválido');
    }

    const userData = await response.json();
    return userData;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = Cookies.get('auth-token');
      if (!token) return null;

      return await this.validateTokenWithBackend(token);
    } catch (error) {
      // Token inválido, limpiar cookies
      Cookies.remove('auth-token');
      return null;
    }
  }

  getToken(): string | null {
    return Cookies.get('auth-token') || null;
  }
}

export const authService = new AuthService();