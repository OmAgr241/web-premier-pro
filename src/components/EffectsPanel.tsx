import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { Sparkles, Wand2, Search } from 'lucide-react';

export const EffectsPanel: React.FC = () => {
  const { updateClipProperties, selectedClipId } = useEditor();
  const [searchQuery, setSearchQuery] = useState('');

  const transitions = [
    { id: 'cross-dissolve', name: 'Cross Dissolve', desc: 'Standard smooth opacity blend' },
    { id: 'dip-to-black', name: 'Dip to Black', desc: 'Fades visual to black slate' },
    { id: 'slide-left', name: 'Slide Left Wipe', desc: 'Sliding overlay horizontal transition' }
  ];

  const presets = [
    { id: 'noir', name: 'Classic Noir (Grayscale)', filters: { grayscale: 100, sepia: 0, invert: 0, blur: 0, brightness: 90, contrast: 130, hueRotate: 0, saturate: 0 } },
    { id: 'vintage', name: 'Warm Vintage (Sepia)', filters: { grayscale: 20, sepia: 80, invert: 0, blur: 0, brightness: 100, contrast: 90, hueRotate: 0, saturate: 80 } },
    { id: 'cyberpunk', name: 'Cyberpunk (Hue Shift)', filters: { grayscale: 0, sepia: 0, invert: 0, blur: 0, brightness: 110, contrast: 120, hueRotate: 290, saturate: 160 } },
    { id: 'dreamy', name: 'Dreamy Glow (Soft Blur)', filters: { grayscale: 0, sepia: 10, invert: 0, blur: 4, brightness: 110, contrast: 100, hueRotate: 0, saturate: 120 } }
  ];

  const applyTransition = (type: 'cross-dissolve' | 'dip-to-black' | 'slide-left') => {
    if (!selectedClipId) {
      alert("Please select a timeline clip first to apply the transition!");
      return;
    }
    updateClipProperties(selectedClipId, {
      transition: {
        type,
        duration: 1.2, // 1.2s default transition
        position: 'start'
      }
    });
  };

  const applyPreset = (filters: any) => {
    if (!selectedClipId) {
      alert("Please select a timeline clip first to apply the filter preset!");
      return;
    }
    updateClipProperties(selectedClipId, { filters });
  };

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header">
        <div className="pm-tab active">Effects & Presets</div>
      </div>

      <div className="pm-panel-body" style={{ backgroundColor: '#18181a', padding: '10px', fontSize: '11px' }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          marginBottom: '10px'
        }}>
          <input 
            type="text" 
            placeholder="Search Effects..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '4px 6px 4px 22px',
              borderRadius: '4px',
              outline: 'none',
              fontSize: '11px'
            }}
          />
          <Search size={11} style={{ position: 'absolute', left: '6px', top: '7px', color: 'var(--text-muted)' }} />
        </div>

        {/* Video Transitions Section */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffb300', fontWeight: 'bold', marginBottom: '6px' }}>
            <Sparkles size={11} />
            <span>Video Transitions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {transitions
              .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(t => (
                <div 
                  key={t.id}
                  onClick={() => applyTransition(t.id as any)}
                  style={{
                    backgroundColor: '#202022',
                    border: '1px solid #2d2d30',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background-color 0.15s'
                  }}
                  className="hover-preset"
                  title="Click to apply to selected clip start"
                >
                  <span style={{ fontWeight: 'bold', color: 'white' }}>{t.name}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{t.desc}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Filter Presets Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#af52de', fontWeight: 'bold', marginBottom: '6px' }}>
            <Wand2 size={11} />
            <span>Color LUT / Filter Presets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {presets
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(p => (
                <div 
                  key={p.id}
                  onClick={() => applyPreset(p.filters)}
                  style={{
                    backgroundColor: '#202022',
                    border: '1px solid #2d2d30',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s'
                  }}
                  className="hover-preset"
                  title="Click to apply LUT to selected clip"
                >
                  <span style={{ fontWeight: 'bold', color: 'white' }}>{p.name}</span>
                  <span style={{ fontSize: '8px', color: '#00c6ff', border: '1px solid #00c6ff', padding: '1px 3px', borderRadius: '3px' }}>LUT</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
