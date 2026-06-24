import React from 'react';

interface CorsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visual size variant */
  size?: 'sm' | 'md';
}

export const CorsToggle: React.FC<CorsToggleProps> = ({
  checked,
  onChange,
  size = 'sm',
}) => {
  const padding = size === 'md' ? 'p-4.5' : 'p-3.5';
  const titleSize = size === 'md' ? 'text-xs md:text-sm' : 'text-xs';
  const descSize = size === 'md' ? 'text-[10px] md:text-xs' : 'text-[10px]';
  const rounded = size === 'md' ? 'rounded-2xl' : 'rounded-xl';

  return (
    <div className={`flex items-center justify-between bg-black/40 border border-white/5 ${rounded} ${padding} text-left transition-all`}>
      <div className="flex flex-col pr-4">
        <span className={`${titleSize} font-bold text-zinc-350`}>Use CORS Proxy server</span>
        <span className={`${descSize} text-zinc-500 leading-relaxed mt-0.5 font-semibold`}>
          Bypasses browser stream connection blockages using corsproxy.io.
        </span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 peer-checked:after:bg-white after:border-transparent after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#E50914]" />
      </label>
    </div>
  );
};
