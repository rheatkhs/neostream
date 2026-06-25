import { useState, useCallback } from 'react';
import { dbGet, dbSet, dbClearAll, dbSetWithTTL, dbGetWithTTL } from '../utils/db';
import { runParserInWorker } from '../utils/parserWorker';
import type { IPTVChannel } from '../utils/m3uParser';

interface UsePlaylistOptions {
  applyProxy: (url: string, forceProxy?: boolean) => string;
  onEpgDiscovered?: (url: string) => void;
}

export function usePlaylist({ applyProxy, onEpgDiscovered }: UsePlaylistOptions) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [corsError, setCorsError] = useState<{ url: string } | null>(null);

  const hasPlaylist = channels.length > 0;

  /** Persist playlist data to IndexedDB */
  const saveToDB = async (url: string, name: string, list: IPTVChannel[]) => {
    try {
      await dbSet('neostream_last_url', url);
      await dbSet('neostream_playlist_name', name);
      await dbSet('neostream_channels', list);
    } catch (e) {
      console.warn('Database write failed', e);
    }
  };

  /** Fetch, parse, and persist a playlist from a URL.
   *  Uses IndexedDB TTL cache (1 hour) to avoid redundant network requests.
   *  Pass forceRefresh=true to bypass the cache. */
  const fetchPlaylist = useCallback(async (url: string, forceProxyState?: boolean, forceRefresh?: boolean) => {
    setIsLoading(true);
    setCorsError(null);
    try {
      const cacheKey = `neostream_m3u_cache_${url}`;
      let text: string | null = null;

      // Check TTL cache first (skip on force refresh)
      if (!forceRefresh) {
        text = await dbGetWithTTL<string>(cacheKey);
      }

      // Cache miss — fetch from network
      if (!text) {
        const finalUrl = applyProxy(url, forceProxyState);
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        text = await response.text();

        // Store raw M3U text with TTL timestamp
        await dbSetWithTTL(cacheKey, text);
      }

      const { channels: parsedChannels, tvgUrl: parsedEpgUrl } = await runParserInWorker('M3U', text);

      if (parsedChannels.length === 0) {
        alert('No streaming channels found. Check playlist format.');
      } else {
        setChannels(parsedChannels);
        setPlaylistUrl(url);
        const name = url.substring(url.lastIndexOf('/') + 1) || 'IPTV Playlist';
        setPlaylistName(name);
        await saveToDB(url, name, parsedChannels);
        setActiveChannel(null);

        if (parsedEpgUrl && onEpgDiscovered) {
          onEpgDiscovered(parsedEpgUrl);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setCorsError({ url });
    } finally {
      setIsLoading(false);
    }
  }, [applyProxy, onEpgDiscovered]);

  /** Select a channel and persist the selection */
  const selectChannel = useCallback(async (channel: IPTVChannel) => {
    setActiveChannel(channel);
    await dbSet('neostream_active_channel_id', channel.id);
  }, []);

  /** Clear all playlist state and the database */
  const clearPlaylist = useCallback(async () => {
    setChannels([]);
    setActiveChannel(null);
    setPlaylistUrl('');
    setPlaylistName('');
    setCorsError(null);
    await dbClearAll();
  }, []);

  /** Restore playlist data from IndexedDB (for page mount) */
  const restorePlaylist = useCallback(async () => {
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
        return true; // had saved data
      }
      return false; // no saved data
    } catch (err) {
      console.warn('Error loading cached database values', err);
      return false;
    }
  }, []);

  return {
    playlistUrl,
    playlistName,
    channels,
    activeChannel,
    isLoading,
    corsError,
    setCorsError,
    hasPlaylist,
    fetchPlaylist,
    selectChannel,
    clearPlaylist,
    restorePlaylist,
  };
}
