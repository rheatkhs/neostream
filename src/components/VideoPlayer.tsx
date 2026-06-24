import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RefreshCw, 
  AlertCircle, 
  Tv, 
  Radio, 
  Sliders, 
  ExternalLink, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import type { IPTVChannel } from '../utils/m3uParser';
import { getChannelPrograms, getCurrentProgram, getNextProgram } from '../utils/epgParser';
import type { EPGMap } from '../utils/epgParser';

interface VideoPlayerProps {
  channel: IPTVChannel | null;
  useCorsProxy: boolean;
  corsProxyUrl: string;
  epgData?: EPGMap;
  isMiniPlayer: boolean;
  setIsMiniPlayer: (val: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  channel, 
  useCorsProxy, 
  corsProxyUrl, 
  epgData = {},
  isMiniPlayer,
  setIsMiniPlayer
}) => {
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

  // Video Fine-Tuning states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('contain');
  const [brightness, setBrightness] = useState<number>(1);
  const [contrast, setContrast] = useState<number>(1);
  const [saturation, setSaturation] = useState<number>(1);

  const controlsTimeoutRef = useRef<number | null>(null);

  // EPG schedule mapping
  const programs = channel ? getChannelPrograms(epgData, channel) : undefined;
  const currentProg = programs ? getCurrentProgram(programs) : null;
  const nextProg = programs ? getNextProgram(programs) : null;

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

    const finalUrl = useCorsProxy ? `${corsProxyUrl}${url}` : url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 4,
      });

      hlsRef.current = hls;
      hls.loadSource(finalUrl);
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
      video.src = finalUrl;
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

  // Trigger stream loading on channel change or proxy configurations toggle
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
  }, [channel, useCorsProxy, corsProxyUrl]);

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if focus is in input boxes
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, isFullscreen]);

  // Reset controls visibility timer
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !isSettingsOpen) {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isSettingsOpen]);

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
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (value > 0) {
      setIsMuted(false);
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('neostream-player-wrapper');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error('Error exiting fullscreen:', err));
    }
    resetControlsTimeout();
  };

  // Sync fullscreen change with esc or standard exit states
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Native Picture-in-Picture Toggle
  const handleTogglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      } else {
        alert('Picture-in-Picture is not supported or enabled in this browser.');
      }
    } catch (error) {
      console.error('Error toggling native Picture-in-Picture:', error);
    }
    resetControlsTimeout();
  };

  // Helper formats program start and stop times
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper calculates timeline progress bar widths
  const calculateProgress = (start: Date, stop: Date) => {
    const now = new Date().getTime();
    const startMs = start.getTime();
    const stopMs = stop.getTime();
    if (stopMs === startMs) return 0;
    const percentage = ((now - startMs) / (stopMs - startMs)) * 100;
    return Math.min(100, Math.max(0, percentage));
  };

  return (
    <div 
      id="neostream-player-wrapper"
      className="relative w-full h-full bg-black flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      {/* Video Node */}
      <video
        ref={videoRef}
        className="w-full h-full transition-all duration-300"
        style={{
          objectFit: aspectRatio as any,
          filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`
        }}
        playsInline
      />

      {/* Custom loading spinner */}
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
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center relative overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
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
                Try selecting a different channel or toggling the CORS proxy settings.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Info Overlay (top left) */}
      {channel && showControls && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-850 p-4 rounded-2xl flex items-start gap-3.5 max-w-[85%] sm:max-w-[60%] shadow-2xl pointer-events-auto">
            <div className="w-10 h-10 bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0 mt-0.5">
              {channel.logo ? (
                <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} />
              ) : (
                <Tv className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-extrabold text-zinc-100 truncate">{channel.name}</h2>
              
              {currentProg ? (
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-wider bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                      LIVE
                    </span>
                    <span className="text-xs font-bold text-zinc-200 truncate block max-w-[280px]">
                      {currentProg.title}
                    </span>
                  </div>
                  {currentProg.desc && (
                    <p className="text-[10px] text-zinc-400 line-clamp-2 max-w-[350px] leading-relaxed">
                      {currentProg.desc}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 text-[9px] text-zinc-500 font-mono mt-1">
                    <span>
                      {formatTime(currentProg.start)} - {formatTime(currentProg.stop)}
                    </span>
                    <span>
                      {Math.round(calculateProgress(currentProg.start, currentProg.stop))}% completed
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-zinc-850 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-red-600 h-full rounded-full transition-all duration-500 animate-pulse" 
                      style={{ width: `${calculateProgress(currentProg.start, currentProg.stop)}%` }} 
                    />
                  </div>
                  {nextProg && (
                    <div className="text-[9px] text-zinc-500 pt-1.5 border-t border-zinc-850/60 mt-1">
                      <span className="font-semibold text-zinc-400">Up Next:</span> {nextProg.title} ({formatTime(nextProg.start)})
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-red-500 font-medium truncate mt-0.5">{channel.group || 'Live Stream'}</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-850 px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider text-red-500 shadow-lg shrink-0 select-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-550 rounded-full animate-ping" />
            LIVE
          </div>
        </div>
      )}

      {/* Fine-Tuning Drawer / Sliders Panel */}
      {channel && showControls && isSettingsOpen && (
        <div 
          className="absolute bottom-16 right-4 w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-850 p-4 rounded-2xl shadow-2xl z-20 animate-slide-up flex flex-col gap-4 select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-red-550" />
              Video Fine-Tuning
            </h4>
            <button
              onClick={() => {
                setAspectRatio('contain');
                setBrightness(1);
                setContrast(1);
                setSaturation(1);
              }}
              className="text-[9px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              Reset All
            </button>
          </div>

          {/* Aspect Ratio Buttons */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['contain', 'fill', 'cover'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAspectRatio(mode)}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                    aspectRatio === mode
                      ? 'bg-red-950/30 border-red-650/40 text-red-500 shadow-sm font-extrabold'
                      : 'bg-zinc-900/60 border-zinc-850 text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  {mode === 'contain' ? 'Fit (16:9)' : mode === 'fill' ? 'Fill (Stretch)' : 'Zoom (Crop)'}
                </button>
              ))}
            </div>
          </div>

          {/* Color Correction Sliders */}
          <div className="flex flex-col gap-3">
            {/* Brightness */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                <span>Brightness</span>
                <span className="font-mono text-zinc-550">{Math.round(brightness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-red-650 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                <span>Contrast</span>
                <span className="font-mono text-zinc-550">{Math.round(contrast * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full accent-red-650 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                <span>Saturation</span>
                <span className="font-mono text-zinc-550">{Math.round(saturation * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={saturation}
                onChange={(e) => setSaturation(parseFloat(e.target.value))}
                className="w-full accent-red-650 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Controller Bar (overlay bottom) */}
      {channel && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-10 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
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

            {/* Screen Layout / Custom Settings controls */}
            <div className="flex items-center gap-2">
              {/* Fine Tuning settings toggle */}
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`border p-2.5 rounded-xl transition-all cursor-pointer ${
                  isSettingsOpen 
                    ? 'bg-red-950/20 border-red-600/40 text-red-500' 
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Video Fine-Tuning"
              >
                <Sliders className="h-4.5 w-4.5" />
              </button>

              {/* Native PIP trigger */}
              <button
                onClick={handleTogglePip}
                className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 p-2.5 rounded-xl transition-all cursor-pointer"
                title="Picture-in-Picture"
              >
                <ExternalLink className="h-4.5 w-4.5" />
              </button>

              {/* Mini-player overlay toggle */}
              <button
                onClick={() => setIsMiniPlayer(!isMiniPlayer)}
                className={`border p-2.5 rounded-xl transition-all cursor-pointer ${
                  isMiniPlayer 
                    ? 'bg-red-950/20 border-red-600/40 text-red-500 animate-pulse' 
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
                title={isMiniPlayer ? 'Restore Viewport' : 'Floating Mini Player'}
              >
                {isMiniPlayer ? <Maximize2 className="h-4.5 w-4.5" /> : <Minimize2 className="h-4.5 w-4.5" />}
              </button>

              {/* Standard Fullscreen Toggle */}
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
              <span className="text-[10px] text-zinc-550 mt-1.5">Play/Pause</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 border border-zinc-850">F KEY</span>
              <span className="text-[10px] text-zinc-555 mt-1.5">Fullscreen</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 border border-zinc-850">M KEY</span>
              <span className="text-[10px] text-zinc-555 mt-1.5">Mute Audio</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
