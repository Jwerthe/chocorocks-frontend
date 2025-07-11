// src/components/layout/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
          <div className="max-w-md w-full">
            <Alert variant="error">
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-lg font-bold mb-2">¡Oops! Algo salió mal</h2>
                <p className="text-sm mb-4">
                  Ha ocurrido un error inesperado en la aplicación. Por favor, intenta una de las siguientes opciones:
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={this.handleReset}
                    variant="primary"
                    className="w-full"
                  >
                    Intentar de Nuevo
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload}
                    variant="secondary"
                    className="w-full"
                  >
                    Recargar Página
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm font-medium">
                      Detalles del Error (Desarrollo)
                    </summary>
                    <div className="mt-2 p-2 bg-gray-100 border text-xs font-mono overflow-auto max-h-32">
                      <p className="font-bold">Error:</p>
                      <p>{this.state.error.message}</p>
                      {this.state.error.stack && (
                        <>
                          <p className="font-bold mt-2">Stack Trace:</p>
                          <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                        </>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}