// Screenshot staging: each scene plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and
// the same scene always gives the same frame.
import { CAMERA, GUARD, STEP } from './config.js';
import { CAMERAS, CASE, COVER, EXIT, RUBY } from './level.js';
import { canSee, cameraAngle } from './guards.js';
import { sightBlocked } from './level.js';
import { newWorld, stepWorld } from './world.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const ROUTE_TO_CASE = [
  { x: 200, y: 420 },
  { x: 380, y: 420 },
  { x: 580, y: 420 },
  { x: 580, y: 360 },
  { x: 640, y: 300 },
];
const ROUTE_TO_EXIT = [
  { x: 640, y: 360 },
  { x: 580, y: 420 },
  { x: 380, y: 420 },
  { x: 200, y: 420 },
  { x: 24, y: 446 },
];
// The reckless line: the same route to the case, walked with no
// waiting, no sneaking and no cover — straight through the cones.
const ALARM_ROUTE = [
  { x: 200, y: 420 },
  { x: 380, y: 420 },
  { x: 580, y: 420 },
  { x: 580, y: 360 },
  { x: 640, y: 300 },
];
// From the case, on through the gap above the right partition and
// down into Bishop's corner for the diamond necklace.
const ALARM_LOOT = [
  { x: 860, y: 150 },
  { x: 1000, y: 150 },
  { x: 1073, y: 345 },
];
// From the case, up to the spot under camera B.
const ALARM_CAM = [
  { x: 860, y: 150 },
  { x: 900, y: 200 },
];

/** Whether standing at (x, y) is inside any guard or camera cone. */
function dangerAt(x, y, state) {
  const probe = { x, y, sneaking: false };
  for (const g of state.guards) {
    if (canSee(g.x, g.y, g.dir, GUARD.range, GUARD.halfAngle, probe).seen) return true;
  }
  for (const cam of CAMERAS) {
    const angle = cameraAngle(cam, state.time);
    if (canSee(cam.x, cam.y, angle, CAMERA.range, CAMERA.halfAngle, probe).seen) return true;
  }
  return false;
}

/** Hiding spots: beside every pedestal and the case, out of the open. */
function hideSpots() {
  const spots = [];
  for (const r of [...COVER, CASE]) {
    spots.push({ x: r.x + r.w / 2, y: r.y - 26 });
    spots.push({ x: r.x + r.w / 2, y: r.y + r.h + 26 });
    spots.push({ x: r.x - 26, y: r.y + r.h / 2 });
    spots.push({ x: r.x + r.w + 26, y: r.y + r.h / 2 });
  }
  return spots.filter((s) => s.x > 24 && s.x < 1256 && s.y > 72 && s.y < 458);
}

/**
 * The nearest hiding spot the threatening guard cannot see into, and
 * no other guard can see either — null when every spot is watched.
 */
function bestHideSpot(state, threat) {
  const p = state.player;
  let best = null;
  let bestDist = 320;
  for (const spot of hideSpots()) {
    const d = Math.hypot(spot.x - p.x, spot.y - p.y);
    if (d >= bestDist) continue;
    if (sightBlocked(threat.x, threat.y, spot.x, spot.y)) {
      let watched = false;
      for (const g of state.guards) {
        if (g === threat) continue;
        const probe = { x: spot.x, y: spot.y, sneaking: true };
        if (canSee(g.x, g.y, g.dir, GUARD.range, GUARD.halfAngle, probe).seen) {
          watched = true;
          break;
        }
      }
      if (!watched) {
        best = spot;
        bestDist = d;
      }
    }
  }
  return best;
}

function nearestGuard(state) {
  const p = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const g of state.guards) {
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return { g: best, dist: bestDist };
}

/** Is the segment from `from` to `to` clear to walk right now — no cone
 *  covers any sampled point of it and no guard is near the segment? */
function segmentClear(state, from, to) {
  for (let i = 0; i <= 6; i++) {
    const x = from.x + ((to.x - from.x) * i) / 6;
    const y = from.y + ((to.y - from.y) * i) / 6;
    if (dangerAt(x, y, state)) return false;
  }
  for (const g of state.guards) {
    const segX = to.x - from.x;
    const segY = to.y - from.y;
    const len2 = segX * segX + segY * segY;
    let t = len2 === 0 ? 0 : ((g.x - from.x) * segX + (g.y - from.y) * segY) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = from.x + segX * t;
    const py = from.y + segY * t;
    if (Math.hypot(g.x - px, g.y - py) < 100) return false;
  }
  return true;
}

/**
 * Steer along `route`. A careful pilot checks the whole next segment
 * before leaving cover, waits behind a pedestal when it is watched,
 * ducks behind cover when a guard closes in or gives chase, and
 * sneaks near guards; a reckless one walks straight through.
 */
