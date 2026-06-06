import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import type { MediaAsset } from '../types/editor';
import { renderCanvasFrame } from '../utils/renderEngine';
import { Film, Image as ImageIcon, Music, Grid, List, FolderPlus } from 'lucide-react';

export const ProjectPanel: React.FC = () => {
  const { mediaBin, selectedAssetId, setSelectedAssetId, addClipToTimeline } = useEditor();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <div className="pm-tab active">Project: Media Bin</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '8px' }}>
          {/* View Toggle */}
          <button 
            className={`pm-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid size={13} />
          </button>
          <button 
            className={`pm-icon-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={13} />
          </button>
        </div>
      </div>

      <div className="pm-panel-body" style={{ padding: '10px', backgroundColor: '#18181a' }}>
        {mediaBin.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'center',
            padding: '20px'
          }}>
            <FolderPlus size={36} style={{ marginBottom: '10px', opacity: 0.6 }} />
            <span>Project is empty.</span>
            <span style={{ fontSize: '10px', marginTop: '4px' }}>
              Drag files into Header or double click "Import" to load assets.
            </span>
          </div>
        ) : (
          <div style={{
            display: viewMode === 'grid' ? 'grid' : 'flex',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            flexDirection: 'column',
            gap: viewMode === 'grid' ? '12px' : '4px'
          }}>
            {mediaBin.map((asset) => (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                viewMode={viewMode}
                isSelected={selectedAssetId === asset.id}
                onSelect={() => setSelectedAssetId(asset.id)}
                onDoubleAdd={() => addClipToTimeline(asset.id, 'v1', 0)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// ASSET CARD COMPONENT WITH HOVER SCRUBBING
// ==========================================

interface AssetCardProps {
  asset: MediaAsset;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onDoubleAdd: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, viewMode, isSelected, onSelect, onDoubleAdd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Render static or dynamic scrub preview inside thumbnail canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw appropriate frame: 
    // If hovered, render at the relative hover playhead. If not, render starting frame (1.0s)
    const renderTime = isHovered ? hoverTime : 1.5;

    // Build temporary clip representation for renderCanvasFrame
    const mockClip = {
      id: 'mock_preview',
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

    renderCanvasFrame(ctx, renderTime, [mockClip], [asset], {
      width: canvas.width,
      height: canvas.height,
      isPlaying: false,
      resolution: 0.25,
      safeMargins: false
    });
  }, [asset, hoverTime, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (asset.duration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(percent * asset.duration);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getAssetIcon = () => {
    if (asset.type === 'audio') return <Music size={14} style={{ color: '#007aff' }} />;
    if (asset.type === 'image') return <ImageIcon size={14} style={{ color: '#af52de' }} />;
    return <Film size={14} style={{ color: '#34c759' }} />;
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        onDoubleClick={onDoubleAdd}
        draggable
        onDragStart={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 8px',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
          border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
          cursor: 'pointer',
          fontSize: '11px',
          transition: 'all 0.15s'
        }}
      >
        {getAssetIcon()}
        <span style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          flex: 1,
          color: isSelected ? 'white' : 'var(--text-primary)'
        }}>
          {asset.name}
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : 'IMAGE'}
        </span>
      </div>
    );
  }

  // Grid Card View
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleAdd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      draggable
      onDragStart={handleDragStart}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isSelected ? '#252528' : '#202022',
        border: isSelected ? '1px solid var(--accent-color)' : '1px solid #2d2d30',
        borderRadius: '5px',
        overflow: 'hidden',
        cursor: 'grab',
        boxShadow: isSelected ? '0 0 10px rgba(20, 115, 230, 0.25)' : 'none',
        transition: 'all 0.15s',
        position: 'relative'
      }}
    >
      {/* Thumbnail Render Box */}
      <div style={{ height: '62px', width: '100%', position: 'relative', backgroundColor: 'black' }}>
        {asset.type === 'audio' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#0a1020',
            color: '#007aff'
          }}>
            <Music size={28} />
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            width={120} 
            height={68}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}

        {/* Hover Scrub Progress Line */}
        {isHovered && asset.duration > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            backgroundColor: 'var(--accent-color)',
            width: `${(hoverTime / asset.duration) * 100}%`,
            transition: 'width 0.05s linear'
          }} />
        )}

        {/* Duration Time Stamp Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '3px',
          right: '4px',
          backgroundColor: 'rgba(0,0,0,0.75)',
          color: '#eee',
          fontSize: '8px',
          padding: '1px 3px',
          borderRadius: '2px',
          fontFamily: 'monospace'
        }}>
          {asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : 'IMG'}
        </div>
      </div>

      {/* Label Box */}
      <div style={{
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '10px'
      }}>
        {getAssetIcon()}
        <span style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          color: isSelected ? 'white' : 'var(--text-secondary)'
        }} title={asset.name}>
          {asset.name}
        </span>
      </div>
    </div>
  );
};
