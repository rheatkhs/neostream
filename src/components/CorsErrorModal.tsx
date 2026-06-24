import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface CorsErrorModalProps {
  url: string;
  useCorsProxy: boolean;
  onEnableProxy: () => void;
  onClose: () => void;
}

export const CorsErrorModal: React.FC<CorsErrorModalProps> = ({
  url,
  useCorsProxy,
  onEnableProxy,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-slide-up">

      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

      <button
        onClick={onClose}
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
          The browser could not load the playlist because the remote server lacks CORS headers (<code>Access-Control-Allow-Origin</code>).
        </p>
        <div className="text-[9px] text-zinc-500 font-mono truncate bg-black/50 border border-zinc-900 p-2 rounded-lg">
          Url: {url}
        </div>
        <p>
          To bypass this issue, you can load the stream through our integrated CORS proxy.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {!useCorsProxy && (
          <button
            onClick={onEnableProxy}
            className="w-full bg-[#E50914] hover:bg-[#B80710] text-white font-bold text-xs py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Enable Proxy & Retry
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-semibold text-xs py-3 rounded-xl cursor-pointer transition-all"
        >
          Go Back
        </button>
      </div>

    </div>
  </div>
);
