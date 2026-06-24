import { useState, useEffect, useCallback } from 'react';
import { dbGet, dbSet } from '../utils/db';
import { runParserInWorker } from '../utils/parserWorker';
import type { EPGMap } from '../utils/epgParser';

interface UseEpgOptions {
  applyProxy: (url: string) => string;
  /** Dependency values — when these change the EPG is re-fetched */
  proxyDeps: unknown[];
}

export function useEpg({ applyProxy, proxyDeps }: UseEpgOptions) {
  const [epgUrl, setEpgUrl] = useState('');
  const [epgData, setEpgData] = useState<EPGMap>({});
  const [isEpgLoading, setIsEpgLoading] = useState(false);

  /** Fetch and parse an EPG XML feed */
  const fetchEpg = useCallback(async (url: string) => {
    if (!url) return;
    setIsEpgLoading(true);
    try {
      const finalUrl = applyProxy(url);
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error('EPG fetch failed');
      const text = await response.text();

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
  }, [applyProxy]);

  /** Restore EPG data from IndexedDB on mount */
  const restoreEpg = useCallback(async () => {
    try {
      const savedEpgUrl = await dbGet<string>('neostream_epg_url');
      const savedEpgData = await dbGet<EPGMap>('neostream_epg_data');
      if (savedEpgData) {
        // Re-hydrate Date objects from serialized strings
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
        await fetchEpg(savedEpgUrl);
      }
    } catch (err) {
      console.warn('Error restoring cached EPG data', err);
    }
  }, [fetchEpg]);

  /** Re-fetch EPG when proxy settings change */
  useEffect(() => {
    const refetch = async () => {
      const savedUrl = await dbGet<string>('neostream_epg_url');
      if (savedUrl) fetchEpg(savedUrl);
    };
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, proxyDeps);

  return {
    epgUrl,
    epgData,
    isEpgLoading,
    fetchEpg,
    restoreEpg,
  };
}
