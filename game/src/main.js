// The Gilded Hour — entry point. Runs the loop, wires input, and
// stages a screenshot scene when the page opens with ?shot=.
import { STEP, VIEW_H, VIEW_W } from './config.js';
import { bindInput, moveVector, sneaking, takeAnyKey, takeClick } from './input.js';
import { toggleMute, unlockAudio } from './audio.js';
import { newWorld, stepWorld, timeText } from './world.js';
import { draw, SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

function render(state) {
  draw(ctx, {
    ...state,
    timeText: timeText(state.time),
  });
}

if (shot) {
  // A staged screenshot: play the real rules forward, draw once, stop.
  const world = stageShot(shot);
  document.title = `The Gilded Hour — ${shot}`;
  render(world);
} else {
  let state = newWorld();
  state.screen = SCREEN_TITLE;
  bindInput(canvas, unlockAudio);
  render(state);

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      if (state.screen === SCREEN_PLAY) {
        stepWorld(state, STEP, { move: moveVector(), sneak: sneaking(), click: takeClick() });
      }
    }
    // Title and end screens answer to a key or a click.
    const key = takeAnyKey();
    const clicked = takeClick();
    if (key === 'm' || key === 'M') toggleMute();
    if (state.screen === SCREEN_TITLE && (key === 'enter' || clicked)) {
      state = newWorld();
      state.screen = SCREEN_PLAY;
    } else if ((state.screen === SCREEN_WIN || state.screen === SCREEN_CAUGHT) && key === 'r') {
      state = newWorld();
      state.screen = SCREEN_PLAY;
    } else if (state.screen === SCREEN_TITLE && key === 'r') {
      state = newWorld();
      state.screen = SCREEN_PLAY;
    }
    render(state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
