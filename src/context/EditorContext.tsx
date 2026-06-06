import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { 
  EditorState, Clip, Track, MediaAsset, ToolType, HistoryItem, KeyframeTrack
} from '../types/editor';
import { audioEngine } from '../utils/audioEngine';
import { getMediaElement } from '../utils/renderEngine';

interface EditorContextProps extends EditorState {
  getCurrentTime: () => number;
  setTool: (tool: ToolType) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setScrollLeft: (scroll: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedAssetId: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setPlaybackResolution: (res: 1 | 0.5 | 0.25) => void;
  setSafeMarginsEnabled: (enabled: boolean) => void;
  
  // Media Bin Actions
  importFileAsset: (name: string, type: 'video' | 'audio' | 'image', url: string, duration: number) => void;
  synthesizeMockAsset: (type: 'bars' | 'leader' | 'synthwave' | 'particles') => void;
  
  // Timeline Actions
  addClipToTimeline: (assetId: string, trackId: string, startTime: number) => void;
  deleteClip: (clipId: string) => void;
  updateClipProperties: (clipId: string, updates: Partial<Clip>) => void;
  splitClipAtPlayhead: () => void;
  trimClip: (clipId: string, side: 'left' | 'right', newTime: number) => void;
  
  // Track Actions
  toggleMuteTrack: (trackId: string) => void;
  toggleSoloTrack: (trackId: string) => void;
  toggleLockTrack: (trackId: string) => void;
  toggleVisibleTrack: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  
  // Keyframe Actions
  togglePropertyKeyframing: (clipId: string, property: KeyframeTrack['property']) => void;
  addKeyframe: (clipId: string, property: KeyframeTrack['property'], time: number, value: number) => void;
  removeKeyframe: (clipId: string, property: KeyframeTrack['property'], kfId: string) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Master Volume State
  masterVolume: number;
  trackVolumes: Record<string, number>;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

// Initial Media Assets
const DEFAULT_MEDIA_BIN: MediaAsset[] = [
  {
    id: 'synth_countdown',
    name: 'Universal Film Leader.mp4',
    type: 'video',
    url: 'synthetic',
    duration: 8,
    width: 1920,
    height: 1080
  },
  {
    id: 'synth_synthwave',
    name: 'Neon Synthwave Loop.mp4',
    type: 'video',
    url: 'synthetic',
    duration: 20,
    width: 1920,
    height: 1080
  },
  {
    id: 'synth_color_bars',
    name: 'SMPTE Color Slate & Tone.mp4',
    type: 'video',
    url: 'synthetic',
    duration: 12,
    width: 1920,
    height: 1080
  },
  {
    id: 'synth_particles',
    name: 'Abstract Particles.mp4',
    type: 'video',
    url: 'synthetic',
    duration: 15,
    width: 1920,
    height: 1080
  }
];

// Initial Tracks
const DEFAULT_TRACKS: Track[] = [
  { id: 'v3', name: 'Video 3', type: 'video', muted: false, solo: false, locked: false, visible: true },
  { id: 'v2', name: 'Video 2', type: 'video', muted: false, solo: false, locked: false, visible: true },
  { id: 'v1', name: 'Video 1', type: 'video', muted: false, solo: false, locked: false, visible: true },
  { id: 'a1', name: 'Audio 1', type: 'audio', muted: false, solo: false, locked: false, visible: true },
  { id: 'a2', name: 'Audio 2', type: 'audio', muted: false, solo: false, locked: false, visible: true },
  { id: 'a3', name: 'Audio 3', type: 'audio', muted: false, solo: false, locked: false, visible: true }
];

// Initial Clips on load
const DEFAULT_CLIPS: Clip[] = [
  {
    id: 'clip_countdown_v',
    assetId: 'synth_countdown',
    name: 'Film Leader [V]',
    type: 'video',
    trackId: 'v1',
    timelineStart: 0,
    timelineEnd: 8,
    sourceStart: 0,
    sourceDuration: 8,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: []
  },
  {
    id: 'clip_countdown_a',
    assetId: 'synth_countdown',
    name: 'Film Leader [A]',
    type: 'audio',
    trackId: 'a1',
    timelineStart: 0,
    timelineEnd: 8,
    sourceStart: 0,
    sourceDuration: 8,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: []
  },
  {
    id: 'clip_title_v',
    assetId: 'synth_particles',
    name: 'Overlay Title Text',
    type: 'video',
    trackId: 'v3',
    timelineStart: 2,
    timelineEnd: 7,
    sourceStart: 0,
    sourceDuration: 5,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: [],
    textConfig: {
      text: 'ADOBE PREMIERE PRO ONLINE',
      fontSize: 42,
      color: '#00c6ff',
      strokeColor: '#000000',
      strokeWidth: 4,
      x: 50,
      y: 82,
      fontFamily: 'Impact'
    }
  },
  {
    id: 'clip_synthwave_v',
    assetId: 'synth_synthwave',
    name: 'Synthwave Loop [V]',
    type: 'video',
    trackId: 'v2',
    timelineStart: 8,
    timelineEnd: 24,
    sourceStart: 0,
    sourceDuration: 16,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: []
  },
  {
    id: 'clip_color_bars_v',
    assetId: 'synth_color_bars',
    name: 'Color Bars [V]',
    type: 'video',
    trackId: 'v1',
    timelineStart: 24,
    timelineEnd: 35,
    sourceStart: 0,
    sourceDuration: 11,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: []
  },
  {
    id: 'clip_color_bars_a',
    assetId: 'synth_color_bars',
    name: 'Color Bars [A]',
    type: 'audio',
    trackId: 'a1',
    timelineStart: 24,
    timelineEnd: 35,
    sourceStart: 0,
    sourceDuration: 11,
    positionX: 0,
    positionY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    volume: 100,
    filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
    keyframes: []
  }
];

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // App Core State
  const [tool, setToolState] = useState<ToolType>('select');
  const [currentTime, setCurrentTimeState] = useState<number>(0);
  const currentTimeRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);
  const [duration] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(18); // default timeline zoom
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [playbackResolution, setPlaybackResolution] = useState<1 | 0.5 | 0.25>(1);
  const [safeMarginsEnabled, setSafeMarginsEnabled] = useState<boolean>(false);
  
