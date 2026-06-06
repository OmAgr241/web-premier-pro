import type { Clip, MediaAsset } from '../types/editor';

// Simple global media element cache to avoid recreating elements
export const mediaCache = new Map<string, HTMLVideoElement | HTMLImageElement | HTMLAudioElement>();

/**
 * Get or create HTML element for media asset
 */
export function getMediaElement(asset: MediaAsset): HTMLVideoElement | HTMLImageElement | HTMLAudioElement | null {
  if (mediaCache.has(asset.id)) {
    return mediaCache.get(asset.id)!;
  }

  if (asset.id.startsWith('synth_')) {
    // Synthetic assets don't need underlying media elements, they are generated programmatically
    return null;
  }

  if (asset.type === 'video') {
    const video = document.createElement('video');
    video.src = asset.url;
    video.crossOrigin = 'anonymous';
    video.muted = true; // Always mute original elements, audio runs through Web Audio API
    video.playsInline = true;
    video.preload = 'auto';
    mediaCache.set(asset.id, video);
    return video;
  } else if (asset.type === 'image') {
    const img = new Image();
    img.src = asset.url;
    img.crossOrigin = 'anonymous';
    mediaCache.set(asset.id, img);
    return img;
  } else if (asset.type === 'audio') {
    const audio = document.createElement('audio');
    audio.src = asset.url;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    mediaCache.set(asset.id, audio);
    return audio;
  }
  return null;
}

/**
 * Interpolates a clip's property value at the given sequence time based on keyframes.
 */
export function evaluateKeyframeProperty(
  clip: Clip,
  property: 'positionX' | 'positionY' | 'scale' | 'rotation' | 'opacity' | 'volume',
  time: number,
  defaultValue: number
): number {
  const track = clip.keyframes?.find((t) => t.property === property);
  if (!track || !track.keyframes || track.keyframes.length === 0) {
    if (property === 'positionX') return clip.positionX;
    if (property === 'positionY') return clip.positionY;
    if (property === 'scale') return clip.scale;
    if (property === 'rotation') return clip.rotation;
    if (property === 'opacity') return clip.opacity;
    if (property === 'volume') return clip.volume;
    return defaultValue;
  }

  const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
  const clipTime = time - clip.timelineStart;
  
  if (clipTime <= kfs[0].time) {
    return kfs[0].value;
  }
  
  if (clipTime >= kfs[kfs.length - 1].time) {
    return kfs[kfs.length - 1].value;
  }
  
  for (let i = 0; i < kfs.length - 1; i++) {
    const kfCurrent = kfs[i];
    const kfNext = kfs[i + 1];
    
    if (clipTime >= kfCurrent.time && clipTime <= kfNext.time) {
      const ratio = (clipTime - kfCurrent.time) / (kfNext.time - kfCurrent.time);
      return kfCurrent.value + (kfNext.value - kfCurrent.value) * ratio;
    }
  }
  
  return defaultValue;
}

// ==========================================
// SYNTHETIC CANVAS RENDERERS
// ==========================================

function drawColorBars(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  // SMPTE Color Bars
  const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];
  const barW = w / 7;
  
  // Upper 2/3: Vertical bars
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * barW, 0, barW, (h * 2) / 3);
  }

  // Middle 1/12: Reversed/complementary colors
  const compColors = ['#0000ff', '#111111', '#ff00ff', '#222222', '#00ffff', '#333333', '#ffffff'];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = compColors[i];
    ctx.fillRect(i * barW, (h * 2) / 3, barW, h / 12);
  }

  // Bottom 1/4: Dark patches and text info
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, (h * 3) / 4, w, h / 4);

  // Sub-blocks in bottom fader region
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, (h * 3) / 4, barW, h / 4);
  ctx.fillStyle = '#000000';
  ctx.fillRect(barW, (h * 3) / 4, barW, h / 4);
  ctx.fillStyle = '#181818';
  ctx.fillRect(barW * 2, (h * 3) / 4, barW, h / 4);

  // Timecode readout on the slate
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.05)}px monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  
  const formattedSecs = time.toFixed(2);
  ctx.fillText(`MOCK TONE 1000Hz | T+${formattedSecs}s`, w - 20, h - 20);

  // Draw a blinking recording dot
  ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? '#ff0000' : '#444444';
  ctx.beginPath();
  ctx.arc(w - barW * 0.4, h - h * 0.16, h * 0.03, 0, 2 * Math.PI);
  ctx.fill();
}

