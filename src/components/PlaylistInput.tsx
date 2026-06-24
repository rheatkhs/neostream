import React, { useState, useEffect } from 'react';
import { Link, Download, RefreshCw, Trash2, HelpCircle, Film, Radio } from 'lucide-react';

interface PlaylistInputProps {
  onLoadPlaylist: (url: string) => void;
  onClearPlaylist: () => void;
  isLoading: boolean;
  hasPlaylist: boolean;
  currentUrl: string;
  useCorsProxy: boolean;
  setUseCorsProxy: (val: boolean) => void;
  corsProxyUrl: string;
  setCorsProxyUrl: (val: string) => void;
  onLoadEPG?: (url: string) => void;
  currentEpgUrl?: string;
  isEpgLoading?: boolean;
}

export const PlaylistInput: React.FC<PlaylistInputProps> = ({
  onLoadPlaylist,
  onClearPlaylist,
  isLoading,
  hasPlaylist,
  currentUrl,
  useCorsProxy,
  setUseCorsProxy,
  corsProxyUrl,
  setCorsProxyUrl,
  onLoadEPG,
  currentEpgUrl,
  isEpgLoading = false,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [epgInput, setEpgInput] = useState(currentEpgUrl || '');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync state if prop changes externally
  useEffect(() => {
    setEpgInput(currentEpgUrl || '');
  }, [currentEpgUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onLoadPlaylist(urlInput.trim());
      if (onLoadEPG && epgInput.trim()) {
        onLoadEPG(epgInput.trim());
      }
      setIsModalOpen(false);
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setEpgInput('');
    onClearPlaylist();
  };

  // Extract a clean file name from the playlist URL
  const getCleanPlaylistName = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
      return fileName || parsedUrl.hostname;
    } catch {
      return url.substring(url.lastIndexOf('/') + 1) || 'IPTV Stream';
    }
  };

  return (
    <>
      <div className="w-full glass-panel border-b border-white/5 px-6 py-3.5 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo / Branding Section */}
          <div className="flex items-center space-x-3.5 select-none">
            <div className="bg-red-600/10 border border-red-650/30 p-2 rounded-xl text-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.2)] animate-pulse">
              <Film className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent uppercase flex items-center gap-1.5">
                NEOSTREAM 
                <span className="text-[#E50914] text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-600/10 border border-red-605/20 tracking-wider">
                  IPTV
                </span>
              </h1>
            </div>
          </div>

          {/* Active Playlist metadata info */}
          {hasPlaylist && (
            <div className="hidden lg:flex items-center gap-3 bg-zinc-950/40 px-3.5 py-1.5 rounded-full border border-white/5 text-[11px] text-zinc-300 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-zinc-400 tracking-wide">Active:</span>
              <span className="truncate max-w-[200px] text-zinc-200 font-medium" title={currentUrl}>
                {getCleanPlaylistName(currentUrl)}
              </span>
              {currentEpgUrl && (
                <span className="text-zinc-500 border-l border-white/5 pl-3 flex items-center gap-1">
                  {isEpgLoading ? (
                    <RefreshCw className="h-3 w-3 text-red-500 animate-spin shrink-0" />
                  ) : (
                    <Radio className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  {isEpgLoading ? 'EPG Loading...' : 'EPG Active'}
                </span>
              )}
              {useCorsProxy && (
                <span className="ml-1 bg-red-950/30 border border-red-600/20 text-red-400 text-[9px] px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase select-none">
                  PROXY
                </span>
              )}
            </div>
          )}

          {/* Controls / Actions */}
          <div className="flex items-center gap-2.5">
            {hasPlaylist && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-zinc-900/60 hover:bg-zinc-800/80 hover:text-white border border-white/5 text-zinc-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <Link className="h-3.5 w-3.5 text-[#E50914]" />
                Change Playlist
              </button>
            )}

            {hasPlaylist && (
              <button
                type="button"
                onClick={handleClear}
                className="bg-zinc-900/40 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-zinc-450 hover:text-red-400 rounded-xl p-2 text-xs transition-all cursor-pointer"
                title="Clear current playlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <div className="relative group">
              <button 
                type="button"
                className="text-zinc-550 hover:text-zinc-350 transition-colors p-1"
                title="Help info"
              >
                <HelpCircle className="h-4.5 w-4.5" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-72 glass-panel-heavy text-zinc-450 text-xs p-4 rounded-2xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 leading-relaxed border border-white/5">
                <h4 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  CORS & Connection Info
                </h4>
                <p className="mb-2">
                  Some IPTV providers block browser playback using strict <span className="text-[#E50914] font-bold">CORS headers</span>.
                </p>
                <p>
                  Enable the **CORS Proxy server** inside Playlist Settings to stream restricted sources smoothly.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Dialog for Changing Playlist Link */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="glass-panel-heavy rounded-3xl max-w-lg w-full shadow-2xl p-6 relative overflow-hidden animate-slide-up border border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red header stripe */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E50914]" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black tracking-widest text-zinc-300 uppercase">Change Playlist Source</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-450 mb-5 leading-relaxed">
              Enter a new `.m3u` streaming playlist URL and optional EPG guide URL below. The current items will be cleared.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Playlist input field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-550 group-focus-within:text-red-500 transition-colors">
                  <Link className="h-4 w-4" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* EPG input field (optional) */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-550 group-focus-within:text-red-500 transition-colors">
                  <Radio className="h-4 w-4" />
                </div>
                <input
                  type="url"
                  placeholder="Custom EPG XML URL (Optional)"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all"
                  value={epgInput}
                  onChange={(e) => setEpgInput(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* CORS Proxy Toggle */}
              <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3.5 text-left">
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-bold text-zinc-300">Use CORS Proxy server</span>
                  <span className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">
                    Bypasses browser stream connection blockages using corsproxy.io.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={useCorsProxy}
                    onChange={(e) => setUseCorsProxy(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 peer-checked:after:bg-white after:border-transparent after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E50914]" />
                </label>
              </div>

              {useCorsProxy && (
                <div className="space-y-1.5 p-3.5 bg-black/60 border border-white/5 rounded-xl animate-fade-in text-left">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Custom Proxy Server URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://corsproxy.io/?"
                    className="w-full bg-zinc-950/60 border border-zinc-900/60 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-red-655/40 transition-all"
                    value={corsProxyUrl}
                    onChange={(e) => setCorsProxyUrl(e.target.value)}
                  />
                </div>
              )}

              {isLoading ? (
                <button
                  type="button"
                  disabled
                  className="w-full bg-red-600/40 border border-white/5 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-wait"
                >
                  <RefreshCw className="h-4 w-4 animate-spin text-red-300" />
                  Fetching Playlist Channels...
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="w-full bg-[#E50914] hover:bg-[#B80710] disabled:bg-zinc-850 disabled:text-zinc-550 disabled:border-transparent text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Fetch & Load
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};
