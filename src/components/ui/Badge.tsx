// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  }) => {
  const baseClasses = "inline-flex items-center font-bold border-2 border-black";
  
  const variantClasses = {
    primary: "bg-[#7ca1eb] text-white",
    secondary: "bg-gray-200 text-gray-800",
    success: "bg-green-500 text-white",
    warning: "bg-yellow-500 text-black",
    danger: "bg-red-500 text-white",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ''} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
      {children}
    </span>
  );
};