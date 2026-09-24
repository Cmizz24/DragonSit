// Tiny WebAudio synth for sound effects; no audio files needed.
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slide = 0) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + delay;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.1, delay = 0) {
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start(c.currentTime + delay);
}

const SOUNDS = {
  tap: () => tone(600, 0.06, 'square', 0.04),
  coin: () => { tone(1200, 0.08, 'square', 0.08); tone(1800, 0.12, 'square', 0.08, 0.07); },
  build: () => { tone(300, 0.12, 'triangle', 0.15); tone(450, 0.15, 'triangle', 0.15, 0.1); noise(0.1, 0.05, 0.05); },
  hatch: () => { noise(0.15, 0.08); tone(520, 0.1, 'triangle', 0.12, 0.1); tone(780, 0.1, 'triangle', 0.12, 0.2); tone(1040, 0.25, 'triangle', 0.12, 0.3); },
  feed: () => { tone(400, 0.08, 'sine', 0.12); tone(600, 0.1, 'sine', 0.12, 0.08); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, i * 0.09)); },
  hit: () => { noise(0.12, 0.12); tone(180, 0.15, 'sawtooth', 0.12, 0, -120); },
  crit: () => { noise(0.2, 0.18); tone(120, 0.25, 'sawtooth', 0.18, 0, -80); tone(900, 0.1, 'square', 0.08, 0.05); },
  miss: () => tone(300, 0.15, 'sine', 0.08, 0, -150),
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.11)); },
  lose: () => { [400, 350, 300, 200].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.08, i * 0.18)); },
  error: () => tone(200, 0.15, 'square', 0.06, 0, -60),
  breed: () => { tone(660, 0.12, 'sine', 0.12); tone(880, 0.12, 'sine', 0.12, 0.12); tone(660, 0.12, 'sine', 0.12, 0.24); },
  reward: () => { [784, 988, 1175].forEach((f, i) => tone(f, 0.15, 'square', 0.07, i * 0.08)); },
};

export const sfx = {
  play(name) {
    if (!enabled) return;
    try {
      const fn = SOUNDS[name];
      if (fn) fn();
    } catch (err) {
      /* ignore audio errors */
    }
  },
  setEnabled(v) {
    enabled = !!v;
  },
  unlock() {
    ac();
  },
};
