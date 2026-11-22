// Guard patrols and security cameras: what they see, how they react.
// A guard patrols its loop, grows suspicious as it spots Mara, gives
// chase when sure, and investigates the last place it saw her — or a
// coin it heard land. Cameras sweep their cones and feed the alarm.
import { CAMERA, GUARD } from './config.js';
import { collides, sightBlocked } from './level.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** A guard from its patrol definition, standing at its first waypoint. */
export function makeGuard(def) {
  const first = def.waypoints[0];
  return {
    name: def.name,
    color: def.color,
    waypoints: def.waypoints,
    x: first.x,
    y: first.y,
    dir: 0,
    wp: 1,
    mode: 'patrol', // patrol | suspect | chase | investigate | return
    detect: 0,
    pauseUntil: 0,
    lastSeen: { x: first.x, y: first.y },
    loseTimer: 0,
    target: null,
    lookUntil: 0,
  };
}

/** Whether `watcher` at (x, y) facing `dir` can see the player. */
export function canSee(x, y, dir, range, halfAngle, player) {
  const dx = player.x - x;
  const dy = player.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { seen: false, dist };
  if (dist < 12) return { seen: true, dist };
  if (Math.abs(angleDiff(Math.atan2(dy, dx), dir)) > halfAngle) return { seen: false, dist };
  if (sightBlocked(x, y, player.x, player.y)) return { seen: false, dist };
  return { seen: true, dist };
}

function detectRate(dist, sneaking) {
  let rate = dist < 80 ? GUARD.detectNear : dist < 130 ? GUARD.detectMid : GUARD.detectFar;
  if (sneaking) rate *= GUARD.sneakFactor;
  return rate;
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  // Axis-separated so a guard slides along a wall instead of sticking.
  if (!collides(nx, g.y, GUARD.radius)) g.x = nx;
  if (!collides(g.x, ny, GUARD.radius)) g.y = ny;
  g.dir = Math.atan2(dy, dx);
  return dist - step < 6;
}

/**
 * Step one guard. Returns 'caught' when it reaches Mara, 'chase' the
 * moment it commits to the chase, else null.
 */
export function updateGuard(g, dt, player, now) {
  const seen = canSee(g.x, g.y, g.dir, GUARD.range, GUARD.halfAngle, player);
  if (seen.seen) {
    g.detect = Math.min(1, g.detect + detectRate(seen.dist, player.sneaking) * dt);
    g.lastSeen = { x: player.x, y: player.y };
    g.loseTimer = 0;
  } else {
    g.detect = Math.max(0, g.detect - GUARD.decay * dt);
    if (g.mode === 'chase') g.loseTimer += dt;
  }

  if (g.mode !== 'chase' && g.detect >= GUARD.chaseAt) {
    g.mode = 'chase';
    return 'chase';
  }

  if (g.mode === 'patrol') {
    if (g.detect >= GUARD.suspectAt) {
      g.mode = 'suspect';
    } else if (now < g.pauseUntil) {
      // Paused at a waypoint, turning toward the next one.
      const next = g.waypoints[g.wp];
      const want = Math.atan2(next.y - g.y, next.x - g.x);
      g.dir += angleDiff(want, g.dir) * Math.min(1, dt * 3);
    } else {
      const target = g.waypoints[g.wp];
      if (moveToward(g, target.x, target.y, GUARD.patrol, dt)) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.pauseUntil = now + 0.8;
      }
    }
  } else if (g.mode === 'suspect') {
    // Stands and stares at where Mara was last seen.
    g.dir = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
    if (g.detect < GUARD.suspectAt - 0.1) g.mode = 'patrol';
  } else if (g.mode === 'chase') {
    if (seen.seen) {
      moveToward(g, player.x, player.y, GUARD.chase, dt);
    } else if (g.loseTimer > GUARD.loseSightAfter) {
      g.mode = 'investigate';
      g.target = { ...g.lastSeen };
    } else {
      moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.chase, dt);
    }
    if (Math.hypot(player.x - g.x, player.y - g.y) < GUARD.catchDistance) return 'caught';
  } else if (g.mode === 'investigate') {
    if (g.target && moveToward(g, g.target.x, g.target.y, GUARD.investigate, dt)) {
      if (g.lookUntil === 0) g.lookUntil = now + GUARD.investigateSeconds;
      g.dir += dt * 1.5;
      if (now >= g.lookUntil) {
        g.mode = 'return';
        g.lookUntil = 0;
        g.target = null;
      }
    }
  } else if (g.mode === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let best = 0;
    let bestDist = Infinity;
    g.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - g.x, w.y - g.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const target = g.waypoints[best];
    if (moveToward(g, target.x, target.y, GUARD.patrol, dt)) {
      g.wp = (best + 1) % g.waypoints.length;
      g.mode = 'patrol';
    }
  }
  return null;
}

/** A coin landing distracts a patrolling or suspicious guard. */
export function distractGuard(g, x, y) {
  if (g.mode === 'chase') return;
  g.mode = 'investigate';
  g.target = { x, y };
  g.detect = 0;
  g.lookUntil = 0;
}

/** A camera's sweeping angle at time `t` (seconds). */
export function cameraAngle(cam, t) {
  return cam.base + Math.sin(t * CAMERA.speed + cam.phase) * CAMERA.sweep;
}

/** Whether a camera currently sees the player. */
export function cameraSees(cam, t, player) {
  const angle = cameraAngle(cam, t);
  return canSee(cam.x, cam.y, angle, CAMERA.range, CAMERA.halfAngle, player).seen;
}
