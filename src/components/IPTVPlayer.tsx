import React, { useState, useEffect } from 'react';
import { Tv2, AlertTriangle, X, Menu, Link, Download, RefreshCw } from 'lucide-react';
import { PlaylistInput } from './PlaylistInput';
import { Sidebar } from './Sidebar';
import { VideoPlayer } from './VideoPlayer';
import { parseM3U } from '../utils/m3uParser';
import type { IPTVChannel } from '../utils/m3uParser';

export const IPTVPlayer: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [corsError, setCorsError] = useState<{ url: string } | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // URL Input for the empty landing page
  const [landingUrlInput, setLandingUrlInput] = useState('');

  // Load last playlist URL or state on mount if saved
  useEffect(() => {
    const savedUrl = localStorage.getItem('neostream_last_url');
    const savedName = localStorage.getItem('neostream_playlist_name');
    const savedChannels = localStorage.getItem('neostream_channels');
    
    if (savedChannels) {
      try {
        const parsed = JSON.parse(savedChannels);
        if (parsed.length > 0) {
          setChannels(parsed);
          setPlaylistUrl(savedUrl || '');
          setPlaylistName(savedName || 'Restored Playlist');
          
          const savedActiveId = localStorage.getItem('neostream_active_channel_id');
          if (savedActiveId) {
            const found = parsed.find((c: IPTVChannel) => c.id === savedActiveId);
            if (found) setActiveChannel(found);
          }
        }
      } catch (e) {
        console.warn('Error loading cached playlist', e);
      }
    }
  }, []);

  const saveToLocalStorage = (url: string, name: string, list: IPTVChannel[]) => {
    try {
      localStorage.setItem('neostream_last_url', url);
      localStorage.setItem('neostream_playlist_name', name);
      localStorage.setItem('neostream_channels', JSON.stringify(list));
    } catch (e) {
      console.warn('Playlist too large for localStorage quota. Skipping caching.', e);
      localStorage.removeItem('neostream_channels');
    }
  };

  const handleSelectChannel = (channel: IPTVChannel) => {
    setActiveChannel(channel);
    localStorage.setItem('neostream_active_channel_id', channel.id);
    // Close mobile drawer on stream select
    setMobileDrawerOpen(false);
  };

  const handleFetchPlaylist = async (url: string) => {
    setIsLoading(true);
    setCorsError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      const parsed = parseM3U(text);
      
      if (parsed.length === 0) {
        alert("No streaming channels found. Check playlist format.");
      } else {
        setChannels(parsed);
        setPlaylistUrl(url);
        const name = url.substring(url.lastIndexOf('/') + 1) || 'IPTV Playlist';
        setPlaylistName(name);
        saveToLocalStorage(url, name, parsed);
        // Do not auto-play first channel; display clean welcome screen instead
        setActiveChannel(null);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      // Trigger CORS help state
      setCorsError({ url });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (landingUrlInput.trim()) {
      handleFetchPlaylist(landingUrlInput.trim());
    }
  };

  const handleClearPlaylist = () => {
    setChannels([]);
    setActiveChannel(null);
    setPlaylistUrl('');
    setPlaylistName('');
    setLandingUrlInput('');
    localStorage.removeItem('neostream_last_url');
    localStorage.removeItem('neostream_playlist_name');
    localStorage.removeItem('neostream_channels');
    localStorage.removeItem('neostream_active_channel_id');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Top Header Bar (Only visible when playlist is loaded) */}
      {channels.length > 0 && (
        <PlaylistInput
          onLoadPlaylist={handleFetchPlaylist}
          onClearPlaylist={handleClearPlaylist}
          isLoading={isLoading}
          hasPlaylist={channels.length > 0}
          currentUrl={playlistUrl}
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Playlists Loaded State */}
        {channels.length > 0 ? (
          <>
            {/* Desktop Sidebar Layout */}
            <div className="hidden md:block w-96 shrink-0 h-full">
              <Sidebar
                channels={channels}
                activeChannel={activeChannel}
                onSelectChannel={handleSelectChannel}
                playlistName={playlistName}
              />
            </div>

            {/* Video Viewport Pane */}
            <div className="flex-1 h-full flex flex-col p-4 bg-zinc-950 relative">
              {/* Mobile Drawer Trigger Bar */}
              <div className="md:hidden flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl mb-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                  <span className="text-xs text-zinc-300 font-semibold truncate">
                    {activeChannel ? activeChannel.name : 'Select Channel'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                  Channel List
                </button>
              </div>

              {/* HLS Video Display */}
              <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-900">
                <VideoPlayer channel={activeChannel} />
              </div>
            </div>

            {/* Mobile Channel Drawer sliding layer */}
            {mobileDrawerOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
                <div 
                  className="w-80 h-full bg-zinc-950 shadow-2xl flex flex-col animate-slide-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/80 sticky top-0">
                    <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">IPTV Channels</span>
                    <button
                      onClick={() => setMobileDrawerOpen(false)}
                      className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg border border-zinc-900 bg-zinc-900/40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Sidebar
                      channels={channels}
                      activeChannel={activeChannel}
                      onSelectChannel={handleSelectChannel}
                      playlistName={playlistName}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Professional Landing Screen (No Card, Full-Screen Integrated Dashboard layout) */
          <div className="flex-1 flex flex-col justify-between w-full h-full bg-[#0a0a0c] relative px-6 py-12 md:py-20 select-none overflow-y-auto">
            
            {/* Subtle background abstract lighting */}
            <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[500px] h-[500px] bg-red-600/[0.03] rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-red-600/[0.01] rounded-full blur-[80px] pointer-events-none" />
            
            {/* Top Navigation Row */}
            <div className="w-full max-w-4xl mx-auto flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="bg-red-600/10 border border-red-600/25 p-2 rounded-lg text-red-500">
                  <Tv2 className="h-5 w-5 stroke-[1.5]" />
                </div>
                <span className="text-sm font-bold tracking-wider text-zinc-200">
                  NEOSTREAM <span className="text-red-500 font-semibold">IPTV</span>
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 border border-zinc-900 px-2.5 py-1 rounded-md">
                v1.0.0
              </span>
            </div>

            {/* Central Main Input Section */}
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center py-10 md:py-16 text-center space-y-8 shrink-0">
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  Stream Live Television
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  Enter an HTTP or HTTPS `.m3u` streaming playlist link below to parse channels and start playing instantly.
                </p>
              </div>

              {/* URL Input Form integrated flat with the page */}
              <form onSubmit={handleLandingSubmit} className="w-full space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                    <Link className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/playlist.m3u"
                    className="w-full bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/60 rounded-2xl pl-12 pr-4.5 py-4 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-red-600/40 focus:ring-1 focus:ring-red-600/20 transition-all duration-200"
                    value={landingUrlInput}
                    onChange={(e) => setLandingUrlInput(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {isLoading ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-red-600/40 border border-red-600/10 text-white rounded-2xl py-4 text-sm font-semibold flex items-center justify-center gap-2.5 cursor-wait"
                  >
                    <RefreshCw className="h-4.5 w-4.5 animate-spin text-red-200" />
                    Fetching channels from playlist...
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!landingUrlInput.trim()}
                    className="w-full bg-[#E50914] hover:bg-[#F40B17] text-white disabled:bg-zinc-900/50 disabled:text-zinc-600 disabled:border-transparent rounded-2xl py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all duration-250 cursor-pointer shadow-xl"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Connect & Stream
                  </button>
                )}
              </form>

              {/* Minimal Help info label */}
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                Supports standard HLS/M3U8 audio & video feeds
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-600 shrink-0 border-t border-zinc-900/50 pt-8">
              <span>© {new Date().getFullYear()} Neostream Player. All rights reserved.</span>
              <div className="flex items-center space-x-4">
                <span className="hover:text-zinc-500 transition-colors">CORS compliant stream input required</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Resilient CORS Info Modal */}
      {corsError && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            
            <button
              onClick={() => setCorsError(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg border border-zinc-900 bg-zinc-900/30"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">CORS Security Block</h3>
                <p className="text-[10px] text-zinc-500">Cross-Origin Resource Sharing Error</p>
              </div>
            </div>

            <div className="text-xs text-zinc-400 space-y-3.5 leading-relaxed bg-zinc-900/20 p-4.5 rounded-2xl border border-zinc-900">
              <p>
                The browser could not load the playlist because the remote server lacks CORS headers (`Access-Control-Allow-Origin`).
              </p>
              <div className="text-[9px] text-zinc-500 font-mono truncate bg-black/50 border border-zinc-900 p-2 rounded-lg">
                Url: {corsError.url}
              </div>
              <p>
                To resolve this issue, use a CORS proxy or request that the playlist administrator enables cross-origin requests.
              </p>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setCorsError(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold text-xs py-3 rounded-xl cursor-pointer transition-all"
              >
                Go Back
              </button>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
};