function drawCountdownLeader(ctx: CanvasRenderingContext2D, clipTime: number, w: number, h: number) {
  // Total synthetic duration is 8 seconds.
  // Countdown from 8 down to 2.
  // At 2.0s we flash a white frame and trigger a "beep" audio tick.
  // After 2.0s, it's black.
  const duration = 8;
  const remaining = duration - clipTime; // 8 down to 0
  const count = Math.ceil(remaining);

  if (remaining <= 0) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // The 2-pop (white flash at exactly remaining = 2.0, frames 2:00 to 2:01)
  const isTwoPop = Math.abs(remaining - 2.0) < 0.04; // roughly 1 frame
  if (isTwoPop) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (remaining < 2.0) {
    // Lead-out is pure black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Draw leader graphics (retro grey/brown look)
  ctx.fillStyle = '#333330';
  ctx.fillRect(0, 0, w, h);

  // Circular dial
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.3, 0, 2 * Math.PI);
  ctx.stroke();

  // Inner details
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.28, 0, 2 * Math.PI);
  ctx.stroke();

  // Cross lines
  ctx.beginPath();
  ctx.moveTo(w / 2 - h * 0.35, h / 2);
  ctx.lineTo(w / 2 + h * 0.35, h / 2);
  ctx.moveTo(w / 2, h / 2 - h * 0.35);
  ctx.lineTo(w / 2, h / 2 + h * 0.35);
  ctx.stroke();

  // Draw sweeping hand (similar to a clock)
  const angle = (remaining % 1) * 2 * Math.PI - Math.PI / 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2);
  ctx.lineTo(w / 2 + Math.cos(angle) * h * 0.3, h / 2 + Math.sin(angle) * h * 0.3);
  ctx.stroke();

  // Display count number
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(h * 0.35)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Display numbers 8 down to 3
  const numDisplay = count >= 3 ? String(count) : 'L-O';
  ctx.fillText(numDisplay, w / 2, h / 2);

  // Vintage film grain & hair simulation
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 5; i++) {
    const gx = Math.random() * w;
    const gy = Math.random() * h;
    const gr = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawSynthwaveGrid(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  // Dark blue-purple background
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#0a0018');
  gradient.addColorStop(0.5, '#1e0036');
  gradient.addColorStop(1, '#05000d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Retro Sun
  const sunY = h * 0.45;
  const sunRadius = h * 0.28;
  const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
  sunGrad.addColorStop(0, '#ffe600');
  sunGrad.addColorStop(0.5, '#ff0055');
  sunGrad.addColorStop(1, '#ff0088');
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, sunY, sunRadius, 0, 2 * Math.PI);
  ctx.clip();
  ctx.fillStyle = sunGrad;
  ctx.fillRect(w / 2 - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);

  // Grid line cutout overlays on the sun (Retro scanlines)
  ctx.fillStyle = '#0a0018';
  const numStripes = 8;
  for (let i = 0; i < numStripes; i++) {
    const yVal = sunY + (i / numStripes) * sunRadius * 1.1;
    const thickness = 2 + (i / numStripes) * 12;
    ctx.fillRect(w / 2 - sunRadius - 10, yVal, sunRadius * 2 + 20, thickness);
  }
  ctx.restore();

  // Perspective Grid
  ctx.save();
  const horizon = h * 0.55;
  ctx.strokeStyle = '#ff00a0';
  ctx.lineWidth = 2;
  
  // Draw horizon line
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w, horizon);
  ctx.stroke();

  // Perspective lines projecting out
  const numLines = 24;
  for (let i = 0; i <= numLines; i++) {
    const tRatio = i / numLines;
    const startX = w * 0.1 + tRatio * (w * 0.8);
    const endX = (startX - w / 2) * 5 + w / 2; // Fan outward
    ctx.beginPath();
    ctx.moveTo(startX, horizon);
    ctx.lineTo(endX, h);
    ctx.stroke();
  }

  // Scrolling horizontal grid lines
  const gridSpeed = 60; // pixels per second
  const offset = (time * gridSpeed) % 80;
  const gridLines = 10;
  for (let i = 0; i < gridLines; i++) {
    const progress = (i * 30 + offset) / 300; // quadratic pacing for 3D look
    const yPos = horizon + (progress * progress) * (h - horizon);
    if (yPos > horizon && yPos <= h) {
      ctx.lineWidth = 1 + progress * 3;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(w, yPos);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Draw some distant mountains
  ctx.fillStyle = '#1c053a';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w * 0.15, horizon - 35);
  ctx.lineTo(w * 0.3, horizon);
  ctx.lineTo(w * 0.45, horizon - 50);
  ctx.lineTo(w * 0.65, horizon - 20);
  ctx.lineTo(w * 0.8, horizon - 40);
  ctx.lineTo(w, horizon);
  ctx.fill();

  ctx.strokeStyle = '#2f0b5d';
  ctx.stroke();
}

function drawParticles(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  // Dark fluid background
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, w, h);

  // Glowing orb in center
  const g = ctx.createRadialGradient(w/2, h/2, 5, w/2, h/2, h*0.4);
  g.addColorStop(0, 'rgba(0, 150, 255, 0.25)');
  g.addColorStop(0.5, 'rgba(128, 0, 255, 0.05)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Render mathematical swirling particles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const numParticles = 80;
  for (let i = 0; i < numParticles; i++) {
    const angle = (i * (360 / numParticles) * Math.PI) / 180 + time * 0.4;
    // Radius pulsing over time
    const rOffset = Math.sin(time + i) * 30;
    const r = (h * 0.25) + rOffset;
    
    // Complex coordinates
    const px = w / 2 + Math.cos(angle * 1.5) * r + Math.sin(time * 2 + i) * 15;
    const py = h / 2 + Math.sin(angle) * r * Math.cos(time * 0.5) + Math.cos(time + i) * 10;
    
    // Draw particle
    const size = Math.abs(Math.sin(time + i)) * 4 + 2;
    ctx.shadowColor = '#00a6ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `hsl(${(i * 5 + time * 20) % 360}, 90%, 75%)`;
    
    ctx.beginPath();
    ctx.arc(px, py, size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }
}

// ==========================================
// MAIN COMPOSITING LOOP
// ==========================================

interface RenderOptions {
  width: number;
  height: number;
  isPlaying: boolean;
  resolution?: number;
  safeMargins: boolean;
}

/**
 * Composites and renders all visible tracks onto the destination canvas for the given timecode
 */
export function renderCanvasFrame(
  ctx: CanvasRenderingContext2D,
  time: number,
  clips: Clip[],
  mediaBin: MediaAsset[],
  options: RenderOptions
) {
  const { width, height, isPlaying, safeMargins } = options;

  // 1. Clear background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 2. Filter active visual clips (video, image) overlapping current time
  const activeClips = clips
    .filter((clip) => {
      return (
        (clip.type === 'video' || clip.type === 'image') &&
        clip.timelineStart <= time &&
        clip.timelineEnd >= time
      );
    })
    .sort((a, b) => {
      const trackOrder = ['v1', 'v2', 'v3'];
      return trackOrder.indexOf(a.trackId) - trackOrder.indexOf(b.trackId);
    });

  // 3. Draw each clip
  activeClips.forEach((clip) => {
    // Evaluate animations via keyframes
    const scale = evaluateKeyframeProperty(clip, 'scale', time, clip.scale);
    const opacity = evaluateKeyframeProperty(clip, 'opacity', time, clip.opacity);
    const positionX = evaluateKeyframeProperty(clip, 'positionX', time, clip.positionX);
    const positionY = evaluateKeyframeProperty(clip, 'positionY', time, clip.positionY);
    const rotation = evaluateKeyframeProperty(clip, 'rotation', time, clip.rotation);

    ctx.save();

    // Apply filters
    const filters = clip.filters || {
      grayscale: 0,
      sepia: 0,
      invert: 0,
      blur: 0,
      brightness: 100,
      contrast: 100,
      hueRotate: 0,
      saturate: 100,
    };
    
    ctx.filter = `
      grayscale(${filters.grayscale}%)
      sepia(${filters.sepia}%)
      invert(${filters.invert}%)
      blur(${filters.blur}px)
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      hue-rotate(${filters.hueRotate}deg)
      saturate(${filters.saturate}%)
    `.trim().replace(/\s+/g, ' ');

    // Apply global transparency
    ctx.globalAlpha = Math.max(0, Math.min(100, opacity)) / 100;

    // Apply transitions
    if (clip.transition) {
      const trans = clip.transition;
      if (trans.position === 'start') {
        const transEnd = clip.timelineStart + trans.duration;
        if (time < transEnd) {
          const ratio = (time - clip.timelineStart) / trans.duration;
          if (trans.type === 'cross-dissolve' || trans.type === 'dip-to-black') {
            ctx.globalAlpha *= ratio;
          }
        }
      } else if (trans.position === 'end') {
        const transStart = clip.timelineEnd - trans.duration;
        if (time > transStart) {
          const ratio = (clip.timelineEnd - time) / trans.duration;
          if (trans.type === 'cross-dissolve' || trans.type === 'dip-to-black') {
            ctx.globalAlpha *= ratio;
          }
        }
      }
    }

    // Set origin to canvas center + custom offset
    const cx = width / 2 + positionX;
    const cy = height / 2 + positionY;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    const s = scale / 100;
    ctx.scale(s, s);

    // Render Synthetic or Native media
    if (clip.assetId.startsWith('synth_')) {
      const clipTime = time - clip.timelineStart + clip.sourceStart;
      if (clip.assetId === 'synth_color_bars') {
        drawColorBars(ctx, clipTime, width, height);
      } else if (clip.assetId === 'synth_countdown') {
        drawCountdownLeader(ctx, clipTime, width, height);
      } else if (clip.assetId === 'synth_synthwave') {
        drawSynthwaveGrid(ctx, clipTime, width, height);
      } else if (clip.assetId === 'synth_particles') {
        drawParticles(ctx, clipTime, width, height);
      }
    } else {
      const asset = mediaBin.find((a) => a.id === clip.assetId);
      if (asset) {
        const el = getMediaElement(asset);
        if (el) {
          let drawWidth = width;
          let drawHeight = height;

          if (asset.type === 'video') {
            const video = el as HTMLVideoElement;
            const videoTime = (time - clip.timelineStart) + clip.sourceStart;
            
            if (!isPlaying) {
              if (Math.abs(video.currentTime - videoTime) > 0.05) {
                video.currentTime = videoTime;
              }
            }

            if (video.readyState >= 2) {
              const videoRatio = video.videoWidth / video.videoHeight;
              const canvasRatio = width / height;
              if (videoRatio > canvasRatio) {
                drawWidth = width;
                drawHeight = width / videoRatio;
              } else {
                drawHeight = height;
                drawWidth = height * videoRatio;
              }
              ctx.drawImage(video, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            } else {
              ctx.fillStyle = '#111';
              ctx.fillRect(-width / 2, -height / 2, width, height);
              ctx.fillStyle = '#aaa';
              ctx.font = '14px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`Loading media: ${clip.name}...`, 0, 0);
            }
          } else if (asset.type === 'image') {
            const img = el as HTMLImageElement;
            if (img.complete) {
              const imgRatio = img.naturalWidth / img.naturalHeight;
              const canvasRatio = width / height;
              if (imgRatio > canvasRatio) {
                drawWidth = width;
                drawHeight = width / imgRatio;
              } else {
                drawHeight = height;
                drawWidth = height * imgRatio;
              }
              ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            }
          }
        }
      }
    }

    ctx.restore();

    // Render Transitions (Slide overlay wipes)
    if (clip.transition) {
      const trans = clip.transition;
      ctx.save();
      if (trans.type === 'slide-left') {
        if (trans.position === 'start' && time < clip.timelineStart + trans.duration) {
          const ratio = (time - clip.timelineStart) / trans.duration;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width * (1 - ratio), height);
        } else if (trans.position === 'end' && time > clip.timelineEnd - trans.duration) {
          const ratio = (clip.timelineEnd - time) / trans.duration;
          ctx.fillStyle = '#000000';
          ctx.fillRect(width * ratio, 0, width * (1 - ratio), height);
        }
      }
      ctx.restore();
    }

    // Render Text overlays
    if (clip.textConfig) {
      const tc = clip.textConfig;
      ctx.save();
      ctx.font = `${tc.fontSize}px "${tc.fontFamily}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textX = (tc.x / 100) * width;
      const textY = (tc.y / 100) * height;

      if (tc.strokeWidth > 0) {
        ctx.strokeStyle = tc.strokeColor;
        ctx.lineWidth = tc.strokeWidth;
        ctx.strokeText(tc.text, textX, textY);
      }

      ctx.fillStyle = tc.color;
      ctx.fillText(tc.text, textX, textY);
      ctx.restore();
    }
  });

  // 4. Safe Margins Guide
  if (safeMargins) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const asW = width * 0.9;
    const asH = height * 0.9;
    ctx.strokeRect((width - asW) / 2, (height - asH) / 2, asW, asH);

    const tsW = width * 0.8;
    const tsH = height * 0.8;
    ctx.strokeRect((width - tsW) / 2, (height - tsH) / 2, tsW, tsH);

    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2 - 10);
    ctx.lineTo(width / 2, height / 2 + 10);
    ctx.moveTo(width / 2 - 10, height / 2);
    ctx.lineTo(width / 2 + 10, height / 2);
    ctx.stroke();
    ctx.restore();
  }
}
