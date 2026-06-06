const FPS = 30;

/**
 * Converts time in seconds to HH:MM:SS:FF format
 */
export function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * FPS);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

/**
 * Converts HH:MM:SS:FF timecode to seconds
 */
export function parseTimecode(timecode: string): number {
  const parts = timecode.split(':');
  if (parts.length !== 4) return 0;
  
  const hrs = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  const secs = parseInt(parts[2], 10) || 0;
  const frames = parseInt(parts[3], 10) || 0;
  
  return hrs * 3600 + mins * 60 + secs + frames / FPS;
}

/**
 * Formats time into a friendly ruler tick label (e.g. "00:02" or "01:15")
 */
export function formatRulerTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * FPS);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  if (mins > 0) {
    return `${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  }
  return `${pad(secs)}:${pad(frames)}`;
}
