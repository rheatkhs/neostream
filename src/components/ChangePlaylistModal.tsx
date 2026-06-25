import React, { useState, useEffect, useRef } from 'react';
import { Link, Download, RefreshCw, Radio, UploadCloud } from 'lucide-react';
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
  onSubmit: (url: string, epgUrl?: string, file?: File) => void;
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
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState(currentUrl === 'local-file' ? '' : currentUrl);
  const [epgInput, setEpgInput] = useState(currentEpgUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEpgInput(currentEpgUrl || '');
  }, [currentEpgUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'url') {
      if (urlInput.trim()) {
        onSubmit(urlInput.trim(), epgInput.trim() || undefined);
      }
    } else {
      if (selectedFile) {
        onSubmit('local-file', epgInput.trim() || undefined, selectedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8') || file.name.endsWith('.txt')) {
        setSelectedFile(file);
      } else {
        alert('Please drop an M3U file (.m3u, .m3u8)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const isSubmitDisabled = activeTab === 'url' ? !urlInput.trim() : !selectedFile;

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
            className="text-zinc-400 hover:text-zinc-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-white/5 bg-zinc-900/60 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-950/60 p-1 rounded-2xl mb-5 border border-white/5 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'url' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Remote URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'file' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Local File
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'url' ? (
            <>
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
            </>
          ) : (
            /* Drag & Drop File Zone */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-input rounded-2xl py-7 px-4 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700/60 hover:border-red-500/40 transition-all cursor-pointer select-none text-center"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".m3u,.m3u8,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className={`h-8 w-8 mb-2 transition-colors ${selectedFile ? 'text-red-500' : 'text-zinc-500'}`} />
              <span className="text-xs font-bold text-zinc-300">
                {selectedFile ? selectedFile.name : 'Select or drag local M3U file'}
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 mt-1.5">
                {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports .m3u, .m3u8, .txt'}
              </span>
            </div>
          )}

          {/* EPG URL (Applicable to both tabs) */}
          <GlassInput
            icon={Radio}
            type="url"
            placeholder="Custom EPG XML URL (Optional)"
            value={epgInput}
            onChange={(e) => setEpgInput(e.target.value)}
            disabled={isLoading}
          />

          {isLoading ? (
            <button
              type="button"
              disabled
              className="w-full bg-red-600/40 border border-white/5 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-wait"
            >
              <RefreshCw className="h-4 w-4 animate-spin text-red-300" />
              Loading Playlist Channels...
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full bg-[#E50914] hover:bg-[#B80710] disabled:bg-zinc-850 disabled:text-zinc-550 disabled:border-transparent text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Download className="h-4 w-4" />
              Load Playlist
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
