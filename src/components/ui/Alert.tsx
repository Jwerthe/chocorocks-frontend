// src/components/ui/Alert.tsx
interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  onClose,
}) => {
  const variantClasses = {
    info: "bg-blue-100 text-blue-800 border-blue-500",
    success: "bg-green-100 text-green-800 border-green-500",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-500",
    error: "bg-red-100 text-red-800 border-red-500",
  };

  return (
    <div className={`
      p-4 border-2 font-medium
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      ${variantClasses[variant]}
    `}>
      <div className="flex justify-between items-start">
        <div>{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-lg font-bold hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};