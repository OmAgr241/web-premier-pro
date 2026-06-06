import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { formatRulerTime } from '../utils/timecode';
import { 
  Eye, EyeOff, Lock, Unlock, Magnet, 
  ZoomIn, ZoomOut, Scissors
} from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    clips, tracks, currentTime, duration, zoom,
    setZoom, setScrollLeft, setCurrentTime, tool, selectedClipId, 
    setSelectedClipId, trimClip, updateClipProperties, deleteClip,
    splitClipAtPlayhead, snapEnabled, setSnapEnabled, addClipToTimeline,
    toggleMuteTrack, toggleSoloTrack, toggleLockTrack, toggleVisibleTrack,
    getCurrentTime, isPlaying
  } = useEditor();

  const rulerRef = useRef<HTMLDivElement>(null);
  const playheadLineRef = useRef<HTMLDivElement>(null);
  const trackContentRef = useRef<HTMLDivElement>(null);

  // States for timeline dragging operations
  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = useState(false);
  const [dragClipState, setDragClipState] = useState<{
    clipId: string;
    startOffset: number; // offset between mouse down time and clip timelineStart
    initialTrackId: string;
  } | null>(null);

  const [trimClipState, setTrimClipState] = useState<{
    clipId: string;
    side: 'left' | 'right';
    initialTime: number;
  } | null>(null);

  // Keyboard shortcut to delete selected clip (Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          deleteClip(selectedClipId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId]);

  // Smooth playhead animation loop using requestAnimationFrame and direct DOM manipulation
  useEffect(() => {
    const updatePlayhead = () => {
      if (playheadLineRef.current) {
        const time = getCurrentTime();
        playheadLineRef.current.style.left = `${time * zoom}px`;
      }
    };

    // Keep playhead position initial/synced on renders
    updatePlayhead();

    let animationId: number;
    const loop = () => {
      updatePlayhead();
      if (isPlaying) {
        animationId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, zoom, currentTime, getCurrentTime]);

  // Sync scroll positions of ruler and track body
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Convert client coordinate to time in seconds based on zoom
  const getTimeFromX = (clientX: number): number => {
    if (!trackContentRef.current) return 0;
    const rect = trackContentRef.current.getBoundingClientRect();
    const scrollOffset = trackContentRef.current.scrollLeft;
    const x = clientX - rect.left + scrollOffset;
    return Math.max(0, x / zoom);
  };

  // ==========================================
  // PLAYHEAD RULER SCRUBBING
  // ==========================================
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbingPlayhead(true);
    const targetTime = getTimeFromX(e.clientX);
    setCurrentTime(targetTime);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Playhead scrubbing
    if (isScrubbingPlayhead) {
      const targetTime = getTimeFromX(e.clientX);
      setCurrentTime(targetTime);
      return;
    }

    // 2. Drag Clip Repositioning
    if (dragClipState) {
      let targetTime = getTimeFromX(e.clientX) - dragClipState.startOffset;
      const targetClip = clips.find(c => c.id === dragClipState.clipId);
      if (!targetClip) return;

      const clipDur = targetClip.timelineEnd - targetClip.timelineStart;

      // Bound check
      if (targetTime < 0) targetTime = 0;

      // Snapping algorithm: Check against other clips bounds
      if (snapEnabled) {
        const SNAP_THRESHOLD = 0.25; // 250ms threshold
        let snapped = false;

        // Snap start of dragged clip to end of other clips, or playhead
        const otherClips = clips.filter(c => c.id !== targetClip.id);
        
        // Check snap against playhead
        if (Math.abs(targetTime - currentTime) < SNAP_THRESHOLD) {
          targetTime = currentTime;
          snapped = true;
        } else if (Math.abs((targetTime + clipDur) - currentTime) < SNAP_THRESHOLD) {
          targetTime = currentTime - clipDur;
          snapped = true;
        }

        // Check snap against other clips
        if (!snapped) {
          for (const c of otherClips) {
            // Snap left edge of dragged to right edge of c
            if (Math.abs(targetTime - c.timelineEnd) < SNAP_THRESHOLD) {
              targetTime = c.timelineEnd;
              break;
            }
            // Snap right edge of dragged to left edge of c
            if (Math.abs((targetTime + clipDur) - c.timelineStart) < SNAP_THRESHOLD) {
              targetTime = c.timelineStart - clipDur;
              break;
            }
          }
        }
      }

      // Vertical track shift based on mouse vertical offset
      const rect = trackContentRef.current?.getBoundingClientRect();
      if (rect) {
        const y = e.clientY - rect.top;
        // Divide height into 6 lanes (V3 -> V2 -> V1 -> A1 -> A2 -> A3)
        // Heights: track V3 (0-48px), V2 (48-96px), V1 (96-144px), A1 (144-192px), A2 (192-240px), A3 (240-288px)
        const laneIndex = Math.floor(y / 48);
        const order = ['v3', 'v2', 'v1', 'a1', 'a2', 'a3'];
        const targetTrackId = order[Math.max(0, Math.min(order.length - 1, laneIndex))];
        
        // Restrict tracks type check: videos stay in 'v', audio stays in 'a'
        const isVisual = targetClip.type === 'video' || targetClip.type === 'image';
        const isTargetVisual = targetTrackId.startsWith('v');

        if (isVisual === isTargetVisual) {
          updateClipProperties(targetClip.id, {
            timelineStart: targetTime,
            timelineEnd: targetTime + clipDur,
            trackId: targetTrackId
          });
        } else {
          updateClipProperties(targetClip.id, {
            timelineStart: targetTime,
            timelineEnd: targetTime + clipDur
          });
        }
      }
      return;
    }

    // 3. Trimming Clip Margins
    if (trimClipState) {
      const targetTime = getTimeFromX(e.clientX);
      trimClip(trimClipState.clipId, trimClipState.side, targetTime);
      return;
    }
  };

  const handleMouseUp = () => {
    setIsScrubbingPlayhead(false);
    setDragClipState(null);
    setTrimClipState(null);
  };

  useEffect(() => {
    if (isScrubbingPlayhead || dragClipState || trimClipState) {
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isScrubbingPlayhead, dragClipState, trimClipState]);

  // Handle Dragover / Drop from Media Bin
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/plain');
    if (!assetId) return;

    // Detect where dropped (track ID and timestamp)
    const rect = trackContentRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const laneIndex = Math.floor(y / 48);
    const order = ['v3', 'v2', 'v1', 'a1', 'a2', 'a3'];
    const trackId = order[Math.max(0, Math.min(order.length - 1, laneIndex))];

    const dropTime = getTimeFromX(e.clientX);

    addClipToTimeline(assetId, trackId, dropTime);
  };

  // Renders timeline ruler ticks (e.g. 0s, 5s, 10s...)
  const renderRulerTicks = () => {
    const ticks = [];
    const step = zoom < 10 ? 10 : zoom < 20 ? 5 : zoom < 40 ? 2 : 1; // tick interval in seconds
    
    for (let i = 0; i < duration; i += step) {
      ticks.push(
        <div 
          key={i} 
          style={{
            position: 'absolute',
            left: `${i * zoom}px`,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            fontSize: '9px',
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            borderLeft: '1px solid var(--border-color)',
            paddingLeft: '3px',
            paddingBottom: '2px'
          }}
        >
          {formatRulerTime(i)}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="pm-panel" style={{ flex: 1, height: '100%' }}>
      {/* Timeline Controls Header bar */}
      <div className="pm-panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="pm-tab active">Timeline: Sequence 01</div>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button 
              className={`pm-icon-btn ${snapEnabled ? 'active' : ''}`}
              onClick={() => setSnapEnabled(!snapEnabled)}
              title="Toggle Timeline Snap (S)"
              style={{ padding: '3px' }}
            >
              <Magnet size={13} />
            </button>

            {tool === 'razor' && (
              <span style={{ fontSize: '10px', color: '#ff7675', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Scissors size={11} /> Razor Active (Click clip to Cut)
              </span>
            )}
          </div>
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
          <ZoomOut size={12} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="range" 
            className="pm-slider" 
            style={{ width: '60px' }}
            min={4} 
            max={60} 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            title="Timeline Zoom Scale"
          />
          <ZoomIn size={12} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Main Timeline body */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* LEFT COLUMN: Track Controls Headers (M, S, Eye, Lock) */}
        <div style={{
          width: '180px',
          backgroundColor: 'var(--bg-panel-header)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: 10
        }}>
          {/* Spacer corresponding to the Ruler height */}
          <div style={{ height: '28px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#1a1a1c' }} />

          {/* Track Rows (V3 down to A3) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tracks.map((track) => (
              <div 
                key={track.id} 
                style={{
                  height: '48px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  justifyContent: 'space-between',
                  backgroundColor: track.locked ? '#1b1313' : 'transparent'
                }}
              >
                {/* Track Label */}
                <span style={{ fontWeight: 'bold', fontSize: '11px', color: 'white' }}>{track.name}</span>

                {/* Track Icons controls */}
                <div style={{ display: 'flex', gap: '3px' }}>
                  {track.type === 'video' ? (
                    <button 
                      className={`pm-icon-btn ${track.visible ? '' : 'active'}`}
                      onClick={() => toggleVisibleTrack(track.id)}
                      title={track.visible ? "Hide Track Visuals" : "Show Track Visuals"}
                      style={{ padding: '4px' }}
                    >
                      {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  ) : (
                    <>
                      <button 
                        className={`track-action-btn ${track.muted ? 'active-mute' : ''}`}
                        onClick={() => toggleMuteTrack(track.id)}
                        title="Mute Audio Track"
                      >
                        M
                      </button>
                      <button 
                        className={`track-action-btn ${track.solo ? 'active-solo' : ''}`}
                        onClick={() => toggleSoloTrack(track.id)}
                        title="Solo Audio Track"
                      >
                        S
                      </button>
                    </>
                  )}

                  <button 
                    className={`pm-icon-btn ${track.locked ? 'active' : ''}`}
                    onClick={() => toggleLockTrack(track.id)}
                    title={track.locked ? "Unlock Track" : "Lock Track"}
                    style={{ padding: '4px' }}
                  >
                    {track.locked ? <Lock size={11} style={{ color: '#ff7675' }} /> : <Unlock size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Ruler + Tracks Clip lane content (Scrollable) */}
        <div 
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            backgroundColor: '#131314',
            position: 'relative'
          }}
        >
          {/* Scroll container matching sequence width */}
          <div style={{
            width: `${duration * zoom}px`,
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 1. Time ruler scrub bar */}
            <div 
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              onMouseMove={handleMouseMove}
              style={{
                height: '28px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#1b1b1d',
                cursor: 'ew-resize',
                position: 'relative',
                width: '100%',
                flexShrink: 0
              }}
            >
              {renderRulerTicks()}
            </div>

            {/* 2. Tracks content block container (Droppable) */}
            <div
              ref={trackContentRef}
              onMouseMove={handleMouseMove}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                position: 'relative',
                backgroundImage: 'linear-gradient(to right, #1f1f21 1px, transparent 1px)',
                backgroundSize: `${zoom}px 100%` // Vertical grid lines at every 1s
              }}
            >
              {/* Vertical Playhead Line running through fader content */}
              <div 
                ref={playheadLineRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  backgroundColor: '#00d2d3',
                  boxShadow: '0 0 8px #00d2d3',
                  zIndex: 200,
                  pointerEvents: 'none'
                }}
              >
                {/* Playhead marker head flag */}
                <div style={{
                  position: 'absolute',
                  top: '-28px', // offset back onto ruler
                  left: '-6px',
                  width: '13px',
                  height: '13px',
                  backgroundColor: '#00d2d3',
                  clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)',
                  cursor: 'ew-resize'
                }} />
              </div>

              {/* Lane Render Loops */}
              {tracks.map((track) => (
                <div 
                  key={track.id} 
                  style={{
                    height: '48px',
                    borderBottom: '1px solid var(--border-color)',
                    position: 'relative',
                    width: '100%',
                    backgroundColor: track.locked ? 'rgba(255,0,0,0.02)' : 'transparent'
                  }}
                >
                  {/* Clip Block elements drawn inside this lane */}
                  {clips
                    .filter(c => c.trackId === track.id)
                    .map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const width = (clip.timelineEnd - clip.timelineStart) * zoom;
                      const left = clip.timelineStart * zoom;
                      
                      // Assign color scheme
                      let bg = 'var(--color-video-clip)';
                      if (clip.type === 'audio') bg = 'var(--color-audio-clip)';
                      if (clip.type === 'image') bg = 'var(--color-image-clip)';
                      if (clip.textConfig) bg = 'var(--color-text-clip)';
                      
                      const isLocked = track.locked;

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tool === 'razor') {
                              splitClipAtPlayhead();
                            } else {
                              setSelectedClipId(clip.id);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                          }}
                          onMouseDown={(e) => {
                            if (tool !== 'select' || isLocked) return;
                            
                            // Check if clicking trim handle edges
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const HANDLE_WIDTH = 8;

                            if (x < HANDLE_WIDTH) {
                              e.stopPropagation();
                              setTrimClipState({
                                clipId: clip.id,
                                side: 'left',
                                initialTime: clip.timelineStart
                              });
                            } else if (x > rect.width - HANDLE_WIDTH) {
                              e.stopPropagation();
                              setTrimClipState({
                                clipId: clip.id,
                                side: 'right',
                                initialTime: clip.timelineEnd
                              });
                            } else {
                              // Regular click and drag clip move
                              e.stopPropagation();
                              const clickTime = getTimeFromX(e.clientX);
                              setDragClipState({
                                clipId: clip.id,
                                startOffset: clickTime - clip.timelineStart,
                                initialTrackId: clip.trackId
                              });
                              setSelectedClipId(clip.id);
                            }
                          }}
                          style={{
                            position: 'absolute',
                            left: `${left}px`,
                            width: `${width}px`,
                            height: '38px',
                            top: '5px',
                            backgroundColor: bg,
                            border: isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
                            borderRadius: '3px',
                            cursor: tool === 'razor' ? 'cell' : isLocked ? 'not-allowed' : 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            color: clip.type === 'audio' ? 'white' : 'black',
                            fontSize: '10px',
                            fontWeight: 600,
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                            opacity: isLocked ? 0.6 : 1
                          }}
                        >
                          {/* Left Trim Handle Graphic bar */}
                          {!isLocked && (
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '5px',
                              cursor: 'col-resize',
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              borderRight: '1px solid rgba(0,0,0,0.2)'
                            }} />
                          )}

                          {/* Label */}
                          <span style={{
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            padding: '0 4px',
                            pointerEvents: 'none'
                          }}>
                            {clip.name}
                          </span>

                          {/* Right Trim Handle Graphic bar */}
                          {!isLocked && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '5px',
                              cursor: 'col-resize',
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              borderLeft: '1px solid rgba(0,0,0,0.2)'
                            }} />
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
