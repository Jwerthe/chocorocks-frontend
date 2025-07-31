'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const pathname = usePathname();
  
  // Páginas que no necesitan autenticación
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  const handleSidebarToggle = (): void => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = (): void => {
    setSidebarOpen(false);
  };

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header onMenuClick={handleSidebarToggle} />
        
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
          
          <main className="flex-1 lg:ml-64">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};