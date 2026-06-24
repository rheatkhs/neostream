import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RefreshCw, AlertCircle, Tv, Radio } from 'lucide-react';
import type { IPTVChannel } from '../utils/m3uParser';

interface VideoPlayerProps {
  channel: IPTVChannel | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player state controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<number | null>(null);

  // Initialize and load stream
  const loadStream = (url: string) => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    // Clean up old HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 4,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay blocked: set state but don't crash
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          console.warn('Fatal HLS error:', data);
          setErrorMsg('Failed to load stream (CORS or format issues)');
          hls.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari support
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });

      video.addEventListener('error', () => {
        setIsLoading(false);
        setErrorMsg('Format not supported by browser native player');
      });
    } else {
      setIsLoading(false);
      setErrorMsg('HLS streaming is not supported in this browser.');
    }
  };

  // Trigger stream loading on channel change
  useEffect(() => {
    if (channel?.url) {
      loadStream(channel.url);
    } else {
      // Clear player when active channel is cleared
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setErrorMsg(null);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [channel]);

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Listen to keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs
      if (document.activeElement?.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isFullscreen]);

  // Activity timeout logic for hiding player controls bar
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !channel) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const playerContainer = videoRef.current?.parentElement;
    if (!playerContainer) return;

    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error('Error enabling fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
    resetControlsTimeout();
  };

  // Sync fullscreen change states (e.g. Esc key press)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      className="w-full h-full bg-[#000000] flex flex-col items-center justify-center relative select-none overflow-hidden"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      {/* HTML5 Native Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-auto"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
      />

      {/* Connection & Buffering HUD */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-20 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-850 rounded-full" />
            <div className="absolute w-12 h-12 border-4 border-t-[#E50914] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Streaming Error Overlay (Premium Card Design) */}
      {errorMsg && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E50914]" />
            <AlertCircle className="h-10 w-10 text-[#E50914] mb-3 animate-pulse" />
            <h3 className="text-white font-bold text-sm">Playback Blocked / Offline</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed max-w-xs">
              This channel's stream is offline or cannot be loaded due to browser cross-origin (CORS) security rules.
            </p>
            <div className="flex flex-col gap-2.5 w-full mt-5">
              <button
                onClick={() => channel && loadStream(channel.url)}
                className="w-full bg-[#E50914] hover:bg-[#B80710] text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(229,9,20,0.25)] flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Playback
              </button>
              <div className="text-[10px] text-zinc-500 font-medium">
                Try selecting a different channel from the sidebar list.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Overlay (top left) */}
      {channel && showControls && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10 animate-fade-in">
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-850 p-3 rounded-xl flex items-center gap-3 max-w-[80%] shadow-lg">
            <div className="w-8 h-8 bg-zinc-950 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0">
              {channel.logo ? (
                <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} />
              ) : (
                <Tv className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-zinc-100 truncate">{channel.name}</h2>
              <p className="text-[10px] text-red-500 font-medium truncate mt-0.5">{channel.group || 'Live Stream'}</p>
            </div>
          </div>

          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-850 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-zinc-400 shadow-lg">
            LIVE
          </div>
        </div>
      )}

      {/* Media Controller Bar (overlay bottom) */}
      {channel && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Controls Bar Row */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Play/Pause */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="bg-[#E50914] hover:bg-[#B80710] text-white p-2.5 rounded-xl transition-all cursor-pointer hover:scale-105"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </button>

              <button
                onClick={() => loadStream(channel.url)}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 p-2.5 rounded-xl transition-all cursor-pointer"
                title="Reload Stream"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Volume slider & mute control */}
            <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-850 px-3 py-1.5 rounded-xl">
              <button
                onClick={toggleMute}
                className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-red-600 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Screen layout buttons */}
            <div>
              <button
                onClick={toggleFullscreen}
                className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 p-2.5 rounded-xl transition-all cursor-pointer"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Welcome Screen Placeholder */}
      {!channel && (
        <div className="text-center p-8 flex flex-col items-center justify-center max-w-md animate-fade-in relative z-10">
          <div className="w-20 h-20 bg-red-650/10 rounded-3xl flex items-center justify-center border border-red-650/20 mb-6 shadow-[0_0_50px_rgba(229,9,20,0.15)] animate-pulse">
            <Radio className="w-10 h-10 text-[#E50914]" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-wider">NEOSTREAM IPTV</h2>
          <p className="text-zinc-550 text-xs mt-2.5 leading-relaxed">
            Playlist loaded successfully! Select any channel from the left sidebar channel list to begin streaming.
          </p>
          
          {/* Quick HUD guide */}
          <div className="mt-8 grid grid-cols-3 gap-3 w-full border-t border-zinc-900/80 pt-6">
            <div className="flex flex-col items-center">
              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 border border-zinc-850">SPACE</span>
              <span className="text-[10px] text-zinc-500 mt-1.5">Play/Pause</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 border border-zinc-850">F KEY</span>
              <span className="text-[10px] text-zinc-500 mt-1.5">Fullscreen</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 border border-zinc-850">M KEY</span>
              <span className="text-[10px] text-zinc-500 mt-1.5">Mute Audio</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
