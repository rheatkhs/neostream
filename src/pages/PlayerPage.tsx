import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv2, Menu } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/Sidebar';
import { VideoPlayer } from '../components/VideoPlayer';
import { MobileDrawer } from '../components/MobileDrawer';
import { CorsErrorModal } from '../components/CorsErrorModal';
import { ChangePlaylistModal } from '../components/ChangePlaylistModal';
import { useProxy } from '../hooks/useProxy';
import { usePlaylist } from '../hooks/usePlaylist';
import { useEpg } from '../hooks/useEpg';

export const PlayerPage: React.FC = () => {
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

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Restore playlist from IndexedDB on mount — redirect to landing if empty
  useEffect(() => {
    const restore = async () => {
      const hasData = await playlist.restorePlaylist();
      await epg.restoreEpg();
      setIsRestored(true);
      if (!hasData) {
        navigate('/', { replace: true });
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChannel = async (channel: typeof playlist.activeChannel & {}) => {
    if (!channel) return;
    await playlist.selectChannel(channel);
    setMobileDrawerOpen(false);
    setIsMiniPlayer(false);
  };

  const handleClearPlaylist = async () => {
    await playlist.clearPlaylist();
    navigate('/', { replace: true });
  };

  const handleCorsRetry = () => {
    if (playlist.corsError) {
      proxy.setUseCorsProxy(true);
      playlist.setCorsError(null);
      playlist.fetchPlaylist(playlist.corsError.url, true);
    }
  };

  // Don't render until DB restore completes
  if (!isRestored) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-[#030303] text-zinc-100 overflow-hidden font-sans">

      {/* Navbar */}
      <Navbar
        currentUrl={playlist.playlistUrl}
        hasPlaylist={playlist.hasPlaylist}
        useCorsProxy={proxy.useCorsProxy}
        currentEpgUrl={epg.epgUrl}
        isEpgLoading={epg.isEpgLoading}
        onChangePlaylist={() => setIsChangeModalOpen(true)}
        onClearPlaylist={handleClearPlaylist}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-96 shrink-0 h-full">
          <Sidebar
            channels={playlist.channels}
            activeChannel={playlist.activeChannel}
            onSelectChannel={handleSelectChannel}
            playlistName={playlist.playlistName}
            epgData={epg.epgData}
          />
        </div>

        {/* Video Viewport */}
        <div className="flex-1 h-full flex flex-col p-4 bg-[#030303] relative">

          {/* Mobile Drawer Trigger */}
          <div className="md:hidden flex items-center justify-between glass-panel border border-white/5 p-3 rounded-xl mb-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs text-zinc-300 font-bold truncate">
                {playlist.activeChannel ? playlist.activeChannel.name : 'Select Channel'}
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
              channel={playlist.activeChannel}
              useCorsProxy={proxy.useCorsProxy}
              corsProxyUrl={proxy.corsProxyUrl}
              epgData={epg.epgData}
              isMiniPlayer={isMiniPlayer}
              setIsMiniPlayer={setIsMiniPlayer}
            />
          </div>

          {/* Mini-Player placeholder content */}
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

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          channels={playlist.channels}
          activeChannel={playlist.activeChannel}
          onSelectChannel={handleSelectChannel}
          playlistName={playlist.playlistName}
          epgData={epg.epgData}
        />
      </div>

      {/* Change Playlist Modal */}
      {isChangeModalOpen && (
        <ChangePlaylistModal
          currentUrl={playlist.playlistUrl}
          currentEpgUrl={epg.epgUrl}
          isLoading={playlist.isLoading}
          useCorsProxy={proxy.useCorsProxy}
          setUseCorsProxy={proxy.setUseCorsProxy}
          corsProxyUrl={proxy.corsProxyUrl}
          setCorsProxyUrl={proxy.setCorsProxyUrl}
          onSubmit={(url, epgUrl) => {
            playlist.fetchPlaylist(url);
            if (epgUrl) epg.fetchEpg(epgUrl);
            setIsChangeModalOpen(false);
          }}
          onClose={() => setIsChangeModalOpen(false)}
        />
      )}

      {/* CORS Error Modal */}
      {playlist.corsError && (
        <CorsErrorModal
          url={playlist.corsError.url}
          useCorsProxy={proxy.useCorsProxy}
          onEnableProxy={handleCorsRetry}
          onClose={() => playlist.setCorsError(null)}
        />
      )}
    </div>
  );
};
