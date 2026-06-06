export type MediaType = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds, 0 for images
  width?: number;
  height?: number;
  thumbnail?: string; // URL or color bar representation
}

export interface Keyframe {
  id: string;
  time: number; // offset in seconds from the clip start
  value: number; // numeric value of the property
}

export interface KeyframeTrack {
  property: 'positionX' | 'positionY' | 'scale' | 'rotation' | 'opacity' | 'volume';
  keyframes: Keyframe[];
}

export interface ClipFilters {
  grayscale: number;     // 0 - 100 (%)
  sepia: number;         // 0 - 100 (%)
  invert: number;        // 0 - 100 (%)
  blur: number;          // px
  brightness: number;    // 0 - 200 (%)
  contrast: number;      // 0 - 200 (%)
  hueRotate: number;     // 0 - 360 (deg)
  saturate: number;      // 0 - 200 (%)
}

export interface TextConfig {
  text: string;
  fontSize: number; // px
  color: string; // hex
  strokeColor: string; // hex
  strokeWidth: number; // px
  x: number; // percent 0-100 of screen width
  y: number; // percent 0-100 of screen height
  fontFamily: string;
}

export interface TransitionEffect {
  type: 'cross-dissolve' | 'dip-to-black' | 'slide-left';
  duration: number; // in seconds
  position: 'start' | 'end'; // transition at clip start or clip end
}

export interface Clip {
  id: string;
  assetId: string;
  name: string;
  type: MediaType;
  trackId: string; // v1, v2, v3, a1, a2, a3
  timelineStart: number; // seconds
  timelineEnd: number; // seconds
  sourceStart: number; // seconds (in point)
  sourceDuration: number; // seconds (timelineEnd - timelineStart)
  
  // Transform settings
  positionX: number; // offset in px from center
  positionY: number; // offset in px from center
  scale: number; // percent (100 is default)
  rotation: number; // degrees
  opacity: number; // percent (100 is default)
  
  // Audio settings
  volume: number; // percent (100 is default)
  
  // Effects & Filters
  filters: ClipFilters;
  
  // Optional Text Overlay Config
  textConfig?: TextConfig;
  
  // Optional Keyframes
  keyframes: KeyframeTrack[];
  
  // Optional Transition
  transition?: TransitionEffect;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean; // only for video tracks
}

export type ToolType = 'select' | 'razor' | 'text' | 'hand';

export interface EditorState {
  currentTime: number;
  duration: number; // Sequence duration, default 30s
  zoom: number; // pixels per second
  scrollLeft: number; // timeline scroll position in px
  selectedClipId: string | null;
  selectedAssetId: string | null;
  tool: ToolType;
  isPlaying: boolean;
  playbackSpeed: number;
  tracks: Track[];
  clips: Clip[];
  mediaBin: MediaAsset[];
  sourceInPoint: number | null;
  sourceOutPoint: number | null;
  snapEnabled: boolean;
  playbackResolution: 1 | 0.5 | 0.25; // 1 = Full, 0.5 = 1/2, 0.25 = 1/4
  safeMarginsEnabled: boolean;
}

export interface HistoryItem {
  clips: Clip[];
  tracks: Track[];
}
