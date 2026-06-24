import React, { useMemo, useState, useRef, useEffect, useDeferredValue } from 'react';
import { Search, Tv, Play, Folder, ChevronDown } from 'lucide-react';
import type { IPTVChannel } from '../utils/m3uParser';
import { getChannelPrograms, getCurrentProgram } from '../utils/epgParser';
import type { EPGMap } from '../utils/epgParser';

interface SidebarProps {
  channels: IPTVChannel[];
  activeChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
  playlistName: string;
  epgData?: EPGMap;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  activeChannel,
  onSelectChannel,
  playlistName,
  epgData = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});

  // Virtualized Scroll State
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Extract all unique categories
  const categories = useMemo(() => {
    const list = new Set<string>();
    channels.forEach(ch => {
      if (ch.group) {
        list.add(ch.group);
      }
    });
    return ['All', ...Array.from(list).sort()];
  }, [channels]);

  // Precalculate channel count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts['All'] = channels.length;
    channels.forEach(ch => {
      if (ch.group) {
        counts[ch.group] = (counts[ch.group] || 0) + 1;
      }
    });
    return counts;
  }, [channels]);

  // Filter channels based on search term and category
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || ch.group === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [channels, deferredSearchTerm, selectedCategory]);

  // Reset scroll position on filter/search change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [searchTerm, selectedCategory]);

  // Determine whether EPG feed contains data to adjust row heights dynamically
  const hasEPG = useMemo(() => Object.keys(epgData).length > 0, [epgData]);
  const itemHeight = hasEPG ? 78 : 64; // adjusted for improved vertical padding/spacing
  const buffer = 15;     // buffer items rendered above and below viewport

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const clientHeight = containerRef.current ? containerRef.current.clientHeight : 800;
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + clientHeight) / itemHeight);

  const offsetStart = Math.max(0, startIndex - buffer);
  const offsetEnd = Math.min(filteredChannels.length, endIndex + buffer);

  const visibleChannels = useMemo(() => {
    return filteredChannels.slice(offsetStart, offsetEnd);
  }, [filteredChannels, offsetStart, offsetEnd]);

  const paddingTop = offsetStart * itemHeight;
  const paddingBottom = Math.max(0, (filteredChannels.length - offsetEnd) * itemHeight);

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
    <div className="w-full h-full flex flex-col bg-zinc-950/20 backdrop-blur-xl border-r border-white/5 select-none font-sans">
      
      {/* Search and Category Filter Module */}
      <div className="p-4.5 border-b border-white/5 space-y-3.5 bg-black/40">
        
        {/* Playlist metadata info banner */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5 px-0.5 tracking-widest font-extrabold uppercase">
          <span className="truncate pr-2" title={playlistName}>
            Source: <span className="text-zinc-300 font-black">{playlistName}</span>
          </span>
          <span className="shrink-0 bg-white/5 border border-white/10 text-zinc-300 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold">
            {filteredChannels.length} / {channels.length}
          </span>
        </div>

        {/* Search input field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#E50914] transition-colors">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search channels..."
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-0 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown Category Selector */}
        {categories.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between bg-black/45 hover:bg-black/60 border text-xs rounded-xl px-3.5 py-2.5 transition-all cursor-pointer ${
                isDropdownOpen ? 'border-red-500/30 ring-1 ring-red-500/20' : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="h-3.5 w-3.5 text-[#E50914] shrink-0" />
                <span className="truncate font-black text-zinc-200 uppercase tracking-widest text-[9px] mt-[1px]">
                  {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                  {categoryCounts[selectedCategory] || 0}
                </span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-450 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-red-550' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-[#0d0d12] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 custom-scrollbar animate-fade-in p-1.5 flex flex-col gap-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full group/cat flex items-center justify-between px-3 py-2 text-left text-xs rounded-xl transition-all cursor-pointer ${
                        selectedCategory === category 
                          ? 'text-white font-extrabold bg-red-955/20 border border-red-500/20 shadow-inner' 
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className={`h-3.5 w-3.5 shrink-0 ${selectedCategory === category ? 'text-red-500' : 'text-zinc-500'}`} />
                        <span className="truncate font-bold tracking-wide">{category}</span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        selectedCategory === category
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-white/5 text-zinc-500'
                      }`}>
                        {categoryCounts[category] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Virtualized Channel list viewport */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-2.5"
      >
        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Tv className="h-10 w-10 text-zinc-800 stroke-[1.2] mb-3 animate-pulse" />
            <p className="text-zinc-500 text-xs font-medium">No channels match your criteria</p>
          </div>
        ) : (
          <div style={{ paddingTop, paddingBottom }} className="space-y-1.5">
            {visibleChannels.map((channel) => {
              const isActive = activeChannel?.id === channel.id;
              
              // EPG schedule mapping
              const programs = epgData ? getChannelPrograms(epgData, channel) : undefined;
              const currentProg = programs ? getCurrentProgram(programs) : null;
              
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  style={{ height: `${itemHeight - 6}px` }} // slightly smaller item box height to add spacing gaps
                  className={`w-full flex items-center gap-3.5 px-3.5 rounded-2xl text-left transition-all duration-200 group relative shrink-0 overflow-hidden border ${
                    isActive
                      ? 'glass-panel border-red-500/20 text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
                      : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-250'
                  }`}
                >
                  {/* Left Accent Glow Indicator (active only) */}
                  {isActive && (
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#E50914] rounded-r-full shadow-[0_0_10px_#E50914]" />
                  )}

                  {/* Channel Icon or Fallback Tv */}
                  <div className={`relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all group-hover:scale-105 border ${
                    isActive 
                      ? 'bg-black/60 border-red-500/10' 
                      : 'bg-zinc-950/80 border-white/5 group-hover:border-white/10'
                  }`}>
                    {channel.logo && !logoErrors[channel.id] ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        loading="lazy"
                        className="w-full h-full object-contain p-1 opacity-0 transition-opacity duration-300"
                        onLoad={(e) => {
                          e.currentTarget.classList.remove('opacity-0');
                          e.currentTarget.classList.add('opacity-100');
                        }}
                        onError={() => {
                          setLogoErrors(prev => ({ ...prev, [channel.id]: true }));
                        }}
                      />
                    ) : (
                      <Tv className="h-4.5 w-4.5 text-zinc-700 transition-colors group-hover:text-zinc-500" />
                    )}
                  </div>

                  {/* Title & Metadata Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xs font-bold truncate tracking-wide ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                      {channel.name}
                    </h3>
                    
                    {currentProg ? (
                      <div className="flex flex-col mt-1 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <span className="text-[10px] text-red-500 font-extrabold truncate">
                            {currentProg.title}
                          </span>
                          <span className="text-[9px] text-zinc-500 shrink-0 font-bold font-mono">
                            {formatTime(currentProg.start)}
                          </span>
                        </div>
                        {/* EPG live visual bar */}
                        <div className="w-full bg-black/40 border border-white/5 rounded-full h-1 overflow-hidden">
                          <div 
                            className="bg-[#E50914] h-full rounded-full transition-all duration-500" 
                            style={{ width: `${calculateProgress(currentProg.start, currentProg.stop)}%` }} 
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-bold tracking-wide truncate block mt-0.5">
                        {channel.group || 'General'}
                      </span>
                    )}
                  </div>

                  {/* Active Playing Equalizer Animation or Hover Play icon */}
                  <div className="shrink-0 flex items-center justify-center w-6 h-6">
                    {isActive ? (
                      <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                        <span className="w-0.5 bg-[#E50914] rounded-full animate-equalizer-1" style={{ height: '60%' }} />
                        <span className="w-0.5 bg-[#E50914] rounded-full animate-equalizer-2" style={{ height: '100%' }} />
                        <span className="w-0.5 bg-[#E50914] rounded-full animate-equalizer-3" style={{ height: '40%' }} />
                      </div>
                    ) : (
                      <Play className="h-3 w-3 text-zinc-650 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200 fill-zinc-650" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