  const [mediaBin, setMediaBin] = useState<MediaAsset[]>(DEFAULT_MEDIA_BIN);
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [clips, setClips] = useState<Clip[]>(DEFAULT_CLIPS);
  
  const [sourceInPoint] = useState<number | null>(null);
  const [sourceOutPoint] = useState<number | null>(null);

  // Audio fader values
  const [masterVolume, setMasterVolumeState] = useState<number>(80);
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>({
    a1: 80,
    a2: 80,
    a3: 80
  });

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);

  // Refs for tracking playback loop
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Initialize Web Audio Engine
  useEffect(() => {
    audioEngine.init();
    audioEngine.setMasterVolume(masterVolume);
    Object.entries(trackVolumes).forEach(([tid, vol]) => {
      audioEngine.setTrackVolume(tid, vol);
    });
    
    // Connect elements when assets load or clips change
    clips.forEach((clip) => {
      if (clip.type === 'video' || clip.type === 'audio') {
        const asset = mediaBin.find((a) => a.id === clip.assetId);
        if (asset && asset.url !== 'synthetic') {
          const el = getMediaElement(asset);
          if (el && clip.trackId.startsWith('a')) {
            audioEngine.connectElement(clip.id, el as HTMLMediaElement, clip.trackId);
          }
        }
      }
    });

    return () => {
      audioEngine.stopTone();
    };
  }, [clips, mediaBin]);

  // Helper to record history snapshot
  const saveHistory = (customClips = clips, customTracks = tracks) => {
    setUndoStack(prev => [...prev, { clips: JSON.parse(JSON.stringify(customClips)), tracks: JSON.parse(JSON.stringify(customTracks)) }]);
    setRedoStack([]); // Clear redo
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    
    // Save current state to Redo stack
    setRedoStack(prev => [...prev, { clips: JSON.parse(JSON.stringify(clips)), tracks: JSON.parse(JSON.stringify(tracks)) }]);
    
    // Apply previous state
    setClips(previous.clips);
    setTracks(previous.tracks);
    setSelectedClipId(null);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    
    // Save current to Undo
    setUndoStack(prev => [...prev, { clips: JSON.parse(JSON.stringify(clips)), tracks: JSON.parse(JSON.stringify(tracks)) }]);
    
    setClips(next.clips);
    setTracks(next.tracks);
    setSelectedClipId(null);
  };

  // Playback Control Synchronization (Starts audio + video playing natively)
  useEffect(() => {
    if (isPlaying) {
      audioEngine.resume();
      
      // Start native playback on non-synthetic HTML video/audio media items
      clips.forEach((clip) => {
        const asset = mediaBin.find((a) => a.id === clip.assetId);
        if (!asset || asset.url === 'synthetic') return;

        const el = getMediaElement(asset);
        if (el && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) {
          // Is this clip active right now?
          if (currentTime >= clip.timelineStart && currentTime <= clip.timelineEnd) {
            const fileTime = (currentTime - clip.timelineStart) + clip.sourceStart;
            el.currentTime = fileTime;
            el.playbackRate = playbackSpeed;
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      });
    } else {
      audioEngine.stopTone();
      
      // Pause all media elements
      clips.forEach((clip) => {
        const asset = mediaBin.find((a) => a.id === clip.assetId);
        if (!asset || asset.url === 'synthetic') return;

        const el = getMediaElement(asset);
        if (el && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) {
          el.pause();
        }
      });
    }
  }, [isPlaying, playbackSpeed]);

  // Periodic rendering loop for synchronization, time code ticking, and synthetic audio generator
  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsedMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        const prevTime = currentTimeRef.current;
        let nextTime = prevTime + (elapsedMs / 1000) * playbackSpeed;
        
        if (nextTime >= duration) {
          setIsPlaying(false);
          nextTime = 0;
          currentTimeRef.current = 0;
          setCurrentTimeState(0);
        } else {
          currentTimeRef.current = nextTime;
          
          // Throttle React state updates to 15fps (~66ms) to avoid CPU bottleneck
          const now = performance.now();
          if (now - lastStateUpdateRef.current > 66) {
            setCurrentTimeState(nextTime);
            lastStateUpdateRef.current = now;
          }
        }

        // ==========================================
        // SYNTHETIC AUDIO PLAYER ENGINE
        // ==========================================
        
        // Look for any synthetic active audio clips
        const activeAudioClips = clips.filter(
          (c) => c.trackId.startsWith('a') && c.timelineStart <= nextTime && c.timelineEnd >= nextTime
        );

        let shouldPlayTone = false;
        let activeToneTrack = 'a1';
        
        activeAudioClips.forEach((clip) => {
          const clipTime = (nextTime - clip.timelineStart) + clip.sourceStart;
          
          // 1. SMPTE Slate 1000Hz Tone
          if (clip.assetId === 'synth_color_bars') {
            shouldPlayTone = true;
            activeToneTrack = clip.trackId;
          }

          // 2. Film countdown leader beep (exactly at remaining = 2s / clipTime = 6.0s)
          if (clip.assetId === 'synth_countdown') {
            if (clipTime >= 6.0 && clipTime <= 6.18) {
              audioEngine.triggerBeepOnce(clip.trackId, 202, 1000);
            }
          }
        });

        // Toggle oscillator tone for color bars
        if (shouldPlayTone) {
          audioEngine.startTone(activeToneTrack, 1000);
        } else {
          audioEngine.stopTone();
        }

        // Handle sync bounding triggers for regular media elements
        clips.forEach((clip) => {
          const asset = mediaBin.find((a) => a.id === clip.assetId);
          if (!asset || asset.url === 'synthetic') return;
          const el = getMediaElement(asset);
          if (el && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) {
            // Start playing if playhead enters clip
            if (prevTime < clip.timelineStart && nextTime >= clip.timelineStart) {
              el.currentTime = clip.sourceStart;
              el.play().catch(() => {});
            }
            // Stop if playhead exits clip
            if (prevTime <= clip.timelineEnd && nextTime > clip.timelineEnd) {
              el.pause();
            }
          }
        });
      }

      requestRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      lastTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, clips, playbackSpeed, duration, mediaBin]);

  const getCurrentTime = () => currentTimeRef.current;

  // Set local current time directly (Scrubbing / Playhead movement)
  const setCurrentTime = (time: number) => {
    const boundedTime = Math.max(0, Math.min(duration, time));
    currentTimeRef.current = boundedTime;
    setCurrentTimeState(boundedTime);
    lastStateUpdateRef.current = performance.now();
    audioEngine.clearBeeps(); // Reset beep timers

    // If seeking, manually update all native video/audio positions
    clips.forEach((clip) => {
      const asset = mediaBin.find((a) => a.id === clip.assetId);
      if (!asset) return;

      const el = getMediaElement(asset);
      if (el && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) {
        if (boundedTime >= clip.timelineStart && boundedTime <= clip.timelineEnd) {
          const fileTime = (boundedTime - clip.timelineStart) + clip.sourceStart;
          el.currentTime = fileTime;
          if (isPlaying) {
            el.play().catch(() => {});
          }
        } else {
          el.pause();
        }
      }
    });
  };

  const setTool = (newTool: ToolType) => {
    setToolState(newTool);
  };

  // ==========================================
  // MEDIA BIN ACTIONS
  // ==========================================

  const importFileAsset = (name: string, type: 'video' | 'audio' | 'image', url: string, duration: number) => {
    const newAsset: MediaAsset = {
      id: `asset_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name,
      type,
      url,
      duration
    };
    setMediaBin(prev => [...prev, newAsset]);
    setSelectedAssetId(newAsset.id);
  };

  const synthesizeMockAsset = (type: 'bars' | 'leader' | 'synthwave' | 'particles') => {
    const assetsConfig = {
      bars: { id: 'synth_color_bars', name: 'SMPTE Color Slate & Tone.mp4', type: 'video' as const, dur: 12 },
      leader: { id: 'synth_countdown', name: 'Universal Film Leader.mp4', type: 'video' as const, dur: 8 },
      synthwave: { id: 'synth_synthwave', name: 'Neon Synthwave Loop.mp4', type: 'video' as const, dur: 20 },
      particles: { id: 'synth_particles', name: 'Abstract Particles.mp4', type: 'video' as const, dur: 15 }
    };
    const c = assetsConfig[type];
    
    // Check if it already exists, otherwise add it
    if (!mediaBin.some(a => a.id === c.id)) {
      const newAsset: MediaAsset = {
        id: c.id,
        name: c.name,
        type: c.type,
        url: 'synthetic',
        duration: c.dur,
        width: 1920,
        height: 1080
      };
      setMediaBin(prev => [...prev, newAsset]);
    }
    setSelectedAssetId(c.id);
  };

  // ==========================================
  // TIMELINE ACTIONS
  // ==========================================

  const addClipToTimeline = (assetId: string, trackId: string, startTime: number) => {
    const asset = mediaBin.find(a => a.id === assetId);
    if (!asset) return;

    saveHistory();

    const clipDuration = asset.duration > 0 ? asset.duration : 5; // images default 5s
    const isAudioTrack = trackId.startsWith('a');

    // Create unique clip ID
    const baseId = `clip_${Date.now()}`;
    
    // If the asset is a combined video+audio (like leader, color bars, or native files)
    // and they drop on V1, we should automatically drop the matching Audio clip on A1!
    const clipName = asset.name.replace(/\.[^/.]+$/, '');
    
    const newVisualClip: Clip = {
      id: baseId + '_v',
      assetId: asset.id,
      name: clipName + (asset.type === 'video' ? ' [V]' : ' [I]'),
      type: asset.type,
      trackId: isAudioTrack ? 'v1' : trackId,
      timelineStart: startTime,
      timelineEnd: startTime + clipDuration,
      sourceStart: 0,
      sourceDuration: clipDuration,
      positionX: 0,
      positionY: 0,
      scale: 100,
      rotation: 0,
      opacity: 100,
      volume: 100,
      filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
      keyframes: []
    };

    const newAudioClip: Clip = {
      id: baseId + '_a',
      assetId: asset.id,
      name: clipName + ' [A]',
      type: 'audio',
      trackId: isAudioTrack ? trackId : 'a1',
      timelineStart: startTime,
      timelineEnd: startTime + clipDuration,
      sourceStart: 0,
      sourceDuration: clipDuration,
      positionX: 0,
      positionY: 0,
      scale: 100,
      rotation: 0,
      opacity: 100,
      volume: 100,
      filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
      keyframes: []
    };

    let updatedClips = [...clips];
    if (asset.type === 'video') {
      // Add both visual and audio clips
      if (isAudioTrack) {
        updatedClips.push(newAudioClip);
      } else {
        updatedClips.push(newVisualClip);
        // Find matching target audio track (V1 -> A1, V2 -> A2, V3 -> A3)
        const aTrack = trackId === 'v1' ? 'a1' : trackId === 'v2' ? 'a2' : 'a3';
        updatedClips.push({ ...newAudioClip, trackId: aTrack });
      }
    } else if (asset.type === 'audio') {
      updatedClips.push(newAudioClip);
    } else {
      // Image
      updatedClips.push(newVisualClip);
    }

    setClips(updatedClips);
    setSelectedClipId(asset.type === 'audio' ? newAudioClip.id : newVisualClip.id);
  };

  const deleteClip = (clipId: string) => {
    saveHistory();
    setClips(prev => prev.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  const updateClipProperties = (clipId: string, updates: Partial<Clip>) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        return { ...c, ...updates };
      }
      return c;
    }));
  };

  const splitClipAtPlayhead = () => {
    // Find clip under playhead on any track
    // If multiple, split all of them, or the selected one if selected
    const targetClips = clips.filter(c => c.timelineStart < currentTime && c.timelineEnd > currentTime);
    if (targetClips.length === 0) return;

    saveHistory();

    let updatedClips = [...clips];

    targetClips.forEach((clip) => {
      // If a specific clip is selected, only split that one (unless none selected, then split all)
      if (selectedClipId && clip.id !== selectedClipId) return;

      const leftDuration = currentTime - clip.timelineStart;
      const rightDuration = clip.timelineEnd - currentTime;

      const clip1: Clip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: clip.id + '_splitL_' + Date.now(),
        timelineEnd: currentTime,
        sourceDuration: leftDuration
      };

      const clip2: Clip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: clip.id + '_splitR_' + Date.now(),
        timelineStart: currentTime,
        sourceStart: clip.sourceStart + leftDuration,
        sourceDuration: rightDuration
      };

      // Remove parent and add children
      updatedClips = updatedClips.filter(c => c.id !== clip.id);
      updatedClips.push(clip1, clip2);
    });

    setClips(updatedClips);
    setSelectedClipId(null);
  };

  const trimClip = (clipId: string, side: 'left' | 'right', newTime: number) => {
    saveHistory();
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        if (side === 'left') {
          const targetStart = Math.min(c.timelineEnd - 0.2, newTime); // min 0.2s clip duration
          const sourceDelta = targetStart - c.timelineStart;
          
          return {
            ...c,
            timelineStart: targetStart,
            sourceStart: c.sourceStart + sourceDelta,
            sourceDuration: c.timelineEnd - targetStart
          };
        } else {
          const targetEnd = Math.max(c.timelineStart + 0.2, newTime);
          return {
            ...c,
            timelineEnd: targetEnd,
            sourceDuration: targetEnd - c.timelineStart
          };
        }
      }
      return c;
    }));
  };

  // ==========================================
  // TRACK AUDIO ACTIONS
  // ==========================================

  const toggleMuteTrack = (trackId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const nextState = !t.muted;
        if (t.type === 'audio') {
          audioEngine.setTrackVolume(t.id, nextState ? 0 : trackVolumes[t.id]);
        }
        return { ...t, muted: nextState };
      }
      return t;
    }));
  };

  const toggleSoloTrack = (trackId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return { ...t, solo: !t.solo };
      }
      return t;
    }));
  };

  const toggleLockTrack = (trackId: string) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
  };

  const toggleVisibleTrack = (trackId: string) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, visible: !t.visible } : t)));
  };

  const setTrackVolume = (trackId: string, volume: number) => {
    setTrackVolumes(prev => {
      const next = { ...prev, [trackId]: volume };
      // Apply to Web Audio
      const isMuted = tracks.find(t => t.id === trackId)?.muted;
      audioEngine.setTrackVolume(trackId, isMuted ? 0 : volume);
      return next;
    });
  };

  const setMasterVolume = (volume: number) => {
    setMasterVolumeState(volume);
    audioEngine.setMasterVolume(volume);
  };

  // ==========================================
  // KEYFRAME TIMELINE ACTIONS
  // ==========================================

  const togglePropertyKeyframing = (clipId: string, property: KeyframeTrack['property']) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const kfs = c.keyframes || [];
        const exists = kfs.some(t => t.property === property);
        let nextKfs = [...kfs];

        if (exists) {
          // Remove keyframing
          nextKfs = nextKfs.filter(t => t.property !== property);
        } else {
          // Add keyframing: Insert starting keyframe at playhead or clip start
          const clipTime = Math.max(0, currentTime - c.timelineStart);
          
          let initialValue = 100;
          if (property === 'scale') initialValue = c.scale;
          if (property === 'opacity') initialValue = c.opacity;
          if (property === 'rotation') initialValue = c.rotation;
          if (property === 'positionX') initialValue = c.positionX;
          if (property === 'positionY') initialValue = c.positionY;
          if (property === 'volume') initialValue = c.volume;

          nextKfs.push({
            property,
            keyframes: [{
              id: `kf_${Date.now()}`,
              time: clipTime,
              value: initialValue
            }]
          });
        }

        return { ...c, keyframes: nextKfs };
      }
      return c;
    }));
  };

  const addKeyframe = (clipId: string, property: KeyframeTrack['property'], time: number, value: number) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const kfs = c.keyframes || [];
        let nextKfs = kfs.map(track => {
          if (track.property === property) {
            // Check if keyframe already exists at this exact time, if so update it
            const existingIndex = track.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.05);
            let nextKeyframes = [...track.keyframes];
            
            if (existingIndex >= 0) {
              nextKeyframes[existingIndex] = { ...nextKeyframes[existingIndex], value };
            } else {
              nextKeyframes.push({
                id: `kf_${Date.now()}`,
                time,
                value
              });
            }
            // Keep sorted
            nextKeyframes.sort((a, b) => a.time - b.time);
            return { ...track, keyframes: nextKeyframes };
          }
          return track;
        });

        // If track didn't exist, create it
        if (!nextKfs.some(t => t.property === property)) {
          nextKfs.push({
            property,
            keyframes: [{ id: `kf_${Date.now()}`, time, value }]
          });
        }

        return { ...c, keyframes: nextKfs };
      }
      return c;
    }));
  };

  const removeKeyframe = (clipId: string, property: KeyframeTrack['property'], kfId: string) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        const nextKfs = (c.keyframes || []).map(track => {
          if (track.property === property) {
            return {
              ...track,
              keyframes: track.keyframes.filter(kf => kf.id !== kfId)
            };
          }
          return track;
        });
        return { ...c, keyframes: nextKfs };
      }
      return c;
    }));
  };

  return (
    <EditorContext.Provider value={{
      currentTime,
      getCurrentTime,
      duration,
      zoom,
      scrollLeft,
      selectedClipId,
      selectedAssetId,
      tool,
      isPlaying,
      playbackSpeed,
      tracks,
      clips,
      mediaBin,
      sourceInPoint,
      sourceOutPoint,
      snapEnabled,
      playbackResolution,
      safeMarginsEnabled,
      
      setTool,
      setCurrentTime,
      setZoom,
      setScrollLeft,
      setSelectedClipId,
      setSelectedAssetId,
      setPlaying: setIsPlaying,
      setPlaybackSpeed,
      setSnapEnabled,
      setPlaybackResolution,
      setSafeMarginsEnabled,
      
      importFileAsset,
      synthesizeMockAsset,
      
      addClipToTimeline,
      deleteClip,
      updateClipProperties,
      splitClipAtPlayhead,
      trimClip,
      
      toggleMuteTrack,
      toggleSoloTrack,
      toggleLockTrack,
      toggleVisibleTrack,
      setTrackVolume,
      setMasterVolume,
      
      togglePropertyKeyframing,
      addKeyframe,
      removeKeyframe,
      
      undo,
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,

      masterVolume,
      trackVolumes
    }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used inside EditorProvider');
  return context;
};
