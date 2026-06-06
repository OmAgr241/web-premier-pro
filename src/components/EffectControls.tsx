import React from 'react';
import { useEditor } from '../context/EditorContext';
import type { Clip, KeyframeTrack } from '../types/editor';
import { Sliders, Plus, Watch, Video, Music, Type } from 'lucide-react';

export const EffectControls: React.FC = () => {
  const { 
    clips, selectedClipId, updateClipProperties, currentTime,
    togglePropertyKeyframing, addKeyframe, removeKeyframe 
  } = useEditor();

  const clip = clips.find(c => c.id === selectedClipId);

  const handlePropertyChange = (property: keyof Clip, val: any) => {
    if (!clip) return;
    updateClipProperties(clip.id, { [property]: val });
  };

  const handleFilterChange = (filterKey: string, val: number) => {
    if (!clip) return;
    updateClipProperties(clip.id, {
      filters: {
        ...clip.filters,
        [filterKey]: val
      }
    });
  };

  const handleTextConfigChange = (textKey: string, val: any) => {
    if (!clip || !clip.textConfig) return;
    updateClipProperties(clip.id, {
      textConfig: {
        ...clip.textConfig,
        [textKey]: val
      }
    });
  };

  // Helper to check if property has keyframing active
  const isKeyframing = (property: KeyframeTrack['property']) => {
    if (!clip) return false;
    return clip.keyframes?.some(t => t.property === property) || false;
  };

  // Helper to add keyframe at playhead for a property
  const handleAddKeyframe = (property: KeyframeTrack['property']) => {
    if (!clip) return;
    const clipTime = Math.max(0, currentTime - clip.timelineStart);
    
    // Evaluate current value of property
    let currentVal = 100;
    if (property === 'scale') currentVal = clip.scale;
    if (property === 'opacity') currentVal = clip.opacity;
    if (property === 'rotation') currentVal = clip.rotation;
    if (property === 'positionX') currentVal = clip.positionX;
    if (property === 'positionY') currentVal = clip.positionY;
    if (property === 'volume') currentVal = clip.volume;

    addKeyframe(clip.id, property, clipTime, currentVal);
  };

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header">
        <div className="pm-tab active">Effect Controls</div>
      </div>
      
      <div className="pm-panel-body" style={{ backgroundColor: '#1e1e20', padding: '10px', fontSize: '12px' }}>
        {clip ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header metadata */}
            <div style={{
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <span style={{ fontWeight: 'bold', color: 'white' }}>{clip.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Timeline Span: {clip.timelineStart.toFixed(2)}s to {clip.timelineEnd.toFixed(2)}s
              </span>
            </div>

            {/* Video Motion Transforms */}
            {(clip.type === 'video' || clip.type === 'image') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontWeight: 600 }}>
                  <Video size={13} />
                  <span>Motion Transforms</span>
                </div>

                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Scale */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Scale</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Stopwatch keyframe toggle button */}
                        <button 
                          className={`pm-icon-btn ${isKeyframing('scale') ? 'active' : ''}`}
                          onClick={() => togglePropertyKeyframing(clip.id, 'scale')}
                          title="Toggle Keyframing (Stopwatch)"
                          style={{ padding: '2px' }}
                        >
                          <Watch size={12} />
                        </button>
                        {isKeyframing('scale') && (
                          <button 
                            className="pm-icon-btn"
                            onClick={() => handleAddKeyframe('scale')}
                            title="Add Keyframe at Playhead"
                            style={{ padding: '2px' }}
                          >
                            <Plus size={12} />
                          </button>
                        )}
                        <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.scale)}%</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={10} 
                      max={400} 
                      value={clip.scale} 
                      onChange={(e) => handlePropertyChange('scale', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Position X */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Position X</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          className={`pm-icon-btn ${isKeyframing('positionX') ? 'active' : ''}`}
                          onClick={() => togglePropertyKeyframing(clip.id, 'positionX')}
                          style={{ padding: '2px' }}
                        >
                          <Watch size={12} />
                        </button>
                        {isKeyframing('positionX') && (
                          <button className="pm-icon-btn" onClick={() => handleAddKeyframe('positionX')} style={{ padding: '2px' }}><Plus size={12}/></button>
                        )}
                        <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.positionX)}px</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={-960} 
                      max={960} 
                      value={clip.positionX} 
                      onChange={(e) => handlePropertyChange('positionX', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Position Y */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Position Y</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          className={`pm-icon-btn ${isKeyframing('positionY') ? 'active' : ''}`}
                          onClick={() => togglePropertyKeyframing(clip.id, 'positionY')}
                          style={{ padding: '2px' }}
                        >
                          <Watch size={12} />
                        </button>
                        {isKeyframing('positionY') && (
                          <button className="pm-icon-btn" onClick={() => handleAddKeyframe('positionY')} style={{ padding: '2px' }}><Plus size={12}/></button>
                        )}
                        <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.positionY)}px</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={-540} 
                      max={540} 
                      value={clip.positionY} 
                      onChange={(e) => handlePropertyChange('positionY', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Rotation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rotation</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          className={`pm-icon-btn ${isKeyframing('rotation') ? 'active' : ''}`}
                          onClick={() => togglePropertyKeyframing(clip.id, 'rotation')}
                          style={{ padding: '2px' }}
                        >
                          <Watch size={12} />
                        </button>
                        {isKeyframing('rotation') && (
                          <button className="pm-icon-btn" onClick={() => handleAddKeyframe('rotation')} style={{ padding: '2px' }}><Plus size={12}/></button>
                        )}
                        <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.rotation)}°</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={-360} 
                      max={360} 
                      value={clip.rotation} 
                      onChange={(e) => handlePropertyChange('rotation', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Opacity */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Opacity</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          className={`pm-icon-btn ${isKeyframing('opacity') ? 'active' : ''}`}
                          onClick={() => togglePropertyKeyframing(clip.id, 'opacity')}
                          style={{ padding: '2px' }}
                        >
                          <Watch size={12} />
                        </button>
                        {isKeyframing('opacity') && (
                          <button className="pm-icon-btn" onClick={() => handleAddKeyframe('opacity')} style={{ padding: '2px' }}><Plus size={12}/></button>
                        )}
                        <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.opacity)}%</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={0} 
                      max={100} 
                      value={clip.opacity} 
                      onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Video Filters / Colors Grading */}
            {(clip.type === 'video' || clip.type === 'image') && clip.filters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#af52de', fontWeight: 600 }}>
                  <Sliders size={13} />
                  <span>Color Grading & Filters</span>
                </div>
                
                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Grayscale */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Grayscale</span>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      style={{ width: '90px' }}
                      min={0} max={100} value={clip.filters.grayscale}
                      onChange={(e) => handleFilterChange('grayscale', parseInt(e.target.value))}
                    />
                  </div>

                  {/* Sepia */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sepia</span>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      style={{ width: '90px' }}
                      min={0} max={100} value={clip.filters.sepia}
                      onChange={(e) => handleFilterChange('sepia', parseInt(e.target.value))}
                    />
                  </div>

                  {/* Blur */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Blur</span>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      style={{ width: '90px' }}
                      min={0} max={25} value={clip.filters.blur}
                      onChange={(e) => handleFilterChange('blur', parseInt(e.target.value))}
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hue Shift</span>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      style={{ width: '90px' }}
                      min={0} max={360} value={clip.filters.hueRotate}
                      onChange={(e) => handleFilterChange('hueRotate', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Audio Volume Controls */}
            {clip.type === 'audio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007aff', fontWeight: 600 }}>
                  <Music size={13} />
                  <span>Audio Level Controls</span>
                </div>

                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Volume Level</span>
                    <span style={{ fontFamily: 'monospace', color: '#ffb300' }}>{Math.round(clip.volume)}%</span>
                  </div>
                  <input 
                    type="range" 
                    className="pm-slider" 
                    min={0} 
                    max={200} 
                    value={clip.volume} 
                    onChange={(e) => handlePropertyChange('volume', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Text Overlay Configuration */}
            {clip.textConfig && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-clip)', fontWeight: 600 }}>
                  <Type size={13} />
                  <span>Text Overlay Styling</span>
                </div>

                <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Raw Text Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Text Value</span>
                    <input 
                      type="text" 
                      value={clip.textConfig.text} 
                      onChange={(e) => handleTextConfigChange('text', e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'white',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Font Size slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Font Size</span>
                      <span style={{ fontFamily: 'monospace' }}>{clip.textConfig.fontSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      min={10} max={120} value={clip.textConfig.fontSize} 
                      onChange={(e) => handleTextConfigChange('fontSize', parseInt(e.target.value))}
                    />
                  </div>

                  {/* Fonts family selection */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Font Family</span>
                    <select 
                      value={clip.textConfig.fontFamily} 
                      onChange={(e) => handleTextConfigChange('fontFamily', e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        color: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '3px',
                        padding: '2px 4px'
                      }}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Serif</option>
                      <option value="Courier New">Courier</option>
                      <option value="Impact">Impact</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                  </div>

                  {/* Colors */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fill Color</span>
                    <input 
                      type="color" 
                      value={clip.textConfig.color} 
                      onChange={(e) => handleTextConfigChange('color', e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '24px', height: '24px', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Stroke settings */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Stroke Width</span>
                    <input 
                      type="range" 
                      className="pm-slider" 
                      style={{ width: '80px' }}
                      min={0} max={10} value={clip.textConfig.strokeWidth} 
                      onChange={(e) => handleTextConfigChange('strokeWidth', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Keyframes details list */}
            {clip.keyframes && clip.keyframes.length > 0 && (
              <div style={{
                marginTop: '6px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '8px'
              }}>
                <span style={{ fontWeight: 'bold', color: 'white', display: 'block', marginBottom: '6px' }}>
                  Keyframe Editor Graph
                </span>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  backgroundColor: '#131314',
                  borderRadius: '4px',
                  padding: '4px'
                }}>
                  {clip.keyframes.map((track) => (
                    <div key={track.property} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '2px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-color)', fontSize: '10px' }}>
                        {track.property.toUpperCase()} ({track.keyframes.length} keyframes)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {track.keyframes.map((kf) => (
                          <div 
                            key={kf.id}
                            style={{
                              backgroundColor: 'var(--bg-panel-header)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 4px',
                              borderRadius: '2px',
                              fontSize: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontFamily: 'monospace'
                            }}
                          >
                            <span>T+{kf.time.toFixed(1)}s</span>
                            <span style={{ color: '#ffb300' }}>Val: {Math.round(kf.value)}</span>
                            <button 
                              onClick={() => removeKeyframe(clip.id, track.property, kf.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ff7675',
                                cursor: 'pointer'
                              }}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px'
          }}>
            <Sliders size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <span>No clip selected.</span>
            <span style={{ fontSize: '10px', marginTop: '4px' }}>
              Select / double-click a clip on the timeline to inspect its Motion and Effect parameters.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
