import { useState, useEffect } from 'react';

export function useProxy() {
  const [useCorsProxy, setUseCorsProxy] = useState<boolean>(() => {
    return localStorage.getItem('neostream_use_cors_proxy') === 'true';
  });

  const [corsProxyUrl, setCorsProxyUrl] = useState<string>(() => {
    return localStorage.getItem('neostream_cors_proxy_url') || 'https://corsproxy.io/?';
  });

  // Persist proxy toggle to localStorage
  useEffect(() => {
    localStorage.setItem('neostream_use_cors_proxy', String(useCorsProxy));
  }, [useCorsProxy]);

  // Persist proxy URL to localStorage
  useEffect(() => {
    localStorage.setItem('neostream_cors_proxy_url', corsProxyUrl);
  }, [corsProxyUrl]);

  /** Prepend the CORS proxy prefix to a URL if proxy is enabled */
  const applyProxy = (url: string, forceProxy?: boolean): string => {
    const shouldProxy = forceProxy !== undefined ? forceProxy : useCorsProxy;
    return shouldProxy ? `${corsProxyUrl}${url}` : url;
  };

  return {
    useCorsProxy,
    setUseCorsProxy,
    corsProxyUrl,
    setCorsProxyUrl,
    applyProxy,
  };
}
