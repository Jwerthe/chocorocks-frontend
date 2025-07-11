// src/components/layout/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  message = 'Cargando...',
  fullScreen = true 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const containerClasses = fullScreen 
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Neobrutalism spinner */}
        <div className="relative mx-auto mb-4">
          <div className={`
            ${sizeClasses[size]} 
            border-4 border-black bg-white 
            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          `}>
            <div className={`
              ${sizeClasses[size]} 
              border-4 border-[#7ca1eb] border-t-transparent 
              rounded-full animate-spin
            `} />
          </div>
        </div>
        
        {/* Loading message */}
        <div className="bg-white border-2 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block">
          <p className="text-gray-700 font-medium text-sm sm:text-base">{message}</p>
        </div>
        
        {/* Animated dots */}
        <div className="mt-4 flex justify-center space-x-1">
          <div className="w-2 h-2 bg-[#7ca1eb] border border-black animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-[#7ca1eb] border border-black animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-[#7ca1eb] border border-black animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};