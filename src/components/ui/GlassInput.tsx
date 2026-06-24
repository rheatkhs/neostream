import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface GlassInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon;
  /** Visual sizing variant */
  inputSize?: 'sm' | 'md' | 'lg';
}

export const GlassInput: React.FC<GlassInputProps> = ({
  icon: Icon,
  inputSize = 'md',
  className = '',
  ...props
}) => {
  const sizeMap = {
    sm: { input: 'py-2.5 text-xs pl-10 pr-4', icon: 'h-4 w-4 pl-3.5' },
    md: { input: 'py-3 text-xs pl-10 pr-4', icon: 'h-4 w-4 pl-3.5' },
    lg: { input: 'py-4 text-sm pl-12 pr-4', icon: 'h-4.5 w-4.5 pl-4' },
  };
  const sizes = sizeMap[inputSize];

  return (
    <div className="relative group text-left">
      {Icon && (
        <div className={`absolute inset-y-0 left-0 ${sizes.icon} flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors`}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input
        className={`w-full glass-input rounded-xl ${sizes.input} text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all duration-200 font-bold ${className}`}
        {...props}
      />
    </div>
  );
};
