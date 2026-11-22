// Keyboard and mouse state, in canvas coordinates. Clicking throws a
// coin at the clicked spot; the game consumes one click per toss.
import { VIEW_H, VIEW_W } from './config.js';

const keys = new Set();
let clickQueue = [];
let anyKey = null;

/** Wire the listeners once; canvas is the game's <canvas>. */
export function bindInput(canvas, onFirstGesture) {
  let gestured = false;
  const gesture = () => {
    if (!gestured) {
      gestured = true;
      onFirstGesture();
    }
  };
  window.addEventListener('keydown', (event) => {
    gesture();
    const key = event.key.toLowerCase();
    keys.add(key);
    anyKey = key;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (event) => {
    gesture();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    clickQueue.push({ x, y });
  });
}

/** Held movement keys as a unit vector (or 0, 0). */
export function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function sneaking() {
  return keys.has('shift');
}

/** The next queued click, or null. */
export function takeClick() {
  return clickQueue.shift() ?? null;
}

/** Any key pressed since the last call (for title / end screens). */
export function takeAnyKey() {
  const key = anyKey;
  anyKey = null;
  return key;
}
