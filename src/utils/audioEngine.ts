class AudioEngine {
  private ctx: AudioContext | null = null;
  private trackGains: Record<string, GainNode> = {};
  private trackAnalysers: Record<string, AnalyserNode> = {};
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private connectedElements: Map<string, MediaElementAudioSourceNode> = new Map();
  
  // Synthetic audio generators
  private toneOscillator: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  private activeBeeps = new Set<number>(); // Store beep times to avoid double-firing

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    // Create Master chain
    this.masterGain = this.ctx.createGain();
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 64; // Small fft for fast VU updates
    
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    
    // Create Track faders (A1, A2, A3)
    const trackIds = ['a1', 'a2', 'a3'];
    trackIds.forEach((trackId) => {
      if (!this.ctx || !this.masterGain) return;
      
      const gainNode = this.ctx.createGain();
      const analyserNode = this.ctx.createAnalyser();
      analyserNode.fftSize = 64;
      
      gainNode.connect(analyserNode);
      analyserNode.connect(this.masterGain);
      
      this.trackGains[trackId] = gainNode;
      this.trackAnalysers[trackId] = analyserNode;
    });
  }

  getContext() {
    return this.ctx;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  connectElement(elementId: string, element: HTMLMediaElement, trackId: string) {
    this.init();
    if (!this.ctx || !this.trackGains[trackId]) return;
    
    if (this.connectedElements.has(elementId)) {
      const sourceNode = this.connectedElements.get(elementId);
      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode.connect(this.trackGains[trackId]);
      }
      return;
    }
    
    try {
      element.crossOrigin = 'anonymous';
      const sourceNode = this.ctx.createMediaElementSource(element);
      sourceNode.connect(this.trackGains[trackId]);
      this.connectedElements.set(elementId, sourceNode);
    } catch (e) {
      console.error('Failed to connect element to AudioEngine:', e);
    }
  }

  disconnectElement(elementId: string) {
    const sourceNode = this.connectedElements.get(elementId);
    if (sourceNode) {
      sourceNode.disconnect();
      this.connectedElements.delete(elementId);
    }
  }

  setTrackVolume(trackId: string, volumePercent: number) {
    const gainNode = this.trackGains[trackId];
    if (gainNode && this.ctx) {
      const gainVal = (volumePercent / 100) * 1.0;
      gainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    }
  }

  setMasterVolume(volumePercent: number) {
    if (this.masterGain && this.ctx) {
      const gainVal = (volumePercent / 100) * 1.0;
      this.masterGain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    }
  }

  // ==========================================
  // EXPORT RECORDING AUDIO SOURCE
  // ==========================================
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  startCaptureDestination(): MediaStreamTrack | null {
    this.init();
    if (!this.ctx || !this.masterGain) return null;
    try {
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDest);
      return this.mediaStreamDest.stream.getAudioTracks()[0] || null;
    } catch (e) {
      console.error('Failed to create MediaStreamAudioDestinationNode:', e);
      return null;
    }
  }

  stopCaptureDestination() {
    if (this.mediaStreamDest && this.masterGain) {
      try {
        this.masterGain.disconnect(this.mediaStreamDest);
      } catch (e) {}
      this.mediaStreamDest = null;
    }
  }

  // ==========================================
  // OSCILLATOR SYNTH METHODS
  // ==========================================

  startTone(trackId: string, freq = 1000) {
    this.init();
    this.resume();
    if (!this.ctx || !this.trackGains[trackId]) return;
    if (this.toneOscillator) return; // already playing

    try {
      this.toneOscillator = this.ctx.createOscillator();
      this.toneGain = this.ctx.createGain();
      
      this.toneOscillator.type = 'sine';
      this.toneOscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      // Tone volume should be moderate
      this.toneGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      
      this.toneOscillator.connect(this.toneGain);
      this.toneGain.connect(this.trackGains[trackId]);
      
      this.toneOscillator.start();
    } catch (e) {
      console.error('Failed to start oscillator tone:', e);
    }
  }

  stopTone() {
    if (this.toneOscillator) {
      try {
        this.toneOscillator.stop();
        this.toneOscillator.disconnect();
      } catch (e) {}
      this.toneOscillator = null;
    }
    if (this.toneGain) {
      this.toneGain.disconnect();
      this.toneGain = null;
    }
  }

  playBeep(trackId: string, freq = 1000, duration = 0.15) {
    this.init();
    this.resume();
    if (!this.ctx || !this.trackGains[trackId]) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      // Fade out at end of duration to avoid click pop
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.trackGains[trackId]);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
      
      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      }, (duration + 0.1) * 1000);
    } catch (e) {
      console.error('Failed to play beep:', e);
    }
  }

  clearBeeps() {
    this.activeBeeps.clear();
  }

  triggerBeepOnce(trackId: string, triggerId: number, freq = 1000) {
    if (this.activeBeeps.has(triggerId)) return;
    this.activeBeeps.add(triggerId);
    this.playBeep(trackId, freq, 0.15);
    
    // Clear trigger after 1.5s so it can fire again if we scrub back
    setTimeout(() => {
      this.activeBeeps.delete(triggerId);
    }, 1500);
  }

  getDbLevel(analyserNode: AnalyserNode | null): number {
    if (!analyserNode || !this.ctx) return 0;
    
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    
    const average = sum / bufferLength;
    // Return numeric scale of 0 to 100
    return (average / 255) * 100;
  }

  getLevels(): Record<string, number> {
    return {
      a1: this.getDbLevel(this.trackAnalysers['a1']),
      a2: this.getDbLevel(this.trackAnalysers['a2']),
      a3: this.getDbLevel(this.trackAnalysers['a3']),
      master: this.getDbLevel(this.masterAnalyser),
    };
  }
}

export const audioEngine = new AudioEngine();
