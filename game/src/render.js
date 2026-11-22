// Drawing: the gallery at night, the cones, the HUD and the screens.
// Everything the judge needs to see — room, thief, guards and cones,
// cameras, the ruby, the alarm meter — is in one 1280 by 480 frame.
import { ALARM, CAMERA, COLORS, GUARD, HUD_H, VIEW_H, VIEW_W } from './config.js';
import { CAMERAS, CASE, COVER, EXIT, LOOT, PLAY_BOTTOM, PLAY_LEFT, PLAY_RIGHT, PLAY_TOP, RUBY, WALLS } from './level.js';
import { cameraAngle } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

const PAINTINGS = [
  { x: 150, y: 64, w: 64, h: 22, color: '#7a4a6b' },
  { x: 560, y: 64, w: 64, h: 22, color: '#4a6b7a' },
  { x: 1020, y: 64, w: 64, h: 22, color: '#6b7a4a' },
  { x: 14, y: 150, w: 22, h: 64, color: '#8a6a3a' },
  { x: 14, y: 300, w: 22, h: 64, color: '#3a5a8a' },
  { x: 1244, y: 150, w: 22, h: 64, color: '#8a3a4a' },
  { x: 1244, y: 300, w: 22, h: 64, color: '#4a8a5a' },
];

function wedge(ctx, x, y, dir, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawFloor(ctx) {
  const tile = 40;
  for (let y = PLAY_TOP; y < PLAY_BOTTOM; y += tile) {
    for (let x = PLAY_LEFT; x < PLAY_RIGHT; x += tile) {
      const odd = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
      ctx.fillStyle = odd ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, Math.min(tile, PLAY_RIGHT - x), Math.min(tile, PLAY_BOTTOM - y));
    }
  }
  // Deep-red carpet runner along the bottom of the hall.
  ctx.fillStyle = '#4a1626';
  ctx.fillRect(PLAY_LEFT, 420, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - 420);
  ctx.fillStyle = COLORS.goldDim;
  ctx.fillRect(PLAY_LEFT, 420, PLAY_RIGHT - PLAY_LEFT, 2);
  ctx.fillRect(PLAY_LEFT, PLAY_BOTTOM - 2, PLAY_RIGHT - PLAY_LEFT, 2);
}

function drawWalls(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallEdge;
    if (w.h <= 8) ctx.fillRect(w.x, w.y + w.h - 2, w.w, 2);
    else if (w.w <= 8) ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
    else ctx.fillRect(w.x, w.y, w.w, 2);
  }
  // Gold-framed paintings on the walls.
  for (const p of PAINTINGS) {
    ctx.fillStyle = COLORS.goldDim;
    ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  // The service door on the left wall, glowing green when it is the way out.
  ctx.fillStyle = '#1d5c33';
  ctx.fillRect(8, EXIT.y - 24, 10, 48);
  ctx.fillStyle = '#57d977';
  ctx.fillRect(10, EXIT.y - 22, 6, 44);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('EXIT', 22, EXIT.y - 28);
}

function drawCover(ctx) {
  for (const c of COVER) {
    ctx.fillStyle = '#2c2547';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#453a6e';
    ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.fillStyle = '#5a4d8a';
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, 3);
  }
}