function pilot(state, route, index, careful) {
  const target = route[Math.min(index, route.length - 1)];
  const p = state.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 5) return { move: { x: 0, y: 0 }, sneak: false, arrived: true, click: null };
  if (careful) {
    const chasing = state.guards.some((g) => g.mode === 'chase');
    const near = nearestGuard(state);
    // Chased, or a guard is right on top of Mara: duck behind cover.
    if (chasing || near.dist < 90) {
      const spot = bestHideSpot(state, near.g);
      if (spot) {
        const sd = Math.hypot(spot.x - p.x, spot.y - p.y);
        if (sd > 12) {
          return { move: { x: (spot.x - p.x) / sd, y: (spot.y - p.y) / sd }, sneak: false, arrived: false, click: null };
        }
        return { move: { x: 0, y: 0 }, sneak: true, arrived: false, click: null };
      }
      // No cover to duck behind: run straight away from the guard.
      const ax = (p.x - near.g.x) / near.dist;
      const ay = (p.y - near.g.y) / near.dist;
      return { move: { x: ax, y: ay }, sneak: false, arrived: false, click: null };
    }
    // The next leg is watched: slip behind the nearest cover and wait.
    if (!segmentClear(state, p, target)) {
      const spot = bestHideSpot(state, near.g);
      if (spot) {
        const sd = Math.hypot(spot.x - p.x, spot.y - p.y);
        if (sd > 12) {
          return { move: { x: (spot.x - p.x) / sd, y: (spot.y - p.y) / sd }, sneak: false, arrived: false, click: null };
        }
        return { move: { x: 0, y: 0 }, sneak: true, arrived: false, click: null };
      }
      // No cover nearby: hold still and sneak until the leg clears.
      return { move: { x: 0, y: 0 }, sneak: true, arrived: false, click: null };
    }
    const nearGuard = state.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 160);
    return { move: { x: dx / dist, y: dy / dist }, sneak: nearGuard, arrived: false, click: null };
  }
  return { move: { x: dx / dist, y: dy / dist }, sneak: false, arrived: false, click: null };
}

function runRoute(state, route, careful, seconds) {
  let index = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen !== SCREEN_PLAY) return index;
    const { move, sneak, arrived, click } = pilot(state, route, index, careful);
    if (arrived) index += 1;
    stepWorld(state, STEP, { move, sneak, click });
  }
  return index;
}

/** Walk the case route, pull Knight away with a coin, crack the ruby. */
function stealRuby(state, careful) {
  // Reach the safe south line first.
  runRoute(state, ROUTE_TO_CASE.slice(0, 3), careful, 90);
  if (state.screen !== SCREEN_PLAY || state.rubyTaken) return;
  // Toss a coin north of Knight, 130 px ahead of him on open floor, to
  // pull him off the case before Mara steps up to it. Knight walks
  // north to the coin (back turned to the gallery) and investigates it
  // for three seconds — the window Mara uses to crack the case.
  if (state.coins > 0) {
    const knight = state.guards[2];
    let kx = Math.max(440, Math.min(840, knight.x));
    let ky = Math.max(90, knight.y - 130);
    if (ky > 110 && ky < 150 && kx > 800) kx = 790;
    stepWorld(state, STEP, { move: { x: 0, y: 0 }, sneak: false, click: { x: kx, y: ky } });
    for (let i = 0; i < 2.5 / STEP; i += 1) {
      if (state.screen !== SCREEN_PLAY) return;
      stepWorld(state, STEP, { move: { x: 0, y: 0 }, sneak: true, click: null });
    }
  }
  // Step up to the case and stand still until it cracks open. The
  // crack needs Mara within 40 px of the case centre; close in to
  // 38 px, then hold still — the case itself stops her at 34 px.
  runRoute(state, ROUTE_TO_CASE.slice(3), careful, 12);
  for (let i = 0; i < 10 / STEP && state.screen === SCREEN_PLAY && !state.rubyTaken; i += 1) {
    const p = state.player;
    const d = Math.hypot(RUBY.x - p.x, RUBY.y - p.y);
    if (d > 38) {
      stepWorld(state, STEP, { move: { x: (RUBY.x - p.x) / d, y: (RUBY.y - p.y) / d }, sneak: true, click: null });
    } else {
      stepWorld(state, STEP, { move: { x: 0, y: 0 }, sneak: true, click: null });
    }
  }
}

/**
 * Set a fresh world to the named scene and return it. Scenes: title
 * (the room at rest), heist (mid-robbery, ruby in hand), alarm (spotted,
 * alarm high) and escape (the getaway, won).
 */
export function stageShot(name) {
  const world = newWorld();
  if (name === 'heist') {
    stealRuby(world, true);
    if (world.screen === SCREEN_PLAY && world.rubyTaken) runRoute(world, ROUTE_TO_EXIT, true, 5);
    return world;
  }
  if (name === 'alarm') {
    // Reckless: march to the case with no waiting or sneaking and
    // grab the ruby, then run up under camera B and freeze there —
    // the camera keeps spotting Mara and the alarm climbs while the
    // guards close in.
    runRoute(world, ALARM_ROUTE, false, 10);
    if (world.screen === SCREEN_PLAY) runRoute(world, ALARM_CAM, false, 8);
    for (let i = 0; i < 10 / STEP && world.screen === SCREEN_PLAY; i += 1) {
      stepWorld(world, STEP, { move: { x: 0, y: 0 }, sneak: false, click: null });
    }
    return world;
  }
  if (name === 'escape') {
    stealRuby(world, true);
    if (world.screen === SCREEN_PLAY && world.rubyTaken) runRoute(world, ROUTE_TO_EXIT, true, 30);
    return world;
  }
  // Title: let the guards walk their patrols for a few seconds first.
  for (let i = 0; i < 5 / STEP; i += 1) {
    stepWorld(world, STEP, { move: { x: 0, y: 0 }, sneak: false, click: null });
  }
  world.screen = SCREEN_TITLE;
  return world;
}
