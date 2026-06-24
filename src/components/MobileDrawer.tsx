import React from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { IPTVChannel } from '../utils/m3uParser';
import type { EPGMap } from '../utils/epgParser';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channels: IPTVChannel[];
  activeChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
  playlistName: string;
  epgData: EPGMap;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  channels,
  activeChannel,
  onSelectChannel,
  playlistName,
  epgData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div
        className="w-80 h-full glass-panel-heavy border-l border-white/5 shadow-2xl flex flex-col animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-transparent sticky top-0">
          <span className="text-xs font-black tracking-widest text-zinc-400 uppercase">IPTV Channels</span>
          <button
            onClick={onClose}
            className="text-zinc-450 hover:text-zinc-200 p-1.5 rounded-lg border border-white/5 bg-zinc-900/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Sidebar
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={onSelectChannel}
            playlistName={playlistName}
            epgData={epgData}
          />
        </div>
      </div>
    </div>
  );
};
