// src/types/layout.ts
export interface HeaderProps {
  onMenuClick: () => void;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MainLayoutProps {
  children: React.ReactNode;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'EMPLOYEE';
}