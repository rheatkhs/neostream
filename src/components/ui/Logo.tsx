import React from 'react';
import { Film } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md';
}

export const Logo: React.FC<LogoProps> = ({ size = 'sm' }) => {
  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4.5 w-4.5';
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';
  const badgeSize = size === 'md' ? 'text-[9px]' : 'text-[8px]';
  const padding = size === 'md' ? 'p-3' : 'p-2.5';

  return (
    <div className="flex items-center space-x-3 select-none">
      <div className={`bg-red-955/20 border border-red-500/30 ${padding} rounded-xl text-red-500 shadow-[0_0_15px_rgba(229,9,20,0.15)] animate-pulse`}>
        <Film className={`${iconSize} stroke-[1.8]`} />
      </div>
      <span className={`${textSize} font-black tracking-widest text-zinc-200 uppercase hidden sm:flex items-center gap-1.5 font-sans`}>
        NEOSTREAM
        <span className={`text-red-500 ${badgeSize} font-black px-1.5 py-0.5 rounded bg-red-955/20 border border-red-500/20 tracking-wider`}>
          IPTV
        </span>
      </span>
    </div>
  );
};
