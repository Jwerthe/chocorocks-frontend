// src/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className={`
      bg-white border-2 border-black p-6 
      shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
      ${className}
    `}>
      {(title || subtitle || actions) && (
        <div className="flex justify-between items-start mb-4">
          <div>
            {title && (
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};