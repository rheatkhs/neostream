import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, Download, RefreshCw, Radio, UploadCloud } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { CorsToggle } from '../components/ui/CorsToggle';
import { Footer } from '../components/layout/Footer';
import { useProxy } from '../hooks/useProxy';
import { usePlaylist } from '../hooks/usePlaylist';
import { useEpg } from '../hooks/useEpg';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const proxy = useProxy();
  const epg = useEpg({
    applyProxy: proxy.applyProxy,
    proxyDeps: [proxy.useCorsProxy, proxy.corsProxyUrl],
  });
  const playlist = usePlaylist({
    applyProxy: proxy.applyProxy,
    onEpgDiscovered: epg.fetchEpg,
  });

  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [epgInput, setEpgInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'url') {
      if (urlInput.trim()) {
        await playlist.fetchPlaylist(urlInput.trim());
        if (epgInput.trim()) {
          epg.fetchEpg(epgInput.trim());
        }
        setTimeout(() => navigate('/player'), 100);
      }
    } else {
      if (selectedFile) {
        await playlist.loadLocalPlaylist(selectedFile);
        if (epgInput.trim()) {
          epg.fetchEpg(epgInput.trim());
        }
        setTimeout(() => navigate('/player'), 100);
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
    <div className="flex-1 flex flex-col justify-between w-full h-full bg-[#030303] relative px-4 sm:px-6 py-6 sm:py-12 md:py-20 select-none overflow-y-auto font-sans">

      {/* Background abstract lighting */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[600px] h-[600px] bg-red-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] bg-red-600/[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navigation Row */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between shrink-0 z-10">
        <Logo size="sm" />
        <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest text-zinc-400 border border-white/5 bg-zinc-900/60 px-3 py-1.5 rounded-xl">
          v1.0.0
        </span>
      </div>

      {/* Central Main Input Section */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center py-6 sm:py-12 md:py-20 text-center z-10">
        <div className="w-full space-y-5 sm:space-y-8 animate-slide-up">

          <div className="space-y-3 text-center pb-2 select-none">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Connect Playlist
            </h2>
            <p className="text-zinc-500 text-xs md:text-sm max-w-lg mx-auto leading-relaxed font-semibold">
              Enter an M3U playlist link or upload a local playlist file to start streaming.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-zinc-900/60 p-1 rounded-2xl max-w-xs mx-auto border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activeTab === 'url' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Remote URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                activeTab === 'file' ? 'bg-[#E50914] text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Local File
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-5">
            {activeTab === 'url' ? (
              <>
                <div className="relative group text-left">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                    <Link className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="Enter M3U Playlist URL"
                    className="w-full glass-input rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all duration-200 font-bold"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={playlist.isLoading}
                  />
                </div>

                {/* CORS Proxy Toggle */}
                <CorsToggle
                  checked={proxy.useCorsProxy}
                  onChange={proxy.setUseCorsProxy}
                  size="md"
                />
              </>
            ) : (
              /* Drag & Drop File Zone */
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full glass-input rounded-2xl py-12 px-6 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700/60 hover:border-red-550 transition-all cursor-pointer select-none text-center"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".m3u,.m3u8,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <UploadCloud className={`h-12 w-12 mb-3 transition-colors ${selectedFile ? 'text-red-500' : 'text-zinc-500'}`} />
                <span className="text-sm font-bold text-zinc-300">
                  {selectedFile ? selectedFile.name : 'Select or drag local M3U file'}
                </span>
                <span className="text-[11px] font-semibold text-zinc-500 mt-2">
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports .m3u, .m3u8, .txt (Max 50MB)'}
                </span>
              </div>
            )}

            {/* EPG Input field */}
            <div className="relative group text-left">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                <Radio className="h-4.5 w-4.5" />
              </div>
              <input
                type="url"
                placeholder="EPG XML TV URL (Optional)"
                className="w-full glass-input rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all duration-200 font-bold"
                value={epgInput}
                onChange={(e) => setEpgInput(e.target.value)}
                disabled={playlist.isLoading}
              />
            </div>

            {playlist.isLoading ? (
              <button
                type="button"
                disabled
                className="w-full bg-red-600/40 border border-white/5 text-white rounded-2xl py-4 text-xs md:text-sm font-bold flex items-center justify-center gap-2 cursor-wait"
              >
                <RefreshCw className="h-4.5 w-4.5 animate-spin text-red-200" />
                Parsing Playlist Channels...
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-[#E50914] hover:bg-[#F40B17] text-white disabled:bg-zinc-850 disabled:text-zinc-550 disabled:border-transparent rounded-2xl py-4 text-xs md:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xl hover:scale-[1.01]"
              >
                <Download className="h-4.5 w-4.5" />
                Connect & Stream
              </button>
            )}
          </form>

          {/* Help info label */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] md:text-xs text-zinc-500 pt-2 select-none font-bold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-650 shrink-0 animate-pulse" />
            Supports standard HLS/M3U8 audio & video feeds
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};
