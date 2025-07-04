// src/app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🍫</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Página No Encontrada</h2>
        <p className="text-gray-600 mb-6">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <Link href="/">
          <Button variant="primary">
            Volver al Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
}