// src/components/common/BackendErrorHandler.tsx
'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface BackendErrorHandlerProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  title?: string;
  description?: string;
}

export const BackendErrorHandler: React.FC<BackendErrorHandlerProps> = ({
  error,
  onRetry,
  showRetry = true,
  title = "Error de Conexión",
  description = "No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose."
}) => {
  const isConnectionError = error.includes('Network error') || 
                           error.includes('Failed to fetch') ||
                           error.includes('ERR_CONNECTION_REFUSED') ||
                           error.includes('Request timeout');

  const handleCheckBackend = (): void => {
    window.open('http://localhost:8080/chocorocks/api', '_blank');
  };

  return (
    <Card className="border-l-4 border-l-red-500">
      <div className="space-y-4">
        <Alert variant="error">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-sm mt-1">{description}</p>
            </div>
            
            <div className="text-sm bg-red-50 border border-red-200 p-3 rounded">
              <p className="font-medium text-red-800 mb-2">Detalles del error:</p>
              <p className="text-red-700 font-mono text-xs">{error}</p>
            </div>

            {isConnectionError && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <p className="font-medium text-blue-800 mb-2">💡 Posibles soluciones:</p>
                <ul className="text-blue-700 space-y-1 list-disc list-inside">
                  <li>Verifica que el backend esté ejecutándose en <code className="bg-blue-100 px-1 rounded">http://localhost:8080</code></li>
                  <li>Revisa que el servidor Spring Boot esté iniciado correctamente</li>
                  <li>Verifica la variable de entorno <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_API_URL</code></li>
                  <li>Comprueba que no haya problemas de CORS</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {showRetry && onRetry && (
                <Button onClick={onRetry} variant="primary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reintentar
                </Button>
              )}
              
              <Button onClick={handleCheckBackend} variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Verificar Backend
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    </Card>
  );
};