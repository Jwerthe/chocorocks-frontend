// src/components/ui/Select.tsx
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string; key?: string | number }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  const selectClasses = `
    w-full px-4 py-3 text-black font-medium border-2 border-black 
    bg-white focus:outline-none focus:ring-0 focus:border-[#7ca1eb]
    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(124,161,235,1)]
    focus:translate-x-[2px] focus:translate-y-[2px] transition-all duration-200
    ${error ? 'border-red-500' : ''}
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <select className={`${selectClasses} ${className}`} {...props}>
        {options.map((option) => (
          <option key={option.key ||  option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};