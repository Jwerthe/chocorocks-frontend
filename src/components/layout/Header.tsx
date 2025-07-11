// src/components/layout/Header.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const handleMenuClick = (): void => {
    onMenuClick();
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 bg-[#7ca1eb] border-2 border-black flex items-center justify-center font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              A
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-medium text-gray-900">Administrador</p>
              <p className="text-gray-500 text-xs">admin@chocorocks.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};