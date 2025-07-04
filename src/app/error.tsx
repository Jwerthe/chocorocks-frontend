// src/app/error.tsx
'use client';

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md w-full">
        <Alert variant="error">
          <div className="text-center">
            <h2 className="text-lg font-bold mb-2">¡Oops! Algo salió mal</h2>
            <p className="text-sm mb-4">
              Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
            </p>
            <Button onClick={reset} variant="primary">
              Intentar de Nuevo
            </Button>
          </div>
        </Alert>
      </div>
    </div>
  );
}
