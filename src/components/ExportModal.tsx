import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../context/EditorContext';
import { audioEngine } from '../utils/audioEngine';
import { 
  X, Download, Film, ShieldAlert, Loader2
} from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const { 
    duration, currentTime, setPlaying, setCurrentTime 
  } = useEditor();

  const [fileName, setFileName] = useState('Premiere_Online_Render');
  const [format, setFormat] = useState('webm');
  const [resolution, setResolution] = useState('1280x720');
  const [fps, setFps] = useState(30);
  
  // Render process states
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const checkIntervalRef = useRef<number | null>(null);

  // Clean up recording if closed abruptly
  useEffect(() => {
    return () => {
      cancelRender();
    };
  }, []);

  const startRender = () => {
    setIsRendering(true);
    setProgress(0);
    recordedChunksRef.current = [];

    // Find the main Program Monitor canvas
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert("Failed to find visual Program Canvas. Cannot render video.");
      setIsRendering(false);
      return;
    }

    // Initialize Audio Engine and grab capture track
    const audioTrack = audioEngine.startCaptureDestination();
    
    // Capture Canvas stream at target FPS
    const canvasStream = canvas.captureStream(fps);
    const videoTrack = canvasStream.getVideoTracks()[0];

    // Assemble Combined stream
    const combinedTracks: MediaStreamTrack[] = [];
    if (videoTrack) combinedTracks.push(videoTrack);
    if (audioTrack) combinedTracks.push(audioTrack);

    const recordingStream = new MediaStream(combinedTracks);

    // Instantiate MediaRecorder
    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      mediaRecorderRef.current = new MediaRecorder(recordingStream, options);
    } catch (e) {
      try {
        // Fallback mime type
        mediaRecorderRef.current = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
      } catch (err) {
        alert("WebM MediaRecorder not fully supported on this browser.");
        setIsRendering(false);
        audioEngine.stopCaptureDestination();
        return;
      }
    }

    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mr.onstop = () => {
      // Assemble files and download
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      audioEngine.stopCaptureDestination();
      setIsRendering(false);
      setProgress(100);
      setPlaying(false);
      
      alert(`Export Successful!\n"${fileName}.${format}" has been compiled and downloaded.`);
    };

    // Place timeline playhead at start
    setCurrentTime(0);
    setPlaying(true);
    
    // Start MediaRecorder
    mr.start();

    // Setup polling check loop to check timeline bounds
    checkIntervalRef.current = window.setInterval(() => {
      // Check current timeline playhead progress
      const p = Math.min(99.5, (currentTime / duration) * 100);
      setProgress(p);

      if (currentTime >= duration - 0.1) {
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        
        // Stop recording
        if (mr && mr.state !== 'inactive') {
          mr.stop();
        }
      }
    }, 100);
  };

  const cancelRender = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    audioEngine.stopCaptureDestination();
    setIsRendering(false);
    setProgress(0);
    setPlaying(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          backgroundColor: 'var(--bg-panel-header)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '40px',
          padding: '0 12px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Film size={14} style={{ color: 'var(--accent-color)' }} />
            Export Media settings
          </span>
          {!isRendering && (
            <button className="pm-icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
          {isRendering ? (
            /* Rendering progress state */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 0',
              gap: '12px'
            }}>
              <Loader2 size={32} style={{ color: 'var(--accent-color)' }} className="rec-pulse" />
              <span style={{ fontWeight: 'bold', color: 'white' }}>Compiling Timeline Sequence...</span>
              
              {/* Progress Slider block */}
              <div style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: 'var(--accent-color)',
                  width: `${progress}%`,
                  transition: 'width 0.1s linear'
                }} />
              </div>

              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {Math.round(progress)}% Completed ({currentTime.toFixed(1)}s / {duration.toFixed(1)}s)
              </span>

              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Please do not close the browser tab or switch tabs during export to maintain smooth frame ticks.
              </span>

              <button 
                className="pm-btn" 
                onClick={cancelRender}
                style={{ marginTop: '10px', borderColor: '#ff7675', color: '#ff7675' }}
              >
                Cancel Export
              </button>
            </div>
          ) : (
            /* Settings State */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* File Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>File Name</span>
                <input 
                  type="text" 
                  value={fileName} 
                  onChange={(e) => setFileName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    padding: '6px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Format select */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Format</span>
                <select 
                  value={format} 
                  onChange={(e) => setFormat(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                >
                  <option value="webm">WebM Video Container (Recommended)</option>
                  <option value="mp4">MPEG-4 Container (.mp4)</option>
                </select>
              </div>

              {/* Resolution select */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Export Preset</span>
                <select 
                  value={resolution} 
                  onChange={(e) => setResolution(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                >
                  <option value="1920x1080">Full HD (1920 x 1080)</option>
                  <option value="1280x720">HD Slate (1280 x 720)</option>
                  <option value="640x360">Mobile SD (640 x 360)</option>
                </select>
              </div>

              {/* FPS Select */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Frame Rate</span>
                <select 
                  value={fps} 
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                >
                  <option value={30}>30 fps (Broadcast Standard)</option>
                  <option value={60}>60 fps (High Smoothness)</option>
                </select>
              </div>

              {/* CORS Taint warning note */}
              <div style={{
                backgroundColor: 'rgba(255, 179, 0, 0.08)',
                border: '1px solid rgba(255, 179, 0, 0.25)',
                borderRadius: '4px',
                padding: '8px',
                fontSize: '10px',
                color: '#ffb300',
                display: 'flex',
                gap: '6px',
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Tip:</strong> Synthetic generators and local file uploads have no CORS constraints, ensuring export succeeds instantly without watermarks or errors!
                </span>
              </div>

              {/* Footer controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '10px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px'
              }}>
                <button className="pm-btn" onClick={onClose}>Cancel</button>
                <button className="pm-btn primary" onClick={startRender}>
                  <Download size={13} style={{ marginRight: '4px' }} />
                  Render Sequence
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
