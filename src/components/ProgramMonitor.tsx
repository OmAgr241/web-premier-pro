import { useRef, useEffect, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { formatTimecode } from '../utils/timecode';
import { renderCanvasFrame } from '../utils/renderEngine';
import { 
  Play, Pause, SkipBack, ChevronLeft, ChevronRight, LayoutGrid
} from 'lucide-react';

export const ProgramMonitor: React.FC = () => {
  const {
    currentTime, isPlaying, setPlaying, clips, mediaBin, duration,
    playbackResolution, setPlaybackResolution,
    safeMarginsEnabled, setSafeMarginsEnabled,
    setCurrentTime, tool, selectedClipId, setSelectedClipId, deleteClip
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoomLevel, setZoomLevel] = useState<string>('fit');
  const [canvasDimensions, setCanvasDimensions] = useState({ w: 480, h: 270 });
  const [isEditingText, setIsEditingText] = useState(false);
  const [textInputVal, setTextInputVal] = useState('');
  const [textCoords, setTextCoords] = useState({ x: 50, y: 50 });

  // Update canvas sizing based on fit zoom setting
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const cW = container.clientWidth - 20;
      const cH = container.clientHeight - 20;

      // 16:9 ratio fit
      let w = cW;
      let h = cW / (16 / 9);

      if (h > cH) {
        h = cH;
        w = cH * (16 / 9);
      }

      if (zoomLevel === '100%') {
        w = 1280;
        h = 720;
      } else if (zoomLevel === '50%') {
        w = 640;
        h = 360;
      } else if (zoomLevel === '25%') {
        w = 320;
        h = 180;
      }

      setCanvasDimensions({ w, h });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomLevel]);

  // Main compilation renderer tick triggered by requestAnimationFrame
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw composite frame
      renderCanvasFrame(ctx, currentTime, clips, mediaBin, {
        width: canvas.width,
        height: canvas.height,
        isPlaying,
        resolution: playbackResolution,
        safeMargins: safeMarginsEnabled
      });
    };

    // Trigger render frame on timeline tick
    render();

    // Set up rapid loop if playing
    let animationId: number;
    const run = () => {
      render();
      if (isPlaying) {
        animationId = requestAnimationFrame(run);
      }
    };
    if (isPlaying) {
      animationId = requestAnimationFrame(run);
    }
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [currentTime, clips, mediaBin, isPlaying, canvasDimensions, playbackResolution, safeMarginsEnabled]);

  // Keyboard controls for frame step (Left/Right arrow) and Play/Pause (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.033; // 1s vs 1 frame (30fps)
        setCurrentTime(currentTime - step);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.033;
        setCurrentTime(currentTime + step);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          deleteClip(selectedClipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, selectedClipId]);

  // Handle on-screen Canvas Click (Specifically text tool)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'text') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Prompt user to enter text style
    setTextCoords({ x: xPct, y: yPct });
    setIsEditingText(true);
    setTextInputVal('Double Click to Edit Text');
  };

  const submitText = () => {
    setIsEditingText(false);
    if (!textInputVal.trim()) return;

    // Create a new text overlay clip or update selected clip text
    // Create custom text clip: add on V3 at playhead time for 5 seconds duration
    // Using ID of 'synth_particles' (empty composite template) as asset foundation
    const textClipId = `clip_text_${Date.now()}`;
    const newTextClip = {
      id: textClipId,
      assetId: 'synth_particles',
      name: 'Dynamic Text Overlay',
      type: 'video' as const,
      trackId: 'v3',
      timelineStart: currentTime,
      timelineEnd: Math.min(duration, currentTime + 5),
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
        text: textInputVal,
        fontSize: 36,
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        x: textCoords.x,
        y: textCoords.y,
        fontFamily: 'Inter'
      }
    };

    // Push new clip to context via updating the list
    clips.push(newTextClip);
    setSelectedClipId(textClipId);
  };

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header" style={{ justifyContent: 'space-between' }}>
        <div className="pm-tab active">Program: (Sequence Monitor)</div>
        
        {/* Layout Monitor Controls */}
        <div style={{ display: 'flex', gap: '8px', paddingRight: '8px', alignItems: 'center' }}>
          {/* Zoom Level Select */}
          <select 
            value={zoomLevel} 
            onChange={(e) => setZoomLevel(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '10px',
              padding: '2px 4px',
              borderRadius: '3px',
              outline: 'none'
            }}
          >
            <option value="fit">Fit</option>
            <option value="100%">100%</option>
            <option value="50%">50%</option>
            <option value="25%">25%</option>
          </select>

          {/* Resolution select */}
          <select 
            value={playbackResolution} 
            onChange={(e) => setPlaybackResolution(parseFloat(e.target.value) as 1 | 0.5 | 0.25)}
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '10px',
              padding: '2px 4px',
              borderRadius: '3px',
              outline: 'none'
            }}
            title="Playback Resolution"
          >
            <option value={1}>Full</option>
            <option value={0.5}>1/2</option>
            <option value={0.25}>1/4</option>
          </select>

          {/* Safe Margins toggle */}
          <button 
            className={`pm-icon-btn ${safeMarginsEnabled ? 'active' : ''}`}
            onClick={() => setSafeMarginsEnabled(!safeMarginsEnabled)}
            title="Toggle Safe Margins Guide"
            style={{ padding: '3px' }}
          >
            <LayoutGrid size={12} />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="pm-panel-body" 
        style={{
          backgroundColor: '#0d0d0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '10px'
        }}
      >
        {/* Real Monitor Player Canvas */}
        <div style={{
          position: 'relative',
          width: `${canvasDimensions.w}px`,
          height: `${canvasDimensions.h}px`,
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.6)',
          border: '1px solid #1c1c1e',
          cursor: tool === 'text' ? 'text' : 'default'
        }}>
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              backgroundColor: '#000'
            }}
          />

          {/* Text editor input modal overlay */}
          {isEditingText && (
            <div style={{
              position: 'absolute',
              top: `${textCoords.y}%`,
              left: `${textCoords.x}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              backgroundColor: 'rgba(20,20,22,0.95)',
              padding: '6px',
              border: '1px solid var(--accent-color)',
              borderRadius: '4px',
              zIndex: 100
            }}>
              <input 
                type="text" 
                value={textInputVal}
                onChange={(e) => setTextInputVal(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitText();
                  if (e.key === 'Escape') setIsEditingText(false);
                }}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  outline: 'none',
                  minWidth: '160px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                <button className="pm-btn" onClick={() => setIsEditingText(false)} style={{ fontSize: '9px', padding: '2px 6px' }}>Cancel</button>
                <button className="pm-btn primary" onClick={submitText} style={{ fontSize: '9px', padding: '2px 6px' }}>Apply</button>
              </div>
            </div>
          )}
        </div>

        {/* Center player time indicators */}
        <div style={{
          display: 'flex',
          width: '100%',
          maxWidth: `${canvasDimensions.w}px`,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: 'var(--text-secondary)'
        }}>
          <span className="timecode-display blue" style={{ fontSize: '13px', padding: '1px 6px' }}>
            {formatTimecode(currentTime)}
          </span>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>FIT FRAME</span>
          </div>

          <span style={{ color: 'var(--text-muted)' }}>
            Total: {formatTimecode(duration)}
          </span>
        </div>

        {/* Video Playback controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-panel-header)',
          padding: '6px 14px',
          borderRadius: '20px',
          marginTop: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <button 
            className="pm-icon-btn" 
            onClick={() => setCurrentTime(0)}
            title="Go to Start (Home)"
          >
            <SkipBack size={14} />
          </button>
          
          <button 
            className="pm-icon-btn" 
            onClick={() => setCurrentTime(currentTime - 0.033)}
            title="Step Back 1 Frame (Left Arrow)"
          >
            <ChevronLeft size={14} />
          </button>
          
          <button 
            className="pm-icon-btn active" 
            onClick={() => setPlaying(!isPlaying)}
            title="Play/Pause (Space)"
            style={{
              backgroundColor: isPlaying ? 'rgba(20, 115, 230, 0.2)' : 'transparent',
              color: isPlaying ? 'var(--accent-color)' : 'var(--text-primary)',
              borderRadius: '50%',
              padding: '6px'
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button 
            className="pm-icon-btn" 
            onClick={() => setCurrentTime(currentTime + 0.033)}
            title="Step Forward 1 Frame (Right Arrow)"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
