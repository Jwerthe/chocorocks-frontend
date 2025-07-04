// src/components/layout/ErrorBoundary.tsx
'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full">
            <Alert variant="error">
              <div className="text-center">
                <h2 className="text-lg font-bold mb-2">¡Oops! Algo salió mal</h2>
                <p className="text-sm mb-4">
                  Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="primary"
                >
                  Recargar Página
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}