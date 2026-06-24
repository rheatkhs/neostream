export interface IPTVChannel {
  id: string;
  name: string;
  logo: string | null;
  url: string;
  group: string | null;
  tvgId: string | null;
}

export interface ParsedM3U {
  channels: IPTVChannel[];
  epgUrl: string | null;
}

/**
 * Parses standard M3U syntax resiliently to extract channels and EPG URL metadata.
 */
export function parseM3U(content: string): ParsedM3U {
  const lines = content.split(/\r?\n/);
  const channels: IPTVChannel[] = [];
  let epgUrl: string | null = null;
  let currentInfo: { name: string; logo: string | null; group: string | null; tvgId: string | null } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      // Extract EPG URLs if defined in the playlist header tag
      const epgMatch = line.match(/url-tvg="([^"]+)"/i) || line.match(/x-tvg-url="([^"]+)"/i);
      if (epgMatch) {
        epgUrl = epgMatch[1];
      }
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Extract tvg-id="..."
      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
      const tvgId = tvgIdMatch ? tvgIdMatch[1] : null;

      // Extract tvg-logo="..." or logo="..."
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i) || line.match(/logo="([^"]+)"/i);
      const logo = logoMatch ? logoMatch[1] : null;

      // Extract group-title="..."
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const group = groupMatch ? groupMatch[1] : null;

      // Extract channel name (text after the last comma)
      const commaIndex = line.lastIndexOf(',');
      let name = 'Unknown Channel';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      } else {
        // Fallback: search for tvg-name="..."
        const nameMatch = line.match(/tvg-name="([^"]+)"/i);
        if (nameMatch) {
          name = nameMatch[1];
        }
      }

      currentInfo = { name, logo, group, tvgId };
    } else if (!line.startsWith('#')) {
      // This is the stream URL line
      if (currentInfo) {
        // Only accept http/https streaming urls
        if (line.startsWith('http://') || line.startsWith('https://')) {
          channels.push({
            id: String(channels.length),
            name: currentInfo.name || 'Unnamed Channel',
            logo: currentInfo.logo,
            url: line,
            group: currentInfo.group || 'General',
            tvgId: currentInfo.tvgId,
          });
        }
        currentInfo = null;
      }
    }
  }

  return {
    channels,
    epgUrl,
  };
}
