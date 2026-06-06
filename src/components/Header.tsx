import React, { useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { formatTimecode } from '../utils/timecode';
import { Undo2, Redo2, Download, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenExport }) => {
  const { 
    currentTime, isPlaying, undo, redo, canUndo, canRedo, 
    importFileAsset, synthesizeMockAsset 
  } = useEditor();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      
      let type: 'video' | 'audio' | 'image' = 'image';
      if (isVideo) type = 'video';
      if (isAudio) type = 'audio';
      
      if (isVideo || isAudio) {
        // Find media duration dynamically
        const el = document.createElement(isVideo ? 'video' : 'audio');
        el.src = url;
        el.addEventListener('loadedmetadata', () => {
          importFileAsset(file.name, type, url, el.duration);
        });
      } else if (isImage) {
        importFileAsset(file.name, 'image', url, 0); // 0 duration for images
      }
    });
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--bg-app)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '13px'
    }}>
      {/* Brand & Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          backgroundColor: '#1473e6',
          color: 'white',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          letterSpacing: '0.05em',
          fontFamily: 'monospace'
        }}>
          Pr
        </div>
        
        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)' }}>
          {['File', 'Edit', 'Clip', 'Sequence', 'Marker', 'Graphics', 'Help'].map((menu) => (
            <span 
              key={menu} 
              className="hover-menu-item"
              style={{ cursor: 'pointer', transition: 'color 0.15s' }}
              onClick={() => {
                if (menu === 'File') {
                  fileInputRef.current?.click();
                } else if (menu === 'Help') {
                  alert("Premiere Pro Online Clone\n\nKeyboard Shortcuts:\n• Space: Play/Pause\n• V: Selection Tool\n• C: Razor Tool\n• T: Text Tool\n• Delete/Backspace: Delete clip\n• Ctrl+Z / Ctrl+Y: Undo/Redo\n• Left/Right arrows: Frame scrub");
                }
              }}
            >
              {menu}
            </span>
          ))}
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        multiple 
        accept="video/*,audio/*,image/*" 
        style={{ display: 'none' }}
      />

      {/* Sequence Title & State */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          Premiere_Sequence_01.prproj
        </span>
        <span style={{
          fontSize: '10px',
          color: isPlaying ? '#2ecc71' : 'var(--text-muted)',
          backgroundColor: '#1a1a1c',
          padding: '2px 6px',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span className={isPlaying ? "rec-pulse" : ""} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isPlaying ? '#2ecc71' : '#666'
          }} />
          {isPlaying ? 'PLAYING (RENDER OK)' : 'STANDBY'}
        </span>
      </div>

      {/* Control Bar & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Undo/Redo */}
        <div style={{ display: 'flex', borderRight: '1px solid var(--border-color)', paddingRight: '10px' }}>
          <button 
            className="pm-icon-btn" 
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button 
            className="pm-icon-btn" 
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Import Media */}
        <button 
          className="pm-btn" 
          onClick={() => fileInputRef.current?.click()}
          style={{ fontSize: '11px', padding: '4px 10px' }}
        >
          <FolderOpen size={13} />
          Import Local Media
        </button>

        {/* Quick Sample Generators */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className="pm-btn" 
            onClick={() => synthesizeMockAsset('leader')}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#2d2d30' }}
            title="Add Synthetic Film Countdown Leader"
          >
            + Leader
          </button>
          <button 
            className="pm-btn" 
            onClick={() => synthesizeMockAsset('bars')}
            style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#2d2d30' }}
            title="Add Synthetic Color Bars & 1kHz Tone"
          >
            + Slate
          </button>
        </div>

        {/* Timecode */}
        <div className="timecode-display" style={{ fontSize: '14px', padding: '2px 8px' }}>
          {formatTimecode(currentTime)}
        </div>

        {/* Export Button */}
        <button 
          className="pm-btn primary" 
          onClick={onOpenExport}
          style={{ fontWeight: 600, padding: '4px 14px' }}
        >
          <Download size={14} style={{ marginRight: '4px' }} />
          Export
        </button>
      </div>
    </header>
  );
};
