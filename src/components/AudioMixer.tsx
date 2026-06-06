import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { audioEngine } from '../utils/audioEngine';

export const AudioMixer: React.FC = () => {
  const { 
    tracks, toggleMuteTrack, toggleSoloTrack,
    masterVolume, setMasterVolume,
    trackVolumes, setTrackVolume
  } = useEditor();

  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({
    a1: 0,
    a2: 0,
    a3: 0,
    master: 0
  });

  const intervalRef = useRef<number | null>(null);

  // Poll real-time Web Audio Analyser levels
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const levels = audioEngine.getLevels();
      setMeterLevels(levels);
    }, 60);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="pm-panel" style={{ height: '100%' }}>
      <div className="pm-panel-header">
        <div className="pm-tab active">Audio Track Mixer</div>
      </div>

      <div className="pm-panel-body" style={{
        backgroundColor: '#1b1b1d',
        display: 'flex',
        padding: '12px 6px',
        gap: '8px',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        overflowX: 'auto'
      }}>
        {/* Track A1 Fader */}
        <FaderChannel 
          id="a1" 
          name="Audio 1" 
          volume={trackVolumes.a1} 
          setVolume={(val) => setTrackVolume('a1', val)}
          level={meterLevels.a1} 
          isMuted={tracks.find(t => t.id === 'a1')?.muted || false}
          isSoloed={tracks.find(t => t.id === 'a1')?.solo || false}
          onMute={() => toggleMuteTrack('a1')}
          onSolo={() => toggleSoloTrack('a1')}
        />

        {/* Track A2 Fader */}
        <FaderChannel 
          id="a2" 
          name="Audio 2" 
          volume={trackVolumes.a2} 
          setVolume={(val) => setTrackVolume('a2', val)}
          level={meterLevels.a2} 
          isMuted={tracks.find(t => t.id === 'a2')?.muted || false}
          isSoloed={tracks.find(t => t.id === 'a2')?.solo || false}
          onMute={() => toggleMuteTrack('a2')}
          onSolo={() => toggleSoloTrack('a2')}
        />

        {/* Track A3 Fader */}
        <FaderChannel 
          id="a3" 
          name="Audio 3" 
          volume={trackVolumes.a3} 
          setVolume={(val) => setTrackVolume('a3', val)}
          level={meterLevels.a3} 
          isMuted={tracks.find(t => t.id === 'a3')?.muted || false}
          isSoloed={tracks.find(t => t.id === 'a3')?.solo || false}
          onMute={() => toggleMuteTrack('a3')}
          onSolo={() => toggleSoloTrack('a3')}
        />

        {/* Divider fader line */}
        <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

        {/* Master Output Fader */}
        <FaderChannel 
          id="master" 
          name="Master Output" 
          volume={masterVolume} 
          setVolume={setMasterVolume}
          level={meterLevels.master} 
          isMuted={false}
          isSoloed={false}
          onMute={() => {}}
          onSolo={() => {}}
          isMaster={true}
        />
      </div>
    </div>
  );
};

// ==========================================
// INDIVIDUAL CHANNEL SLIDER + LED COLUMN
// ==========================================

interface FaderChannelProps {
  id: string;
  name: string;
  volume: number;
  setVolume: (val: number) => void;
  level: number;
  isMuted: boolean;
  isSoloed: boolean;
  onMute: () => void;
  onSolo: () => void;
  isMaster?: boolean;
}

const FaderChannel: React.FC<FaderChannelProps> = ({
  name, volume, setVolume, level, isMuted, isSoloed, onMute, onSolo, isMaster = false
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#202022',
      border: '1px solid #2d2d30',
      borderRadius: '6px',
      padding: '8px 4px',
      width: '74px',
      fontSize: '10px'
    }}>
      {/* Title */}
      <span style={{
        fontWeight: 'bold',
        color: isMaster ? 'var(--accent-color)' : 'var(--text-secondary)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
        marginBottom: '6px'
      }}>
        {name}
      </span>

      {/* Control Buttons */}
      {!isMaster && (
        <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
          <button 
            onClick={onMute}
            className={`track-action-btn ${isMuted ? 'active-mute' : ''}`}
            title="Mute Track (M)"
          >
            M
          </button>
          <button 
            onClick={onSolo}
            className={`track-action-btn ${isSoloed ? 'active-solo' : ''}`}
            title="Solo Track (S)"
          >
            S
          </button>
        </div>
      )}

      {/* Fader & LED meters side-by-side */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        flex: 1,
        gap: '6px',
        height: '110px',
        margin: '6px 0'
      }}>
        {/* LED VU Meter Bar (glowing LED blocks) */}
        <div style={{
          width: '8px',
          backgroundColor: '#0a0a0b',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid #141416'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: isMuted ? '0%' : `${level}%`,
            background: 'linear-gradient(to top, #00d2d3 0%, #00d2d3 70%, #ffb300 85%, #ff7675 100%)',
            transition: 'height 0.05s ease-out',
            boxShadow: '0 0 8px rgba(0, 210, 211, 0.4)'
          }} />
        </div>

        {/* Fader Volume slider (vertical input) */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px'
        }}>
          <input 
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              WebkitAppearance: 'slider-vertical',
              width: '12px',
              height: '100px',
              cursor: 'ns-resize',
              background: '#131314',
              borderRadius: '6px'
            }}
          />
        </div>
      </div>

      {/* Readout DB Text */}
      <span style={{
        fontFamily: 'monospace',
        fontSize: '9px',
        color: isMuted ? '#ff7675' : '#55efc4',
        marginTop: '4px'
      }}>
        {isMuted ? 'MUTED' : `${Math.round(volume)}%`}
      </span>
    </div>
  );
};
