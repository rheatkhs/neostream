import React, { useState, useEffect } from 'react';
import { Tv2, AlertTriangle, X, Menu, Link, Download, RefreshCw, Radio } from 'lucide-react';
import { PlaylistInput } from './PlaylistInput';
import { Sidebar } from './Sidebar';
import { VideoPlayer } from './VideoPlayer';
import { dbGet, dbSet, dbClearAll } from '../utils/db';
import { runParserInWorker } from '../utils/parserWorker';
import type { IPTVChannel } from '../utils/m3uParser';
import type { EPGMap } from '../utils/epgParser';

export const IPTVPlayer: React.FC = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [corsError, setCorsError] = useState<{ url: string } | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // URL Inputs for the empty landing page
  const [landingUrlInput, setLandingUrlInput] = useState('');
  const [landingEpgInput, setLandingEpgInput] = useState('');

  // CORS Proxy States
  const [useCorsProxy, setUseCorsProxy] = useState<boolean>(() => {
    return localStorage.getItem('neostream_use_cors_proxy') === 'true';
  });
  const [corsProxyUrl, setCorsProxyUrl] = useState<string>(() => {
    return localStorage.getItem('neostream_cors_proxy_url') || 'https://corsproxy.io/?';
  });

  // EPG Program states
  const [epgUrl, setEpgUrl] = useState('');
  const [epgData, setEpgData] = useState<EPGMap>({});
  const [isEpgLoading, setIsEpgLoading] = useState(false);

  // Mini-Player layout state
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // Save proxy configurations to local storage on changes
  useEffect(() => {
    localStorage.setItem('neostream_use_cors_proxy', String(useCorsProxy));
  }, [useCorsProxy]);

  useEffect(() => {
    localStorage.setItem('neostream_cors_proxy_url', corsProxyUrl);
  }, [corsProxyUrl]);

  // Load last playlist URL or state on mount if saved
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedUrl = await dbGet<string>('neostream_last_url');
        const savedName = await dbGet<string>('neostream_playlist_name');
        const savedChannels = await dbGet<IPTVChannel[]>('neostream_channels');
        
        if (savedChannels && savedChannels.length > 0) {
          setChannels(savedChannels);
          setPlaylistUrl(savedUrl || '');
          setPlaylistName(savedName || 'Restored Playlist');
          
          const savedActiveId = await dbGet<string>('neostream_active_channel_id');
          if (savedActiveId) {
            const found = savedChannels.find((c: IPTVChannel) => c.id === savedActiveId);
            if (found) setActiveChannel(found);
          }
        }
        
        const savedEpgUrl = await dbGet<string>('neostream_epg_url');
        const savedEpgData = await dbGet<EPGMap>('neostream_epg_data');
        if (savedEpgData) {
          // Map raw date strings back to Date objects
          for (const key in savedEpgData) {
            savedEpgData[key] = savedEpgData[key].map((prog: any) => ({
              ...prog,
              start: new Date(prog.start),
              stop: new Date(prog.stop),
            }));
          }
          setEpgData(savedEpgData);
          setEpgUrl(savedEpgUrl || '');
        } else if (savedEpgUrl) {
          handleFetchEPG(savedEpgUrl);
        }
      } catch (err) {
        console.warn('Error loading cached database values', err);
      }
    };
    loadSavedData();
  }, []);

  // Fetch EPG XML timelines and load to memory
  const handleFetchEPG = async (url: string) => {
    if (!url) return;
    setIsEpgLoading(true);
    try {
      const finalUrl = useCorsProxy ? `${corsProxyUrl}${url}` : url;
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error('EPG fetch failed');
      const text = await response.text();
      
      // Offload EPG parsing to Web Worker!
      const result = await runParserInWorker('XMLTV', text);
      const parsed = result.epgData;
      
      setEpgData(parsed);
      setEpgUrl(url);
      await dbSet('neostream_epg_url', url);
      await dbSet('neostream_epg_data', parsed);
    } catch (e) {
      console.warn('Failed to load EPG feed', e);
    } finally {
      setIsEpgLoading(false);
    }
  };

  // Re-fetch EPG when proxy changes to stay synced
  useEffect(() => {
    const checkSavedEpg = async () => {
      const savedEpgUrl = await dbGet<string>('neostream_epg_url');
      if (savedEpgUrl) {
        handleFetchEPG(savedEpgUrl);
      }
    };
    checkSavedEpg();
  }, [useCorsProxy, corsProxyUrl]);

  const saveToDB = async (url: string, name: string, list: IPTVChannel[]) => {
    try {
      await dbSet('neostream_last_url', url);
      await dbSet('neostream_playlist_name', name);
      await dbSet('neostream_channels', list);
    } catch (e) {
      console.warn('Database write failed', e);
    }
  };

  const handleSelectChannel = async (channel: IPTVChannel) => {
    setActiveChannel(channel);
    await dbSet('neostream_active_channel_id', channel.id);
    setMobileDrawerOpen(false);
    setIsMiniPlayer(false);
  };

  const handleFetchPlaylist = async (url: string, forceProxyState?: boolean) => {
    setIsLoading(true);
    setCorsError(null);
    try {
      const activeProxy = forceProxyState !== undefined ? forceProxyState : useCorsProxy;
      const finalUrl = activeProxy ? `${corsProxyUrl}${url}` : url;
      
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      
      // Offload M3U parsing to background worker thread!
      const { channels: parsedChannels, tvgUrl: parsedEpgUrl } = await runParserInWorker('M3U', text);
      
      if (parsedChannels.length === 0) {
        alert("No streaming channels found. Check playlist format.");
      } else {
        setChannels(parsedChannels);
        setPlaylistUrl(url);
        const name = url.substring(url.lastIndexOf('/') + 1) || 'IPTV Playlist';
        setPlaylistName(name);
        await saveToDB(url, name, parsedChannels);
        setActiveChannel(null);

        if (parsedEpgUrl) {
          handleFetchEPG(parsedEpgUrl);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setCorsError({ url });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (landingUrlInput.trim()) {
      await handleFetchPlaylist(landingUrlInput.trim());
      if (landingEpgInput.trim()) {
        handleFetchEPG(landingEpgInput.trim());
      }
    }
  };

  const handleClearPlaylist = async () => {
    setChannels([]);
    setActiveChannel(null);
    setPlaylistUrl('');
    setPlaylistName('');
    setLandingUrlInput('');
    setLandingEpgInput('');
    setEpgUrl('');
    setEpgData({});
    setIsMiniPlayer(false);
    await dbClearAll();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#030303] text-zinc-100 overflow-hidden font-sans">
      
      {/* Top Header Bar (Only visible when playlist is loaded) */}
      {channels.length > 0 && (
        <PlaylistInput
          onLoadPlaylist={handleFetchPlaylist}
          onClearPlaylist={handleClearPlaylist}
          isLoading={isLoading}
          hasPlaylist={channels.length > 0}
          currentUrl={playlistUrl}
          useCorsProxy={useCorsProxy}
          setUseCorsProxy={setUseCorsProxy}
          corsProxyUrl={corsProxyUrl}
          setCorsProxyUrl={setCorsProxyUrl}
          onLoadEPG={handleFetchEPG}
          currentEpgUrl={epgUrl}
          isEpgLoading={isEpgLoading}
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
                epgData={epgData}
              />
            </div>

            {/* Video Viewport Pane */}
             {/* Video Viewport Pane */}
            <div className="flex-1 h-full flex flex-col p-4 bg-[#030303] relative">
              {/* Mobile Drawer Trigger Bar */}
              <div className="md:hidden flex items-center justify-between glass-panel border border-white/5 p-3 rounded-xl mb-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs text-zinc-300 font-bold truncate">
                    {activeChannel ? activeChannel.name : 'Select Channel'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Menu className="h-4 w-4" />
                  Channels
                </button>
              </div>

              {/* HLS Video Display */}
              <div className={
                isMiniPlayer
                  ? "fixed bottom-6 right-6 w-80 md:w-96 aspect-video z-50 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 pointer-events-auto"
                  : "flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black"
              }>
                <VideoPlayer 
                  channel={activeChannel} 
                  useCorsProxy={useCorsProxy}
                  corsProxyUrl={corsProxyUrl}
                  epgData={epgData}
                  isMiniPlayer={isMiniPlayer}
                  setIsMiniPlayer={setIsMiniPlayer}
                />
              </div>

              {isMiniPlayer && (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c]/20 rounded-2xl border border-white/5 p-6 text-center select-none animate-fade-in">
                  <div className="glass-panel border border-white/5 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E50914]" />
                    <Tv2 className="h-9 w-9 text-[#E50914] mb-3 mx-auto animate-pulse" />
                    <h3 className="text-white font-black text-sm uppercase tracking-wide">Mini-Player Active</h3>
                    <p className="text-zinc-450 text-[11px] mt-1.5 leading-relaxed font-semibold">
                      Stream is currently playing in a floating dock. You can browse other categories or channels.
                    </p>
                    <button
                      onClick={() => setIsMiniPlayer(false)}
                      className="w-full bg-[#E50914] hover:bg-[#B80710] text-white font-bold text-xs py-2.5 rounded-xl mt-5 cursor-pointer transition-all shadow-lg hover:scale-[1.01]"
                    >
                      Restore Main Viewport
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Channel Drawer sliding layer */}
            {mobileDrawerOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
                <div 
                  className="w-80 h-full glass-panel-heavy border-l border-white/5 shadow-2xl flex flex-col animate-slide-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-transparent sticky top-0">
                    <span className="text-xs font-black tracking-widest text-zinc-400 uppercase">IPTV Channels</span>
                    <button
                      onClick={() => setMobileDrawerOpen(false)}
                      className="text-zinc-450 hover:text-zinc-200 p-1.5 rounded-lg border border-white/5 bg-zinc-900/60"
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
                      epgData={epgData}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Professional Landing Screen (Integrated Glassmorphism Dashboard layout) */
          <div className="flex-1 flex flex-col justify-between w-full h-full bg-[#030303] relative px-6 py-12 md:py-20 select-none overflow-y-auto">
            
            {/* Subtle background abstract lighting */}
            <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[600px] h-[600px] bg-red-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] bg-red-600/[0.02] rounded-full blur-[100px] pointer-events-none" />
            
            {/* Top Navigation Row */}
            <div className="w-full max-w-4xl mx-auto flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-red-600/10 border border-red-650/20 p-2.5 rounded-xl text-red-500 shadow-[0_0_15px_rgba(229,9,20,0.15)]">
                  <Tv2 className="h-5 w-5 stroke-[1.8]" />
                </div>
                <span className="text-sm font-black tracking-widest text-zinc-200">
                  NEOSTREAM <span className="text-red-500 font-bold px-1.5 py-0.5 rounded-md bg-red-600/10 border border-red-605/20 text-[9px] tracking-wider uppercase ml-1">IPTV</span>
                </span>
              </div>
              <span className="text-[9px] uppercase font-bold font-mono tracking-widest text-zinc-500 border border-white/5 bg-zinc-900/40 px-3 py-1 rounded-lg">
                v1.0.0
              </span>
            </div>

            {/* Central Main Input Section */}
            <div className="w-full max-w-xl mx-auto flex flex-col items-center py-10 md:py-16 text-center z-10">
              <div className="w-full glass-panel border border-white/5 p-8 rounded-[24px] shadow-2xl space-y-6 relative overflow-hidden animate-slide-up">
                
                {/* Accent red indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E50914]" />

                <div className="space-y-2 text-center pb-2">
                  <h2 className="text-2xl font-black tracking-tight text-white bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent uppercase">
                    Connect Playlist
                  </h2>
                  <p className="text-zinc-450 text-xs max-w-xs mx-auto leading-relaxed">
                    Paste an M3U playlist link to start playing live television streams instantly.
                  </p>
                </div>

                {/* URL Input Form */}
                <form onSubmit={handleLandingSubmit} className="w-full space-y-4">
                  <div className="relative group text-left">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-550 group-focus-within:text-red-500 transition-colors">
                      <Link className="h-4 w-4" />
                    </div>
                    <input
                      type="url"
                      required
                      placeholder="Enter M3U Playlist URL"
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-3.5 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all duration-200"
                      value={landingUrlInput}
                      onChange={(e) => setLandingUrlInput(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {/* EPG Input field (Optional) */}
                  <div className="relative group text-left">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-550 group-focus-within:text-red-500 transition-colors">
                      <Radio className="h-4 w-4" />
                    </div>
                    <input
                      type="url"
                      placeholder="EPG XML TV URL (Optional)"
                      className="w-full glass-input rounded-xl pl-10 pr-4 py-3.5 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 transition-all duration-200"
                      value={landingEpgInput}
                      onChange={(e) => setLandingEpgInput(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {/* CORS Proxy toggle option */}
                  <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3.5 text-left transition-all">
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

                  {isLoading ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-red-600/40 border border-white/5 text-white rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 cursor-wait"
                    >
                      <RefreshCw className="h-4 w-4 animate-spin text-red-200" />
                      Parsing Playlist Channels...
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!landingUrlInput.trim()}
                      className="w-full bg-[#E50914] hover:bg-[#F40B17] text-white disabled:bg-zinc-850 disabled:text-zinc-550 disabled:border-transparent rounded-xl py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xl hover:scale-[1.01]"
                    >
                      <Download className="h-4 w-4" />
                      Connect & Stream
                    </button>
                  )}
                </form>

                {/* Minimal Help info label */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 pt-2 select-none">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-650 shrink-0" />
                  Supports standard HLS/M3U8 audio & video feeds
                </div>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-600 shrink-0 border-t border-white/5 pt-8 z-10 font-medium">
              <span>© {new Date().getFullYear()} Neostream Player. All rights reserved.</span>
              <div className="flex items-center space-x-4">
                <span>CORS compliant stream input required</span>
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
              className="absolute top-4 right-4 text-zinc-550 hover:text-zinc-350 p-1.5 rounded-lg border border-zinc-900 bg-zinc-900/30"
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
                To bypass this issue, you can load the stream through our integrated CORS proxy.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {!useCorsProxy && (
                <button
                  onClick={() => {
                    setUseCorsProxy(true);
                    setCorsError(null);
                    handleFetchPlaylist(corsError.url, true);
                  }}
                  className="w-full bg-[#E50914] hover:bg-[#B80710] text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Enable Proxy & Retry
                </button>
              )}
              <button
                onClick={() => setCorsError(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-semibold text-xs py-3 rounded-xl cursor-pointer transition-all"
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
