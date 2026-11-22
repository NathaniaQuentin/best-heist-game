// The game world: one fresh state and one fixed step of it. No DOM
// here, so the same step drives the live game and the screenshot
// staging — and a logic test can run it in plain Node.
import { ALARM, CAMERA, COIN_FLIGHT_SECONDS, COIN_HEAR_RADIUS, GUARD, PLAYER, RUBY_CRACK_SECONDS } from './config.js';
import { CAMERAS, CASE, EXIT, GUARD_DEFS, LOOT, PLAYER_START, RUBY, collides } from './level.js';
import { cameraSees, distractGuard, makeGuard, updateGuard } from './guards.js';
import { sfxAlarm, sfxCaught, sfxCoin, sfxPickup, sfxRuby, sfxSpotted, sfxWin } from './audio.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './render.js';

export function timeText(t) {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A fresh game: Mara at the service door, guards on patrol, alarm 0. */
export function newWorld() {
  return {
    screen: SCREEN_PLAY,
    time: 0,
    player: { x: PLAYER_START.x, y: PLAYER_START.y, dir: 0, sneaking: false },
    guards: GUARD_DEFS.map(makeGuard),
    alarm: 0,
    alarmPeak: 0,
    alarmBand: 0,
    score: 0,
    coins: PLAYER.coins,
    lootTaken: new Set(),
    rubyTaken: false,
    crack: 0,
    coin: null,
    cameraSeen: new Set(),
    caughtReason: '',
  };
}

function caught(state, reason) {
  state.screen = SCREEN_CAUGHT;
  state.caughtReason = reason;
  sfxCaught();
}

/**
 * One fixed step. `input` is { move: {x, y}, sneak: boolean, click: {x, y} | null }.
 * The click is consumed by this step only.
 */
export function stepWorld(state, dt, input) {
  if (state.screen !== SCREEN_PLAY) return;
  state.time += dt;
  const p = state.player;
  const speed = input.sneak ? PLAYER.sneak : PLAYER.walk;
  p.sneaking = input.sneak;
  const mx = input.move.x * speed * dt;
  const my = input.move.y * speed * dt;
  const ox = p.x;
  const oy = p.y;
  if (mx !== 0 || my !== 0) {
    p.dir = Math.atan2(input.move.y, input.move.x);
    if (!collides(p.x + mx, p.y, PLAYER.radius)) p.x += mx;
    if (!collides(p.x, p.y + my, PLAYER.radius)) p.y += my;
  }
  // "Moving" means Mara actually changed position — leaning on a
  // wall or a display case counts as standing still.
  const moving = Math.hypot(p.x - ox, p.y - oy) > 0.01;

  // Coin toss: click throws one at the clicked spot.
  if (input.click && state.coins > 0 && !state.coin) {
    state.coins -= 1;
    state.coin = { x0: p.x, y0: p.y, x1: input.click.x, y1: input.click.y, t: 0, landed: false, until: 0 };
  }
  if (state.coin) {
    const coin = state.coin;
    coin.t += dt / COIN_FLIGHT_SECONDS;
    if (coin.t >= 1 && !coin.landed) {
      coin.landed = true;
      coin.x = coin.x1;
      coin.y = coin.y1;
      coin.until = state.time + 0.8;
      sfxCoin();
      for (const g of state.guards) {
        if (Math.hypot(g.x - coin.x, g.y - coin.y) < COIN_HEAR_RADIUS) distractGuard(g, coin.x, coin.y);
      }
    } else if (!coin.landed) {
      const k = Math.min(1, coin.t);
      coin.x = coin.x0 + (coin.x1 - coin.x0) * k;
      coin.y = coin.y0 + (coin.y1 - coin.y0) * k;
    } else if (state.time >= coin.until) {
      state.coin = null;
    }
  }

  // Cracking the ruby case: stand close and still, and the ring fills.
  const caseDist = Math.hypot(p.x - RUBY.x, p.y - RUBY.y);
  if (!state.rubyTaken && caseDist < 40 && !moving) {
    state.crack = Math.min(1, state.crack + dt / RUBY_CRACK_SECONDS);
    if (state.crack >= 1) {
      state.rubyTaken = true;
      state.score += RUBY.value;
      state.alarm = Math.min(ALARM.max, state.alarm + ALARM.rubyTrip);
      sfxRuby();
    }
  } else if (!state.rubyTaken) {
    state.crack = Math.max(0, state.crack - dt / RUBY_CRACK_SECONDS);
  }

  // Side loot: touch to pocket it.
  for (const loot of LOOT) {
    if (state.lootTaken.has(loot.id)) continue;
    if (Math.hypot(p.x - loot.x, p.y - loot.y) < 22) {
      state.lootTaken.add(loot.id);
      state.score += loot.value;
      sfxPickup();
    }
  }

  // Guards and cameras.
  let chasing = false;
  let suspicious = false;
  for (const g of state.guards) {
    const event = updateGuard(g, dt, p, state.time);
    if (event === 'chase') sfxSpotted();
    if (event === 'caught') {
      caught(state, `${g.name} caught Mara in the gallery.`);
      return;
    }
    if (g.mode === 'chase') chasing = true;
    if (g.mode === 'suspect') suspicious = true;
  }
  state.cameraSeen = new Set();
  for (const cam of CAMERAS) {
    if (cameraSees(cam, state.time, p)) state.cameraSeen.add(cam);
  }
  const cameraHot = state.cameraSeen.size > 0;

  // The alarm: rises while Mara is seen, falls while she is hidden.
  if (chasing) state.alarm += ALARM.guardChase * dt;
  else if (suspicious) state.alarm += ALARM.guardSuspect * dt;
  if (cameraHot) state.alarm += CAMERA.alarmPerSecond * dt;
  if (!chasing && !suspicious && !cameraHot) state.alarm -= ALARM.decay * dt;
  state.alarm = Math.max(0, Math.min(ALARM.max, state.alarm));
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
  const band = state.alarm >= 80 ? 2 : state.alarm >= 50 ? 1 : 0;
  if (band > state.alarmBand) sfxAlarm();
  state.alarmBand = band;
  if (state.alarm >= ALARM.max) {
    caught(state, 'The alarm hit 100 and the doors sealed shut.');
    return;
  }

  // The way out: the service door, once the ruby is in hand.
  if (state.rubyTaken && Math.hypot(p.x - EXIT.x, p.y - EXIT.y) < EXIT.r) {
    state.screen = SCREEN_WIN;
    state.score += Math.max(0, 300 - Math.floor(state.time) * 2);
    sfxWin();
  }
}
