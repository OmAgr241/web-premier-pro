import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { formatTimecode } from '../utils/timecode';
import { renderCanvasFrame } from '../utils/renderEngine';
import { Play, Pause, ArrowDown, Film } from 'lucide-react';

export const SourceMonitor: React.FC = () => {
  const { 
    mediaBin, selectedAssetId, addClipToTimeline, currentTime: timelinePlayhead 
  } = useEditor();

  const asset = mediaBin.find((a) => a.id === selectedAssetId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourcePlayhead, setSourcePlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Mark In/Out points
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Sync rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mockClip = {
      id: 'mock_source_preview',
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      trackId: 'v1',
      timelineStart: 0,
      timelineEnd: asset.duration || 5,
      sourceStart: 0,
      sourceDuration: asset.duration || 5,
      positionX: 0,
      positionY: 0,
      scale: 100,
      rotation: 0,
      opacity: 100,
      volume: 100,
      filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 100, contrast: 100, hueRotate: 0, saturate: 100 },
      keyframes: []
    };

    renderCanvasFrame(ctx, sourcePlayhead, [mockClip], [asset], {
      width: canvas.width,
      height: canvas.height,
      isPlaying: false, // Maintain manual seek
      resolution: 0.5,
      safeMargins: false
    });
  }, [asset, sourcePlayhead]);

  // Source playback loop
  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && asset && asset.duration > 0) {
        setSourcePlayhead((prev) => {
          let next = prev + elapsed;
          if (next >= asset.duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
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
  }, [isPlaying, asset]);

  // Keyboard hooks for Source Monitor In/Out (I and O keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing text (e.g. typing overlays)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'i') {
        setInPoint(sourcePlayhead);
      } else if (e.key.toLowerCase() === 'o') {
        setOutPoint(sourcePlayhead);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourcePlayhead]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSourcePlayhead(parseFloat(e.target.value));
  };

  const handleInsert = () => {
    if (!asset) return;
    
    // Add clip on V1 or A1 depending on asset type
    const trackId = asset.type === 'audio' ? 'a1' : 'v1';
    
    // In Premiere, inserting places the clip at the current playhead
    // We insert the duration specified by in/out points (or full asset if not specified)
    addClipToTimeline(asset.id, trackId, timelinePlayhead);
  };

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header">
        <div className="pm-tab active">Source: (Clip Monitor)</div>
      </div>
      
      <div className="pm-panel-body" style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#161618',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px'
      }}>
        {asset ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Monitor Screen */}
            <div style={{
              flex: 1,
              backgroundColor: '#000',
              position: 'relative',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {asset.type === 'audio' ? (
                <div style={{ color: 'var(--accent-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Audio Source Waveform</span>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '40px' }}>
                    {[20, 40, 15, 60, 30, 80, 45, 90, 50, 20, 10, 40, 70, 30].map((h, i) => (
                      <div key={i} style={{ width: '3px', height: `${h}%`, backgroundColor: '#007aff', borderRadius: '1px' }} />
                    ))}
                  </div>
                </div>
              ) : (
                <canvas 
                  ref={canvasRef} 
                  width={384} 
                  height={216}
                  style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', aspectRatio: '16/9' }}
                />
              )}

              {/* Title overlay */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                color: 'var(--text-secondary)'
              }}>
                Source: {asset.name}
              </div>
            </div>

            {/* Time Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '8px 0 2px 0',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Playhead: <span style={{ color: 'var(--accent-color)' }}>{formatTimecode(sourcePlayhead)}</span>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {inPoint !== null && outPoint !== null ? (
                  <span>In-Out: {((outPoint - inPoint)).toFixed(2)}s</span>
                ) : (
                  <span>Duration: {asset.duration.toFixed(2)}s</span>
                )}
              </span>
            </div>

            {/* Sub-Timeline Ruler Slider */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
              <input 
                type="range"
                className="pm-slider"
                min={0}
                max={asset.duration || 5}
                step={0.03}
                value={sourcePlayhead}
                onChange={handleSliderChange}
              />
              
              {/* Mark In overlay */}
              {inPoint !== null && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: `${(inPoint / asset.duration) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#00d2d3'
                }}>
                  {'{'}
                </div>
              )}

              {/* Mark Out overlay */}
              {outPoint !== null && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: `${(outPoint / asset.duration) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#ff7675'
                }}>
                  {'}'}
                </div>
              )}
            </div>

            {/* Source Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-panel-header)',
              padding: '4px',
              borderRadius: '4px'
            }}>
              <button 
                className={`pm-icon-btn ${isPlaying ? 'active' : ''}`}
                onClick={() => setIsPlaying(!isPlaying)}
                title="Play/Pause Source"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>

              <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              <button 
                className="pm-btn"
                onClick={() => setInPoint(sourcePlayhead)}
                style={{ fontSize: '10px', padding: '3px 8px' }}
                title="Mark In Point (I)"
              >
                Mark In ({'{'})
              </button>

              <button 
                className="pm-btn"
                onClick={() => setOutPoint(sourcePlayhead)}
                style={{ fontSize: '10px', padding: '3px 8px' }}
                title="Mark Out Point (O)"
              >
                Mark Out ({'}'})
              </button>

              <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              <button 
                className="pm-btn primary"
                onClick={handleInsert}
                style={{ fontSize: '10px', padding: '3px 12px' }}
                title="Insert range to timeline (,)"
              >
                <ArrowDown size={12} style={{ marginRight: '3px' }} />
                Insert to Timeline
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            <Film size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <span>No asset selected.</span>
            <span style={{ fontSize: '10px', marginTop: '4px' }}>
              Select a media file from the Media Bin to view details.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
