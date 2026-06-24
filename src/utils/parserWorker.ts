// Dynamically created inline Web Worker for M3U/EPG parsing

const workerCode = `
  self.onmessage = function(e) {
    const { type, content } = e.data;
    
    if (type === 'M3U') {
      try {
        const lines = content.split('\\n');
        const channels = [];
        let currentChannel = null;
        let tvgUrl = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTM3U')) {
            const tvgMatch = line.match(/(?:url-tvg|x-tvg-url)="([^"]+)"/i);
            if (tvgMatch) tvgUrl = tvgMatch[1];
          } else if (line.startsWith('#EXTINF:')) {
            const id = 'ch_' + Math.random().toString(36).substr(2, 9) + '_' + i;
            
            const nameMatch = line.match(/,(.+)$/);
            const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
            
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            const logo = logoMatch ? logoMatch[1] : '';
            
            const groupMatch = line.match(/group-title="([^"]+)"/i);
            const rawGroup = groupMatch ? groupMatch[1].trim() : '';
            const group = rawGroup ? rawGroup.replace(/;/g, ',') : 'Others';
            
            const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
            const tvgId = tvgIdMatch ? tvgIdMatch[1] : '';

            currentChannel = { id, name, logo, group, tvgId, url: '' };
          } else if (line && !line.startsWith('#')) {
            if (currentChannel) {
              currentChannel.url = line;
              channels.push(currentChannel);
              currentChannel = null;
            }
          }
        }
        self.postMessage({ success: true, channels, tvgUrl });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    } else if (type === 'XMLTV') {
      try {
        const epgData = {};
        
        // Match channel labels
        const channelRegex = /<channel\\s+id="([^"]+)"[\\s\\S]*?>([\\s\\S]*?)<\\/channel>/g;
        let match;
        const channelNames = {};
        while ((match = channelRegex.exec(content)) !== null) {
          const id = match[1];
          const inner = match[2];
          const nameMatch = inner.match(/<display-name[^>]*>([\\s\\S]*?)<\\/display-name>/i);
          if (nameMatch) {
            channelNames[id] = nameMatch[1].trim();
          }
        }

        // Match programmes
        const progRegex = /<programme\\s+start="([^"]+)"\\s+stop="([^"]+)"\\s+channel="([^"]+)"[\\s\\S]*?>([\\s\\S]*?)<\\/programme>/g;
        
        const parseXMLTVDate = (dateStr) => {
          const clean = dateStr.replace(/[^0-9+\\-]/g, '');
          const match = clean.match(/^(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})\\s*(.*)$/);
          if (!match) return dateStr; // return raw string if format not matched
          
          const [_, y, m, d, h, min, s, tz] = match;
          const isoString = \`\${y}-\\/\${m}-\\/\${d} \${h}:\${min}:\${s}\`;
          
          // Construct date UTC elements
          let date = new Date(Date.UTC(
            parseInt(y, 10),
            parseInt(m, 10) - 1,
            parseInt(d, 10),
            parseInt(h, 10),
            parseInt(min, 10),
            parseInt(s, 10)
          ));
          
          if (tz && (tz.startsWith('+') || tz.startsWith('-'))) {
            const sign = tz.charAt(0) === '+' ? -1 : 1; // offset adjustment sign
            const hours = parseInt(tz.substring(1, 3), 10);
            const minutes = parseInt(tz.substring(3, 5) || '0', 10);
            const offsetMinutes = sign * (hours * 60 + minutes);
            date = new Date(date.getTime() + offsetMinutes * 60 * 1000);
          }
          return date.toISOString(); // Convert to ISO string to safely pass via postMessage
        };

        while ((match = progRegex.exec(content)) !== null) {
          const startStr = match[1];
          const stopStr = match[2];
          const channelId = match[3];
          const inner = match[4];

          const titleMatch = inner.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
          if (!titleMatch) continue;
          const title = titleMatch[1].trim();

          const descMatch = inner.match(/<desc[^>]*>([\\s\\S]*?)<\\/desc>/i);
          const desc = descMatch ? descMatch[1].trim() : '';

          const start = parseXMLTVDate(startStr);
          const stop = parseXMLTVDate(stopStr);

          const prog = { title, desc, start, stop };
          
          const keys = [channelId.toLowerCase().trim()];
          if (channelNames[channelId]) {
            keys.push(channelNames[channelId].toLowerCase().trim());
          }

          keys.forEach(k => {
            if (!epgData[k]) epgData[k] = [];
            epgData[k].push(prog);
          });
        }

        // Sort schedules
        for (const k in epgData) {
          epgData[k].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        }

        self.postMessage({ success: true, epgData });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    }
  };
`;

export const runParserInWorker = (type: 'M3U' | 'XMLTV', content: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      if (e.data.success) {
        // Resolve and map EPG ISO strings back to Date objects on main thread
        const data = e.data;
        if (type === 'XMLTV') {
          const epg = data.epgData;
          for (const key in epg) {
            epg[key] = epg[key].map((prog: any) => ({
              ...prog,
              start: new Date(prog.start),
              stop: new Date(prog.stop),
            }));
          }
        }
        resolve(data);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (err) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ type, content });
  });
};
