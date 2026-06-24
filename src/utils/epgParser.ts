import type { IPTVChannel } from './m3uParser';

export interface EPGProgram {
  title: string;
  start: Date;
  stop: Date;
  desc: string | null;
}

export type EPGMap = Record<string, EPGProgram[]>;

// Helper to parse XMLTV date format: e.g. "20260624060000 +0000" or "20260624060000"
function parseEPGDate(dateStr: string): Date {
  try {
    const cleaned = dateStr.trim();
    if (cleaned.length >= 14) {
      const year = parseInt(cleaned.substring(0, 4), 10);
      const month = parseInt(cleaned.substring(4, 6), 10) - 1; // 0-based month
      const day = parseInt(cleaned.substring(6, 8), 10);
      const hour = parseInt(cleaned.substring(8, 10), 10);
      const minute = parseInt(cleaned.substring(10, 12), 10);
      const second = parseInt(cleaned.substring(12, 14), 10);

      // Check for timezone offset (e.g. "+0000" or "-0500" or "+0200")
      const tzMatch = cleaned.match(/\s+([+-]\d{4})$/);
      if (tzMatch) {
        const tz = tzMatch[1];
        const sign = tz[0] === '+' ? 1 : -1;
        const tzHours = parseInt(tz.substring(1, 3), 10);
        const tzMinutes = parseInt(tz.substring(3, 5), 10);
        const offsetMs = (tzHours * 60 + tzMinutes) * 60 * 1000 * sign;
        
        // Create date as UTC, then subtract the offset to get local time
        const utcDate = Date.UTC(year, month, day, hour, minute, second);
        return new Date(utcDate - offsetMs);
      }
      
      return new Date(year, month, day, hour, minute, second);
    }
  } catch (e) {
    console.error('Error parsing EPG date string:', dateStr, e);
  }
  return new Date(dateStr);
}

/**
 * Parses XMLTV (XML based EPG program listings) to an EPGMap
 */
export function parseEPG(xmlContent: string): EPGMap {
  const epgMap: EPGMap = {};
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
    
    // Check if XML parsing succeeded
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      console.warn('XML Parser Error in EPG data');
      return epgMap;
    }
    
    const programmes = xmlDoc.getElementsByTagName('programme');
    
    for (let i = 0; i < programmes.length; i++) {
      const progNode = programmes[i];
      const channelId = progNode.getAttribute('channel');
      const startStr = progNode.getAttribute('start');
      const stopStr = progNode.getAttribute('stop');
      
      if (!channelId || !startStr || !stopStr) continue;
      
      const titleNode = progNode.getElementsByTagName('title')[0];
      const title = titleNode ? titleNode.textContent || 'No Title' : 'No Title';
      
      const descNode = progNode.getElementsByTagName('desc')[0];
      const desc = descNode ? descNode.textContent : null;
      
      const start = parseEPGDate(startStr);
      const stop = parseEPGDate(stopStr);
      
      const program: EPGProgram = { title, start, stop, desc };
      
      const key = channelId.toLowerCase().trim();
      if (!epgMap[key]) {
        epgMap[key] = [];
      }
      epgMap[key].push(program);
    }
    
    // Sort programs for each channel by start time
    Object.keys(epgMap).forEach(key => {
      epgMap[key].sort((a, b) => a.start.getTime() - b.start.getTime());
    });
  } catch (error) {
    console.error('Error parsing EPG XML:', error);
  }
  
  return epgMap;
}

/**
 * Matches a channel to its corresponding EPG program listing
 */
export function getChannelPrograms(epgData: EPGMap, channel: IPTVChannel): EPGProgram[] | undefined {
  if (channel.tvgId) {
    const key = channel.tvgId.toLowerCase().trim();
    if (epgData[key]) return epgData[key];
  }
  
  const nameKey = channel.name.toLowerCase().trim();
  if (epgData[nameKey]) return epgData[nameKey];
  
  return undefined;
}

/**
 * Finds the currently active program for a channel's program list
 */
export function getCurrentProgram(programs: EPGProgram[] | undefined, now: Date = new Date()): EPGProgram | null {
  if (!programs) return null;
  const time = now.getTime();
  for (let i = 0; i < programs.length; i++) {
    const prog = programs[i];
    if (time >= prog.start.getTime() && time < prog.stop.getTime()) {
      return prog;
    }
  }
  return null;
}

/**
 * Finds the upcoming program for a channel's program list
 */
export function getNextProgram(programs: EPGProgram[] | undefined, now: Date = new Date()): EPGProgram | null {
  if (!programs) return null;
  const time = now.getTime();
  for (let i = 0; i < programs.length; i++) {
    const prog = programs[i];
    if (prog.start.getTime() >= time) {
      return prog;
    }
  }
  return null;
}
