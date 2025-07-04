// src/components/layout/LoadingSpinner.tsx
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#7ca1eb] border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Cargando...</p>
      </div>
    </div>
  );
};