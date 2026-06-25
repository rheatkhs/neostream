import React, { useState } from 'react';
import { Link, Trash2, HelpCircle, RefreshCw, Radio } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Badge } from '../ui/Badge';

interface NavbarProps {
  currentUrl: string;
  hasPlaylist: boolean;
  useCorsProxy: boolean;
  currentEpgUrl: string;
  isEpgLoading: boolean;
  onChangePlaylist: () => void;
  onClearPlaylist: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUrl,
  hasPlaylist,
  useCorsProxy,
  currentEpgUrl,
  isEpgLoading,
  onChangePlaylist,
  onClearPlaylist,
}) => {
  const [showHelp, setShowHelp] = useState(false);



  return (
    <div className="w-full bg-[#030303]/75 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 sticky top-0 z-40 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

        {/* Logo */}
        <Logo size="sm" />

        {/* Active Playlist metadata */}
        {hasPlaylist && (
          <div className="hidden lg:flex items-center gap-3.5 bg-zinc-950/45 px-3.5 py-1.5 rounded-xl border border-white/5 text-[10px] backdrop-blur-md font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
            {/* Active Feed URL */}
            <div className="flex items-center gap-2 max-w-[280px] xl:max-w-[450px]">
              <div className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </div>
              <span className="text-zinc-500 tracking-wider text-[9px] uppercase font-black shrink-0">FEED</span>
              <span className="font-mono text-zinc-300 truncate hover:text-zinc-150 transition-colors" title={currentUrl}>
                {currentUrl}
              </span>
            </div>

            {/* EPG Feed URL */}
            {currentEpgUrl && (
              <div className="flex items-center gap-2 border-l border-white/5 pl-3.5 max-w-[200px] xl:max-w-[300px]">
                {isEpgLoading ? (
                  <RefreshCw className="h-3 w-3 text-red-500 animate-spin shrink-0" />
                ) : (
                  <Radio className="h-3 w-3 text-emerald-500 shrink-0" />
                )}
                <span className="text-zinc-550 tracking-wider text-[9px] uppercase font-black shrink-0">EPG</span>
                <span className="font-mono text-zinc-400 truncate" title={currentEpgUrl}>
                  {currentEpgUrl}
                </span>
              </div>
            )}

            {/* Proxy Info */}
            {useCorsProxy && (
              <div className="border-l border-white/5 pl-3.5 shrink-0">
                <Badge variant="danger">PROXY ACTIVE</Badge>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          {hasPlaylist && (
            <button
              type="button"
              onClick={onChangePlaylist}
              className="bg-zinc-900/60 hover:bg-zinc-800/80 hover:text-white border border-white/5 text-zinc-300 rounded-xl px-2.5 sm:px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <Link className="h-3.5 w-3.5 text-red-500" />
              <span className="hidden sm:inline">Change Playlist</span>
              <span className="inline sm:hidden">Change</span>
            </button>
          )}

          {hasPlaylist && (
            <button
              type="button"
              onClick={onClearPlaylist}
              className="bg-zinc-900/60 hover:bg-red-955/20 border border-white/5 hover:border-red-500/20 text-zinc-450 hover:text-red-500 rounded-xl p-2 text-xs transition-all cursor-pointer"
              title="Clear current playlist"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <div className="relative"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
          >
            <button
              type="button"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              title="Help info"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
            {showHelp && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/10 text-zinc-400 text-xs p-4.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 leading-relaxed font-semibold pointer-events-none">
                <h4 className="font-extrabold text-white mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  CORS & Connection Info
                </h4>
                <p className="mb-2">
                  Some IPTV providers block browser playback using strict <span className="text-red-400 font-bold">CORS headers</span>.
                </p>
                <p>
                  Enable the <strong>CORS Proxy server</strong> inside Playlist Settings to stream restricted sources smoothly.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
