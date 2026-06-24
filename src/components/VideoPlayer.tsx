import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Tv, RefreshCw, AlertCircle } from 'lucide-react';
import type { IPTVChannel } from '../utils/m3uParser';

interface VideoPlayerProps {
  channel: IPTVChannel | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Clean up HLS on unmount
  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, []);

  // Update source whenever the channel changes
  useEffect(() => {
    if (!channel) {
      destroyHls();
      return;
    }

    loadStream(channel.url);

    return () => {
      destroyHls();
    };
  }, [channel]);

  // Handle controls hover fading
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setErrorMsg(null);
  };

  const loadStream = (url: string) => {
    destroyHls();
    
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setErrorMsg(null);

    // Apply local volume and mute states
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;

    // Check for native HLS (e.g. Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      
      const onPlay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };
      
      const onWaiting = () => {
        setIsLoading(true);
      };

      const onError = () => {
        setErrorMsg('Failed to load stream (CORS or format issues)');
        setIsLoading(false);
      };

      video.addEventListener('playing', onPlay);
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('error', onError);

      video.play().catch((err) => {
        console.warn('Auto-play blocked or failed:', err);
        setIsPlaying(false);
        setIsLoading(false);
      });

      // Attach cleanups
      hlsRef.current = {
        destroy: () => {
          video.removeEventListener('playing', onPlay);
          video.removeEventListener('waiting', onWaiting);
          video.removeEventListener('error', onError);
          video.src = '';
        }
      } as any;

    } else if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.warn('Auto-play blocked or failed:', err);
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error, attempting to recover...');
              setIsLoading(true);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error, attempting to recover...');
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg('Unrecoverable streaming error (format or connection failed)');
              destroyHls();
              break;
          }
        }
      });
    } else {
      setErrorMsg('HLS is not supported in this browser.');
      setIsLoading(false);
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!channel) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [channel, isPlaying, isMuted, volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMute = !isMuted;
    video.muted = nextMute;
    video.volume = nextMute ? 0 : volume;
    setIsMuted(nextMute);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0) {
      setIsMuted(false);
      video.muted = false;
      video.volume = v;
    } else {
      setIsMuted(true);
      video.muted = true;
      video.volume = 0;
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const playerContainer = videoRef.current?.parentElement;
    if (!playerContainer) return;

    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error(err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error(err));
    }
    resetControlsTimeout();
  };

  // Monitor fullscreen events (e.g. ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden select-none group/player border border-zinc-900 rounded-2xl shadow-2xl"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
      />

      {/* Connection & Buffering HUD */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-20 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-800/30 rounded-full" />
            <div className="absolute w-12 h-12 border-4 border-t-[#E50914] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Streaming Error Overlay */}
      {errorMsg && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle className="h-12 w-12 text-red-500 mb-3 animate-bounce" />
          <h3 className="text-red-400 font-semibold text-sm">Streaming Error</h3>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => channel && loadStream(channel.url)}
            className="mt-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Floating Info Overlay (top left) */}
      {channel && showControls && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10 animate-fade-in">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 p-3 rounded-xl flex items-center gap-3 max-w-[80%] shadow-lg">
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

          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-zinc-400 shadow-lg">
            LIVE
          </div>
        </div>
      )}

      {/* Media Controller Bar (overlay bottom) */}
      {channel && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-10 ${
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
                className="w-20 accent-red-650 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
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

      {/* Keyboard Shortcuts HUD (initially visible briefly on play start) */}
      {!channel && (
        <div className="text-center p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-zinc-800 mb-4 animate-pulse">
            <Tv className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-zinc-400 text-sm font-semibold">No active stream</h3>
          <p className="text-zinc-600 text-xs mt-1">Select a channel from the sidebar list to start playing.</p>
        </div>
      )}
    </div>
  );
};
