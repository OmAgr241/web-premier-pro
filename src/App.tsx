import { useState } from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { Header } from './components/Header';
import { Workspace } from './components/Workspace';
import { ExportModal } from './components/ExportModal';

function EditorApp() {
  const [exportOpen, setExportOpen] = useState(false);
  const { tool } = useEditor();

  const getToolTip = () => {
    switch (tool) {
      case 'select':
        return 'Selection Tool (V): Drag clips to rearrange, trim edges to resize, double click to adjust properties.';
      case 'razor':
        return 'Razor Tool (C): Click anywhere on a timeline clip to split it in two at that timestamp.';
      case 'text':
        return 'Type Tool (T): Click inside the Program Monitor screen to type and overlay dynamic titles.';
      case 'hand':
        return 'Hand Tool (H): Click and drag timeline canvas workspace.';
      default:
        return 'Premiere Pro Web Workspace - Ready';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#121213',
      overflow: 'hidden'
    }}>
      {/* Header Menu bar */}
      <Header onOpenExport={() => setExportOpen(true)} />

      {/* Main Resizable workspace panels */}
      <Workspace />

      {/* Footer status bar */}
      <footer style={{
        height: 'var(--status-bar-height)',
        backgroundColor: '#1c1c1e',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: '10px',
        color: 'var(--text-secondary)',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#00d2d3', fontWeight: 'bold' }}>TOOL TIP:</span>
          <span>{getToolTip()}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>FPS: 30.00</span>
          <span>Resolution: 1280x720 (16:9)</span>
          <span style={{ color: 'var(--text-muted)' }}>Antigravity Engine v1.2</span>
        </div>
      </footer>

      {/* Exporter modal overlay */}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <EditorApp />
    </EditorProvider>
  );
}
