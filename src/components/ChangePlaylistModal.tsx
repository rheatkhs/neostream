import React, { useState, useEffect } from 'react';
import { Link, Download, RefreshCw, Radio } from 'lucide-react';
import { GlassInput } from './ui/GlassInput';
import { CorsToggle } from './ui/CorsToggle';

interface ChangePlaylistModalProps {
  currentUrl: string;
  currentEpgUrl: string;
  isLoading: boolean;
  useCorsProxy: boolean;
  setUseCorsProxy: (val: boolean) => void;
  corsProxyUrl: string;
  setCorsProxyUrl: (val: string) => void;
  onSubmit: (url: string, epgUrl?: string) => void;
  onClose: () => void;
}

export const ChangePlaylistModal: React.FC<ChangePlaylistModalProps> = ({
  currentUrl,
  currentEpgUrl,
  isLoading,
  useCorsProxy,
  setUseCorsProxy,
  corsProxyUrl,
  setCorsProxyUrl,
  onSubmit,
  onClose,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [epgInput, setEpgInput] = useState(currentEpgUrl || '');

  useEffect(() => {
    setEpgInput(currentEpgUrl || '');
  }, [currentEpgUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onSubmit(urlInput.trim(), epgInput.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className="glass-panel-heavy rounded-3xl max-w-lg w-full shadow-2xl p-4.5 sm:p-6 relative overflow-hidden animate-slide-up border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red header stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E50914]" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black tracking-widest text-zinc-300 uppercase">Change Playlist Source</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-zinc-450 mb-5 leading-relaxed">
          Enter a new <code>.m3u</code> streaming playlist URL and optional EPG guide URL below. The current items will be cleared.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Playlist URL */}
          <GlassInput
            icon={Link}
            type="url"
            required
            placeholder="https://example.com/playlist.m3u"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isLoading}
          />

          {/* EPG URL */}
          <GlassInput
            icon={Radio}
            type="url"
            placeholder="Custom EPG XML URL (Optional)"
            value={epgInput}
            onChange={(e) => setEpgInput(e.target.value)}
            disabled={isLoading}
          />

          {/* CORS Toggle */}
          <CorsToggle checked={useCorsProxy} onChange={setUseCorsProxy} />

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
  );
};
