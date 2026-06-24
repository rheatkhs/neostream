import React, { useState, useEffect, useRef } from 'react';
import { Tv2, Radio, AlertTriangle, FileUp, X, Menu } from 'lucide-react';
import { PlaylistInput, DEMO_PLAYLIST_NAME } from './PlaylistInput';
import { Sidebar } from './Sidebar';
import { VideoPlayer } from './VideoPlayer';
import { parseM3U } from '../utils/m3uParser';
import type { IPTVChannel } from '../utils/m3uParser';

// Predefined CORS-friendly demo streams for instant testing
const DEMO_PLAYLIST_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/snapshots/logos/nasa.png" group-title="Science",NASA TV
https://ntv1.akamaized.net/hls/live/2014027/NASA-NTV1-Public/master.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/snapshots/logos/france24.png" group-title="News",France 24 English
https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/snapshots/logos/dw.png" group-title="News",DW English Live
https://dwamdstream102.akamaized.net/hls/live/2013187/dwstream102/index.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/snapshots/logos/redbull.png" group-title="Sports",Red Bull TV
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/iptv-org/iptv/master/snapshots/logos/deluxe-music.png" group-title="Music",Deluxe Music Germany
https://deluxemusic.ebound.tv/live/deluxemusic/playlist.m3u8
`;

export const IPTVPlayer: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [corsError, setCorsError] = useState<{ url: string } | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load last playlist URL or demo on mount if saved
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
    localStorage.setItem('neostream_last_url', url);
    localStorage.setItem('neostream_playlist_name', name);
    localStorage.setItem('neostream_channels', JSON.stringify(list));
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
      // Direct client side fetch
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
        // Default to first channel
        setActiveChannel(parsed[0]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      // Trigger CORS help state
      setCorsError({ url });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemoPlaylist = () => {
    setIsLoading(true);
    setCorsError(null);
    setTimeout(() => {
      const parsed = parseM3U(DEMO_PLAYLIST_M3U);
      setChannels(parsed);
      setPlaylistUrl('');
      setPlaylistName(DEMO_PLAYLIST_NAME);
      saveToLocalStorage('', DEMO_PLAYLIST_NAME, parsed);
      setActiveChannel(parsed[0]);
      setIsLoading(false);
    }, 400);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setCorsError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseM3U(text);
      if (parsed.length === 0) {
        alert("No streaming channels found inside this file.");
      } else {
        setChannels(parsed);
        setPlaylistUrl('');
        setPlaylistName(file.name);
        saveToLocalStorage('', file.name, parsed);
        setActiveChannel(parsed[0]);
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      alert("Error reading file");
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleClearPlaylist = () => {
    setChannels([]);
    setActiveChannel(null);
    setPlaylistUrl('');
    setPlaylistName('');
    localStorage.removeItem('neostream_last_url');
    localStorage.removeItem('neostream_playlist_name');
    localStorage.removeItem('neostream_channels');
    localStorage.removeItem('neostream_active_channel_id');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <PlaylistInput
        onLoadPlaylist={handleFetchPlaylist}
        onLoadDemoPlaylist={handleLoadDemoPlaylist}
        onClearPlaylist={handleClearPlaylist}
        isLoading={isLoading}
        hasPlaylist={channels.length > 0}
        currentUrl={playlistUrl}
      />

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
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
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
          /* Empty Dashboard State (No Playlists loaded) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto space-y-6">
            
            {/* Visual Glassmorphic Branding Icon Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-2xl group-hover:bg-emerald-500/15 transition-all duration-300" />
              <div className="relative bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl shadow-xl flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 group-hover:border-zinc-700/60 transition-all duration-300">
                <Tv2 className="h-16 w-16 stroke-[1.2] animate-pulse" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Stream Your IPTV Playlists</h2>
              <p className="text-zinc-400 text-xs mt-2 max-w-md leading-relaxed">
                Connect external playlists via M3U URLs, import local `.m3u` files directly, or test immediately using our pre-packaged public channels.
              </p>
            </div>

            {/* Quick action grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
              {/* Local file import card */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 p-4.5 rounded-2xl flex flex-col items-center text-center transition-all duration-200 group cursor-pointer"
              >
                <FileUp className="h-5 w-5 text-emerald-400 mb-2 group-hover:scale-108 transition-transform" />
                <span className="text-xs font-bold text-zinc-200">Load M3U Local File</span>
                <span className="text-[10px] text-zinc-500 mt-1">Reads directly in browser (Bypasses CORS)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,text/plain"
                onChange={handleLocalFileSelect}
                className="hidden"
              />

              {/* Demo quick start card */}
              <button
                onClick={handleLoadDemoPlaylist}
                className="bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 p-4.5 rounded-2xl flex flex-col items-center text-center transition-all duration-200 group cursor-pointer"
              >
                <Radio className="h-5 w-5 text-emerald-400 mb-2 group-hover:scale-108 transition-transform" />
                <span className="text-xs font-bold text-zinc-200">Load Demo Streams</span>
                <span className="text-[10px] text-zinc-500 mt-1">Test using high-quality CORS-ready streams</span>
              </button>
            </div>
            
          </div>
        )}

      </div>

      {/* Resilient CORS Info Modal */}
      {corsError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-slide-up">
            
            {/* Red Alert warning bar decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            
            <button
              onClick={() => setCorsError(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg border border-zinc-850 hover:border-zinc-800 bg-zinc-950/20"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">CORS Block Blocked Connection</h3>
                <p className="text-[10px] text-zinc-500">Resource Sharing Restriction</p>
              </div>
            </div>

            <div className="text-xs text-zinc-300 space-y-3.5 leading-relaxed bg-zinc-950/50 p-4 rounded-2xl border border-zinc-850">
              <p>
                Browsers prevent fetching files from external domains that lack open CORS permissions headers.
              </p>
              <div className="text-[10px] text-zinc-500 font-mono truncate bg-zinc-950 border border-zinc-900 p-2.5 rounded-lg">
                Blocked: {corsError.url}
              </div>
              <p className="text-zinc-400">
                To play this playlist, you can download the <span className="font-semibold text-zinc-300">.m3u</span> file to your disk and load it via the local file loader button.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  setCorsError(null);
                  fileInputRef.current?.click();
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <FileUp className="h-4 w-4" />
                Upload Local File
              </button>
              
              <button
                onClick={() => {
                  setCorsError(null);
                  handleLoadDemoPlaylist();
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-750 font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
              >
                Load Demo List
              </button>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
};
