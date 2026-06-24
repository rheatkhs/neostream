export interface IPTVChannel {
  id: string;
  name: string;
  logo: string | null;
  url: string;
  group: string | null;
}

/**
 * Parses standard M3U syntax resiliently to extract channels
 * Each channel will have a name, optional logo, group, and its stream URL.
 */
export function parseM3U(content: string): IPTVChannel[] {
  const lines = content.split(/\r?\n/);
  const channels: IPTVChannel[] = [];
  let currentInfo: { name: string; logo: string | null; group: string | null } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
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

      currentInfo = { name, logo, group };
    } else if (!line.startsWith('#')) {
      // This is the stream URL line
      if (currentInfo) {
        // Only accept http/https streaming urls
        if (line.startsWith('http://') || line.startsWith('https://')) {
          channels.push({
            id: `${channels.length}-${Math.random().toString(36).substring(2, 9)}`,
            name: currentInfo.name || 'Unnamed Channel',
            logo: currentInfo.logo,
            url: line,
            group: currentInfo.group || 'General',
          });
        }
        currentInfo = null;
      }
    }
  }

  return channels;
}
