import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-white/5 border-white/10 text-zinc-300',
    danger: 'bg-red-955/25 border-red-500/20 text-red-400',
    success: 'bg-emerald-950/25 border-emerald-500/20 text-emerald-400',
  };

  return (
    <span
      className={`text-[8px] font-extrabold tracking-widest uppercase select-none px-2 py-0.5 rounded border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
