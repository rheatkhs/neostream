import React from 'react';

export const Footer: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-600 shrink-0 border-t border-white/5 pt-8 z-10 font-medium select-none">
    <span>© {new Date().getFullYear()} Neostream Player. All rights reserved.</span>
    <div className="flex items-center space-x-4">
      <span>CORS compliant stream input required</span>
    </div>
  </div>
);
