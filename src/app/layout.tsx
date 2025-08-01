// src/app/layout.tsx (Corregido)
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Chocorocks - Sistema de Inventario",
  description: "Sistema de gestión de inventario para Chocorocks - Tesis PUCE TEC 2025",
  keywords: "inventario, chocolate, gestión, stock, productos, ventas",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <MainLayout>
                {children}
              </MainLayout>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}