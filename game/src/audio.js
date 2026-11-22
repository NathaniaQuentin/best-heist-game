// Synthesized sound, no audio files: a few oscillator blips for the
// coin, the loot, the alarm and the getaway. Silent until the first
// key or click, so the browser's autoplay rules are never fought.
let ctx = null;
let muted = false;

function ensure() {
  if (ctx === null) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    } catch {
      ctx = undefined;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx || null;
}

/** Call from the first keydown or click. */
export function unlockAudio() {
  ensure();
}

function tone(freq, seconds, type = 'sine', gain = 0.08, when = 0) {
  const ac = ensure();
  if (!ac || muted) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}

export function sfxCoin() {
  tone(1320, 0.09, 'triangle', 0.07);
  tone(1760, 0.12, 'triangle', 0.05, 0.06);
}

export function sfxPickup() {
  tone(660, 0.1, 'sine', 0.09);
  tone(990, 0.16, 'sine', 0.09, 0.08);
}

export function sfxRuby() {
  tone(523, 0.12, 'sine', 0.1);
  tone(659, 0.12, 'sine', 0.1, 0.1);
  tone(784, 0.22, 'sine', 0.1, 0.2);
}

export function sfxAlarm() {
  tone(880, 0.14, 'square', 0.045);
  tone(622, 0.14, 'square', 0.045, 0.16);
}

export function sfxSpotted() {
  tone(392, 0.1, 'sawtooth', 0.06);
  tone(523, 0.14, 'sawtooth', 0.06, 0.09);
}

export function sfxCaught() {
  tone(220, 0.3, 'sawtooth', 0.09);
  tone(165, 0.45, 'sawtooth', 0.09, 0.22);
}

export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, i * 0.12));
}

export function toggleMute() {
  muted = !muted;
  return muted;
}
