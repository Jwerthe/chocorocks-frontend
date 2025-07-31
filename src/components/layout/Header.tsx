// src/components/layout/Header.tsx (Actualizado)
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const { user, logout } = useAuth();

  const handleMenuClick = (): void => {
    onMenuClick();
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleUserMenu = (): void => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <header className="bg-white border-b-2 border-black shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-30 h-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 h-full">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMenuClick}
            className="lg:hidden"
            type="button"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          <div className="hidden sm:block">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Sistema de Inventario Chocorocks
            </h1>
          </div>
          
          <div className="block sm:hidden">
            <h1 className="text-lg font-bold text-gray-900">
              Chocorocks
            </h1>
          </div>
        </div>

        {/* Right side - User menu and actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <button 
            className="p-2 text-gray-500 hover:text-gray-700 relative transition-colors"
            type="button"
            aria-label="Notificaciones"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v2" />
            </svg>
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-1 ring-white"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={toggleUserMenu}
              className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              type="button"
              aria-label="Menú de usuario"
            >
              <div className="w-8 h-8 bg-[#7ca1eb] border-2 border-black flex items-center justify-center font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-sm text-left">
                <p className="font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    type="button"
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Cerrar Sesión
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};