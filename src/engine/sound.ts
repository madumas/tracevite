/**
 * Web Audio sound engine — synthesis only, no audio files.
 * 3 micro-sounds for sensory feedback (TDC proprioceptive compensation).
 */

import type { SoundMode } from '@/model/types';
export type { SoundMode };

const SNAP_DEBOUNCE_MS = 150;

export interface SoundEngine {
  playSnap: () => void;
  playSegmentCreated: () => void;
  playFigureClosed: () => void;
  setGain: (value: number) => void;
  setMode: (mode: SoundMode) => void;
  getMode: () => SoundMode;
  dispose: () => void;
}

/**
 * Create the sound engine. AudioContext is lazily created on first non-off mode set.
 */
export function createSoundEngine(): SoundEngine {
  let ctx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let mode: SoundMode = 'off';
  let lastSnapTime = 0;

  function ensureContext() {
    if (!ctx) {
      if (typeof AudioContext === 'undefined') return;
      ctx = new AudioContext();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.5;
      gainNode.connect(ctx.destination);
    }
    // Resume if suspended (e.g., after tab backgrounding)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function vibrate(ms: number) {
    navigator.vibrate?.(ms);
  }

  function playSnap() {
    if (mode === 'off') return;
    const now = Date.now();
    if (now - lastSnapTime < SNAP_DEBOUNCE_MS) return;
    lastSnapTime = now;

    // Haptic feedback in all non-off modes (reduced + full)
    vibrate(20);

    if (mode !== 'full') return; // Reduced mode skips snap sound

    ensureContext();
    if (!ctx || !gainNode) return;

    // "Soft drop" — triangle wave 480→320Hz sweep, 35ms
    // Triangle has softer harmonics than sine; descending pitch
    // feels like a gentle "plop" (landing/settling). Inaudible to
    // neighbours at normal volume — low frequency + short + quiet.
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(env);
    env.connect(gainNode);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  function playSegmentCreated() {
    if (mode === 'off') return;
    ensureContext();
    if (!ctx || !gainNode) return;

    // 880Hz sine wave, 50ms with fast decay
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(env);
    env.connect(gainNode);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    vibrate(30);
  }

  function playFigureClosed() {
    if (mode === 'off') return;
    ensureContext();
    if (!ctx || !gainNode) return;

    // Two sine waves 440Hz + 660Hz chord, 80ms with decay
    for (const freq of [440, 660]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.3, ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(env);
      env.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  }

  return {
    playSnap,
    playSegmentCreated,
    playFigureClosed,
    setGain(value: number) {
      ensureContext();
      if (gainNode) gainNode.gain.value = Math.max(0, Math.min(1, value));
    },
    setMode(newMode: SoundMode) {
      mode = newMode;
      if (newMode !== 'off') ensureContext();
    },
    getMode() {
      return mode;
    },
    dispose() {
      if (ctx) {
        ctx.close();
        ctx = null;
        gainNode = null;
      }
    },
  };
}
