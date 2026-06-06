import React, { useState } from 'react';
import { EffectControls } from './EffectControls';
import { SourceMonitor } from './SourceMonitor';
import { ProgramMonitor } from './ProgramMonitor';
import { ProjectPanel } from './ProjectPanel';
import { EffectsPanel } from './EffectsPanel';
import { AudioMixer } from './AudioMixer';
import { Toolbar } from './Toolbar';
import { Timeline } from './Timeline';

export const Workspace: React.FC = () => {
  // Tabs for Upper Left panel
  const [upperLeftTab, setUpperLeftTab] = useState<'source' | 'effects'>('effects');
  
  // Tabs for Lower Left panel
  const [lowerLeftTab, setLowerLeftTab] = useState<'project' | 'presets' | 'mixer'>('project');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      padding: '4px',
      gap: '4px',
      backgroundColor: 'var(--bg-app)'
    }}>
      {/* UPPER ROW PANEL SPLIT */}
      <div style={{
        display: 'flex',
        flex: '1.2', // slightly taller
        gap: '4px',
        minHeight: '200px'
      }}>
        {/* UPPER LEFT: Source Monitor / Effect Controls */}
        <div className="pm-panel" style={{ flex: '1.1', minWidth: '300px' }}>
          <div className="pm-panel-header">
            <div 
              className={`pm-tab ${upperLeftTab === 'effects' ? 'active' : ''}`}
              onClick={() => setUpperLeftTab('effects')}
            >
              Effect Controls
            </div>
            <div 
              className={`pm-tab ${upperLeftTab === 'source' ? 'active' : ''}`}
              onClick={() => setUpperLeftTab('source')}
            >
              Source Monitor
            </div>
          </div>
          
          <div className="pm-panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
            {upperLeftTab === 'effects' ? <EffectControls /> : <SourceMonitor />}
          </div>
        </div>

        {/* UPPER RIGHT: Main program monitor preview canvas */}
        <div style={{ flex: '1.5', minWidth: '350px' }}>
          <ProgramMonitor />
        </div>
      </div>

      {/* LOWER ROW PANEL SPLIT */}
      <div style={{
        display: 'flex',
        flex: '1', // lower timeline section
        gap: '4px',
        minHeight: '180px'
      }}>
        {/* LOWER LEFT: Media Bin / Presets / Mixer */}
        <div className="pm-panel" style={{ flex: '0.8', minWidth: '280px' }}>
          <div className="pm-panel-header">
            <div 
              className={`pm-tab ${lowerLeftTab === 'project' ? 'active' : ''}`}
              onClick={() => setLowerLeftTab('project')}
            >
              Project Bin
            </div>
            <div 
              className={`pm-tab ${lowerLeftTab === 'presets' ? 'active' : ''}`}
              onClick={() => setLowerLeftTab('presets')}
            >
              Effects Library
            </div>
            <div 
              className={`pm-tab ${lowerLeftTab === 'mixer' ? 'active' : ''}`}
              onClick={() => setLowerLeftTab('mixer')}
            >
              Audio Mixer
            </div>
          </div>

          <div className="pm-panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
            {lowerLeftTab === 'project' && <ProjectPanel />}
            {lowerLeftTab === 'presets' && <EffectsPanel />}
            {lowerLeftTab === 'mixer' && <AudioMixer />}
          </div>
        </div>

        {/* LOWER CENTER: Vertical Toolbar */}
        <Toolbar />

        {/* LOWER RIGHT: Time Ruler tracks editor */}
        <Timeline />
      </div>
    </div>
  );
};
