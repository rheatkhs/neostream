import React, { useState } from 'react';
import { Link, Download, RefreshCw, Trash2, HelpCircle, Film } from 'lucide-react';

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
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onLoadPlaylist(urlInput.trim());
      setIsModalOpen(false);
    }
  };

  const handleClear = () => {
    setUrlInput('');
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
      <div className="w-full bg-[#000000] border-b border-zinc-900 px-6 py-4 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo / Branding Section */}
          <div className="flex items-center space-x-3 select-none">
            <div className="bg-red-650/10 border border-red-650/30 p-2.5 rounded-xl text-[#E50914] shadow-[0_0_15px_rgba(229,9,20,0.15)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-widest bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                NEOSTREAM <span className="text-[#E50914] text-xs font-semibold px-2 py-0.5 rounded-md bg-red-600/10 ml-1 border border-red-605/20">IPTV</span>
              </h1>
            </div>
          </div>

          {/* Active Playlist metadata info */}
          {hasPlaylist && (
            <div className="hidden lg:flex items-center gap-3.5 bg-zinc-900/60 px-4 py-2 rounded-full border border-zinc-850/80 text-xs text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-zinc-200">Active source:</span>
              <span className="truncate max-w-[200px] text-zinc-400" title={currentUrl}>
                {getCleanPlaylistName(currentUrl)}
              </span>
              {useCorsProxy && (
                <span className="ml-1 bg-red-950/45 border border-red-600/20 text-red-400 text-[10px] px-2 py-0.5 rounded-md font-semibold select-none">
                  PROXY ACTIVE
                </span>
              )}
            </div>
          )}

          {/* Controls / Actions */}
          <div className="flex items-center gap-3">
            {hasPlaylist && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Link className="h-3.5 w-3.5 text-[#E50914]" />
                Change Playlist
              </button>
            )}

            {hasPlaylist && (
              <button
                type="button"
                onClick={handleClear}
                className="bg-zinc-900 hover:bg-red-500/15 border border-zinc-800 hover:border-red-500/30 text-zinc-450 hover:text-red-400 rounded-xl p-2 text-xs transition-all cursor-pointer"
                title="Clear current playlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <div className="relative group">
              <button 
                type="button"
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Help info"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-950/95 border border-zinc-900 text-zinc-400 text-xs p-3.5 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                <h4 className="font-semibold text-white mb-1">CORS & Playlist Info</h4>
                <p className="mb-2 leading-relaxed">
                  Many IPTV links fail to load in browser players due to <span className="text-[#E50914] font-semibold">CORS restrictions</span>.
                </p>
                <p className="leading-relaxed">
                  Make sure to enable the integrated CORS Proxy (corsproxy.io) to bypass server security boundaries.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Dialog for Changing Playlist Link */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top warning line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E50914]" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-wider text-zinc-200 uppercase">Change Playlist Source</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-550 hover:text-zinc-350 text-xs font-semibold px-2 py-1 rounded border border-zinc-900 hover:bg-zinc-900"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Enter a new `.m3u` streaming playlist URL below. The current playlist will be cleared and the new channels parsed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-550 group-focus-within:text-red-500 transition-colors">
                  <Link className="h-4.5 w-4.5" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:border-red-600/40 focus:ring-1 focus:ring-red-600/20 transition-all"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* CORS Proxy Toggle */}
              <div className="flex items-center justify-between bg-zinc-900/35 border border-zinc-900 rounded-xl p-3.5 text-left">
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-bold text-zinc-350">Use CORS Proxy server</span>
                  <span className="text-[10px] text-zinc-550 leading-relaxed mt-0.5">
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
                  <div className="w-9 h-5 bg-zinc-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 peer-checked:after:bg-white after:border-transparent after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E50914]" />
                </label>
              </div>

              {useCorsProxy && (
                <div className="space-y-1.5 p-3.5 bg-zinc-900/25 border border-zinc-900 rounded-xl animate-fade-in text-left">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Custom Proxy Server URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://corsproxy.io/?"
                    className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-red-655/40 transition-all"
                    value={corsProxyUrl}
                    onChange={(e) => setCorsProxyUrl(e.target.value)}
                  />
                </div>
              )}

              {isLoading ? (
                <button
                  type="button"
                  disabled
                  className="w-full bg-red-600/40 border border-red-650/15 text-white rounded-xl py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-wait"
                >
                  <RefreshCw className="h-4 w-4 animate-spin text-red-300" />
                  Fetching Playlist Channels...
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="w-full bg-[#E50914] hover:bg-[#B80710] disabled:bg-zinc-800 disabled:text-zinc-650 disabled:border-transparent text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
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
