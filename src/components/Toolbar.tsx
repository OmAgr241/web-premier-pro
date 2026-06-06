import React from 'react';
import { useEditor } from '../context/EditorContext';
import type { ToolType } from '../types/editor';
import { MousePointer, Scissors, Type, Hand } from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { tool, setTool } = useEditor();

  const tools: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
    {
      id: 'select',
      label: 'Selection Tool',
      shortcut: 'V',
      icon: <MousePointer size={18} />
    },
    {
      id: 'razor',
      label: 'Razor (Split) Tool',
      shortcut: 'C',
      icon: <Scissors size={18} />
    },
    {
      id: 'text',
      label: 'Type (Text) Tool',
      shortcut: 'T',
      icon: <Type size={18} />
    },
    {
      id: 'hand',
      label: 'Hand (Pan) Tool',
      shortcut: 'H',
      icon: <Hand size={18} />
    }
  ];

  return (
    <div style={{
      width: '44px',
      backgroundColor: 'var(--bg-panel-header)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 0',
      gap: '6px',
      flexShrink: 0
    }}>
      {tools.map((t) => (
        <button
          key={t.id}
          className={`pm-icon-btn ${tool === t.id ? 'active' : ''}`}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => setTool(t.id)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            position: 'relative'
          }}
        >
          {t.icon}
          
          {/* Small keyboard shortcut visual marker */}
          <span style={{
            position: 'absolute',
            bottom: '2px',
            right: '3px',
            fontSize: '7px',
            color: 'var(--text-muted)',
            fontWeight: 'bold'
          }}>
            {t.shortcut}
          </span>
        </button>
      ))}
    </div>
  );
};
