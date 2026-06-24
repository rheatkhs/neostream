import React, { useState } from 'react';
import { Link, Download, Play, RefreshCw, Trash2, HelpCircle } from 'lucide-react';

interface PlaylistInputProps {
  onLoadPlaylist: (url: string) => void;
  onLoadDemoPlaylist: () => void;
  onClearPlaylist: () => void;
  isLoading: boolean;
  hasPlaylist: boolean;
  currentUrl: string;
}

export const DEMO_PLAYLIST_NAME = "Built-in Demo Streams (CORS Friendly)";

export const PlaylistInput: React.FC<PlaylistInputProps> = ({
  onLoadPlaylist,
  onLoadDemoPlaylist,
  onClearPlaylist,
  isLoading,
  hasPlaylist,
  currentUrl,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onLoadPlaylist(urlInput.trim());
    }
  };

  const handleClear = () => {
    setUrlInput('');
    onClearPlaylist();
  };

  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 p-4 sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Title/Branding Section */}
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight">
              NEOSTREAM <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 ml-1 border border-emerald-500/20">IPTV</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Premium Web IPTV Player & Parser</p>
          </div>
        </div>

        {/* M3U Playlist Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl flex items-center gap-2">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
              <Link className="h-4.5 w-4.5" />
            </div>
            <input
              type="url"
              placeholder="Paste M3U Playlist URL (e.g. https://example.com/playlist.m3u)"
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-200"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {isLoading ? (
            <button
              type="button"
              disabled
              className="bg-emerald-600/50 border border-emerald-500/20 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 cursor-wait"
            >
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-300" />
              Loading
            </button>
          ) : (
            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-transparent text-black border border-emerald-400/20 rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Fetch
            </button>
          )}

          {hasPlaylist && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-zinc-800/80 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/30 text-zinc-400 hover:text-red-400 rounded-xl p-2.5 text-sm transition-all duration-200"
              title="Clear current playlist"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Demo Streams Presets */}
        <div className="flex items-center gap-2">
          {!hasPlaylist && !isLoading && (
            <button
              type="button"
              onClick={onLoadDemoPlaylist}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-xl px-4 py-2.5 text-xs font-medium flex items-center gap-2 transition-all duration-200"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
              Load Demo streams
            </button>
          )}
          
          <div className="relative group">
            <button 
              type="button"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-2"
              title="Help info"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-950/95 border border-zinc-800 text-zinc-300 text-xs p-3.5 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
              <h4 className="font-semibold text-white mb-1">CORS & Playlist Info</h4>
              <p className="mb-2 leading-relaxed">
                Many IPTV links fail to load in browser players due to <span className="text-amber-400 font-medium">CORS restrictions</span>.
              </p>
              <p className="leading-relaxed">
                Use streams that allow cross-origin requests, or click <span className="text-emerald-400 font-medium">Load Demo streams</span> to test using public, CORS-enabled HLS links immediately.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
