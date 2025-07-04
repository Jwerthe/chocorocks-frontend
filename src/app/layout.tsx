// src/app/layout.tsx (Updated)
import type { Metadata } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

export const metadata: Metadata = {
  title: "Chocorocks - Sistema de Inventario",
  description: "Sistema de gestión de inventario para Chocorocks - Tesis PUCE TEC 2025",
  viewport: "width=device-width, initial-scale=1",
  keywords: "inventario, chocolate, gestión, stock, productos, ventas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ErrorBoundary>
          <NotificationProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </NotificationProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}