function drawCaseAndLoot(ctx, state) {
  // Velvet ropes around the ruby case.
  ctx.strokeStyle = COLORS.velvet;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CASE.x - 52, CASE.y + 70);
  ctx.quadraticCurveTo(CASE.x + CASE.w / 2, CASE.y + 92, CASE.x + CASE.w + 52, CASE.y + 70);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CASE.x - 52, CASE.y - 24);
  ctx.quadraticCurveTo(CASE.x + CASE.w / 2, CASE.y - 46, CASE.x + CASE.w + 52, CASE.y - 24);
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  for (const [sx, sy] of [
    [CASE.x - 52, CASE.y + 70],
    [CASE.x + CASE.w + 52, CASE.y + 70],
    [CASE.x - 52, CASE.y - 24],
    [CASE.x + CASE.w + 52, CASE.y - 24],
  ]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // The glass case itself.
  ctx.fillStyle = '#20263a';
  ctx.fillRect(CASE.x, CASE.y, CASE.w, CASE.h);
  ctx.strokeStyle = COLORS.caseGlass;
  ctx.lineWidth = 2;
  ctx.strokeRect(CASE.x + 1, CASE.y + 1, CASE.w - 2, CASE.h - 2);
  ctx.fillStyle = 'rgba(159, 216, 232, 0.12)';
  ctx.fillRect(CASE.x + 2, CASE.y + 2, CASE.w - 4, CASE.h - 4);
  // The Sun Ruby, glowing while it is still in the case.
  if (!state.rubyTaken) {
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 3);
    const glow = ctx.createRadialGradient(RUBY.x, RUBY.y, 2, RUBY.x, RUBY.y, 34);
    glow.addColorStop(0, `rgba(255, 46, 99, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 46, 99, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(RUBY.x, RUBY.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ruby;
    ctx.beginPath();
    ctx.moveTo(RUBY.x, RUBY.y - 12);
    ctx.lineTo(RUBY.x + 9, RUBY.y);
    ctx.lineTo(RUBY.x, RUBY.y + 12);
    ctx.lineTo(RUBY.x - 9, RUBY.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(RUBY.x - 3, RUBY.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Side loot on its pedestals.
  for (const loot of LOOT) {
    if (state.lootTaken.has(loot.id)) continue;
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 2 + loot.x);
    const glow = ctx.createRadialGradient(loot.x, loot.y, 2, loot.x, loot.y, 22);
    glow.addColorStop(0, loot.color + Math.round(120 * pulse).toString(16).padStart(2, '0'));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = loot.color;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1930';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', loot.x, loot.y + 3);
  }
  // Crack progress ring while Mara works the case.
  if (state.crack > 0 && state.crack < 1 && !state.rubyTaken) {
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(RUBY.x, RUBY.y, 24, -Math.PI / 2, -Math.PI / 2 + state.crack * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING…', RUBY.x, RUBY.y + 38);
  }
}

function drawCones(ctx, state) {
  for (const cam of CAMERAS) {
    const angle = cameraAngle(cam, state.time);
    const hot = state.cameraSeen.has(cam) ? COLORS.cameraHot : COLORS.cameraCone;
    wedge(ctx, cam.x, cam.y, angle, CAMERA.range, CAMERA.halfAngle, hot);
  }
  for (const g of state.guards) {
    const fill = g.mode === 'chase' ? COLORS.coneChase : g.mode === 'suspect' ? COLORS.coneSuspect : COLORS.cone;
    wedge(ctx, g.x, g.y, g.dir, GUARD.range, GUARD.halfAngle, fill);
  }
}

function drawCameras(ctx, state) {
  for (const cam of CAMERAS) {
    const angle = cameraAngle(cam, state.time);
    ctx.fillStyle = '#3a3f52';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.cameraSeen.has(cam) ? '#ff3b30' : '#ff5b7a';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(angle) * 6, cam.y + Math.sin(angle) * 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    ctx.fillStyle = g.mode === 'chase' ? COLORS.guardChase : g.mode === 'suspect' ? COLORS.guardSuspect : g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#14101f';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#14101f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * (GUARD.radius + 5), g.y + Math.sin(g.dir) * (GUARD.radius + 5));
    ctx.stroke();
    // Hat brim.
    ctx.fillStyle = '#14101f';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 2, 5, Math.PI, 0);
    ctx.fill();
    if (g.mode === 'suspect' || g.mode === 'chase' || g.mode === 'investigate') {
      ctx.fillStyle = g.mode === 'chase' ? COLORS.guardChase : COLORS.gold;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.mode === 'chase' ? '!' : '?', g.x, g.y - GUARD.radius - 6);
    }
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y + GUARD.radius + 12);
  }
}

function drawCoin(ctx, state) {
  const coin = state.coin;
  if (!coin) return;
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5c14';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.playerTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // White mask band and the direction she faces.
  ctx.fillStyle = COLORS.playerTrim;
  ctx.fillRect(p.x - 6, p.y - 3, 12, 4);
  ctx.fillStyle = COLORS.playerTrim;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 7, p.y + Math.sin(p.dir) * 7, 2, 0, Math.PI * 2);
  ctx.fill();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(244, 241, 230, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED HOUR', 16, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.fillText(state.rubyTaken ? 'Ruby secured — reach the service door!' : 'Steal the Sun Ruby, then get out.', 16, 42);

  // Alarm meter.
  const alarm = state.alarm;
  const ax = 560;
  const aw = 240;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = '#2a2340';
  ctx.fillRect(ax, 26, aw, 12);
  const frac = alarm / ALARM.max;
  ctx.fillStyle = frac < 0.5 ? COLORS.alarmOk : frac < 0.8 ? COLORS.alarmMid : COLORS.alarmHot;
  ctx.fillRect(ax, 26, aw * frac, 12);
  ctx.strokeStyle = COLORS.hudLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 26, aw, 12);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(`${Math.round(alarm)}`, ax + aw + 8, 37);

  // Loot, coins, time.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(`$${state.score}`, 1010, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.fillText(`coins ${state.coins}   ${state.timeText}`, 1010, 42);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift sneak · Click toss a coin', 1060, 24);
  ctx.fillText('M mute', 1060, 42);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 8, 18, 0.62)';
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  const w = 560;
  const h = 120 + lines.length * 26;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2 + 20;
  ctx.fillStyle = '#171226';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 92 + i * 26);
  });
}

/** Draw one frame of the game. `state` carries screen, world and HUD data. */
export function draw(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawWalls(ctx);
  drawCover(ctx);
  drawCaseAndLoot(ctx, state);
  drawCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawCoin(ctx, state);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  if (state.screen === SCREEN_TITLE) {
    panel(ctx, 'THE GILDED HOUR', [
      'Mara Voss slips into the Meridian Museum after dark.',
      'Steal the Sun Ruby from its glass case — then reach the service door.',
      'Guards patrol with lantern cones. Cameras sweep the hall.',
      'Click tosses a coin to pull a guard away. Shift sneaks.',
      'Press Enter or click to begin.',
    ], COLORS.gold);
  } else if (state.screen === SCREEN_WIN) {
    panel(ctx, 'CLEAN GETAWAY', [
      `The Sun Ruby is yours — and nobody saw a thing.`,
      `Loot $${state.score}   ·   ${state.timeText}   ·   alarm peaked at ${Math.round(state.alarmPeak)}`,
      'Press R to run it again.',
    ], COLORS.alarmOk);
  } else if (state.screen === SCREEN_CAUGHT) {
    panel(ctx, 'CAUGHT!', [
      state.caughtReason,
      `Loot $${state.score}   ·   ${state.timeText}`,
      'Press R to try again.',
    ], COLORS.alarmHot);
  }
}
