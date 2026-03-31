import { createSoundEngine } from './sound';

// Mock AudioContext for testing (jsdom doesn't have Web Audio)
const mockOscillator = {
  type: 'sine',
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};
const mockGainNode = {
  gain: { value: 0.5, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};
const mockFilter = {
  type: 'lowpass',
  frequency: { value: 0 },
  connect: vi.fn(),
};
const mockBufferSource = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
};

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn();
  close = vi.fn();
  createOscillator = vi.fn(() => ({ ...mockOscillator }));
  createGain = vi.fn(() => ({ ...mockGainNode }));
  createBiquadFilter = vi.fn(() => ({ ...mockFilter }));
  createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => ({
    getChannelData: () => new Float32Array(length),
    length,
    sampleRate,
  }));
  createBufferSource = vi.fn(() => ({ ...mockBufferSource }));
}

// @ts-expect-error mock
globalThis.AudioContext = MockAudioContext;

describe('SoundEngine', () => {
  it('starts in off mode', () => {
    const engine = createSoundEngine();
    expect(engine.getMode()).toBe('off');
    engine.dispose();
  });

  it('switches modes', () => {
    const engine = createSoundEngine();
    engine.setMode('full');
    expect(engine.getMode()).toBe('full');
    engine.setMode('reduced');
    expect(engine.getMode()).toBe('reduced');
    engine.setMode('off');
    expect(engine.getMode()).toBe('off');
    engine.dispose();
  });

  it('does not play in off mode', () => {
    const engine = createSoundEngine();
    // Should not throw or create AudioContext
    engine.playSnap();
    engine.playSegmentCreated();
    engine.playFigureClosed();
    engine.dispose();
  });

  it('plays segment created in reduced mode', () => {
    const engine = createSoundEngine();
    engine.setMode('reduced');
    engine.playSegmentCreated(); // should not throw
    engine.dispose();
  });

  it('skips snap in reduced mode', () => {
    const engine = createSoundEngine();
    engine.setMode('reduced');
    engine.playSnap(); // should be no-op
    engine.dispose();
  });

  it('plays snap in full mode', () => {
    const engine = createSoundEngine();
    engine.setMode('full');
    engine.playSnap(); // should not throw
    engine.dispose();
  });

  it('debounces snap sounds', () => {
    const engine = createSoundEngine();
    engine.setMode('full');
    engine.playSnap(); // plays
    engine.playSnap(); // debounced (< 150ms)
    engine.dispose();
  });

  it('sets gain', () => {
    const engine = createSoundEngine();
    engine.setMode('full');
    engine.setGain(0.8); // should not throw
    engine.dispose();
  });
});
