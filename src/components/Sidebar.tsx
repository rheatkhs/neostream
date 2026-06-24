import React, { useMemo, useState } from 'react';
import { Search, Tv, Play } from 'lucide-react';
import type { IPTVChannel } from '../utils/m3uParser';

interface SidebarProps {
  channels: IPTVChannel[];
  activeChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
  playlistName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  activeChannel,
  onSelectChannel,
  playlistName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

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

  // Filter channels based on search term and category
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || ch.group === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [channels, searchTerm, selectedCategory]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 border-r border-zinc-800/80">
      
      {/* Search and Category Filter Module */}
      <div className="p-4 border-b border-zinc-900 space-y-3 bg-zinc-950/50">
        
        {/* Playlist metadata info banner */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
          <span className="truncate pr-2 font-medium" title={playlistName}>
            Source: <span className="text-zinc-300 font-semibold">{playlistName}</span>
          </span>
          <span className="shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
            {filteredChannels.length} / {channels.length}
          </span>
        </div>

        {/* Search input field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search channels..."
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>

        {/* Category list filters */}
        {categories.length > 2 && (
          <div className="relative w-full">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-300 rounded-lg p-2 focus:outline-none focus:border-emerald-500/30 cursor-pointer appearance-none"
            >
              {categories.map((category) => (
                <option key={category} value={category} className="bg-zinc-950 text-zinc-300">
                  📂 {category}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Channel list viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Tv className="h-10 w-10 text-zinc-700 stroke-[1.5] mb-2 animate-pulse" />
            <p className="text-zinc-500 text-xs">No channels found matching filters</p>
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isActive = activeChannel?.id === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 group relative border ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/30 border-transparent hover:bg-zinc-900/40 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {/* Visual Glow Indicator (active only) */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-md" />
                )}

                {/* Channel Icon or Fallback Tv */}
                <div className="relative shrink-0 w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden transition-all group-hover:scale-102 group-hover:border-zinc-700/80">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      loading="lazy"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        // Fallback to text initials or default icon
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentNode as HTMLElement;
                        if (parent) {
                          const iconHtml = `<svg class="h-5 w-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;
                          parent.innerHTML = iconHtml;
                        }
                      }}
                    />
                  ) : (
                    <Tv className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                  )}
                </div>

                {/* Title & Metadata Details */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-300' : 'text-zinc-300 group-hover:text-white'}`}>
                    {channel.name}
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-medium truncate block mt-0.5">
                    {channel.group || 'General'}
                  </span>
                </div>

                {/* Active Playing Equalizer Animation or Hover Play icon */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6">
                  {isActive ? (
                    <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-1" style={{ height: '60%' }} />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-2" style={{ height: '100%' }} />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-equalizer-3" style={{ height: '40%' }} />
                    </div>
                  ) : (
                    <Play className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-200 fill-zinc-600" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
