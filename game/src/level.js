// The Grand Gallery of the Meridian Museum: its walls, cover, loot,
// cameras, guard routes and the service door. Every rect here blocks
// movement and blocks line of sight, so a pedestal is real cover.
import { VIEW_H, VIEW_W } from './config.js';

export const PLAY_TOP = 56;
export const PLAY_BOTTOM = VIEW_H - 8;
export const PLAY_LEFT = 8;
export const PLAY_RIGHT = VIEW_W - 8;

/** Solid rectangles: the outer walls plus two partitions with gaps. */
export const WALLS = [
  { x: 0, y: 52, w: VIEW_W, h: 8 }, // top wall under the HUD
  { x: 0, y: VIEW_H - 8, w: VIEW_W, h: 8 }, // bottom wall
  { x: 0, y: 52, w: 8, h: VIEW_H - 60 }, // left wall
  { x: VIEW_W - 8, y: 52, w: 8, h: VIEW_H - 60 }, // right wall
  { x: 380, y: 56, w: 12, h: 224 }, // left partition, gap below it
  { x: 888, y: 200, w: 12, h: 272 }, // right partition, gap above it
];

/** Display pedestals and benches: cover Mara can hide behind. */
export const COVER = [
  { x: 300, y: 160, w: 46, h: 30 },
  { x: 560, y: 140, w: 46, h: 30 },
  { x: 720, y: 350, w: 46, h: 30 },
  { x: 980, y: 150, w: 46, h: 30 },
  { x: 1050, y: 330, w: 46, h: 30 },
  { x: 480, y: 380, w: 70, h: 18 },
  { x: 820, y: 120, w: 70, h: 18 },
];

/** The glass case in the middle of the room, holding the Sun Ruby. */
export const CASE = { x: 617, y: 241, w: 46, h: 46 };

/** Side loot on pedestals: optional, each worth points. */
export const LOOT = [
  { id: 'idol', name: 'Golden Idol', x: 323, y: 175, value: 150, color: '#ffd166' },
  { id: 'vase', name: 'Jade Vase', x: 1003, y: 165, value: 120, color: '#7fe0a8' },
  { id: 'necklace', name: 'Diamond Necklace', x: 1073, y: 345, value: 180, color: '#b8a7ff' },
];

export const RUBY = { name: 'Sun Ruby', x: 640, y: 264, value: 500 };

/** Security cameras on the top wall, sweeping downward. */
export const CAMERAS = [
  { x: 430, y: 68, base: Math.PI / 2, phase: 0 },
  { x: 900, y: 68, base: Math.PI / 2, phase: 1.7 },
];

/** Guard patrol loops: name, colour, waypoints, start corner. */
export const GUARD_DEFS = [
  {
    name: 'Rook',
    color: '#d8d3c3',
    waypoints: [
      { x: 160, y: 120 },
      { x: 160, y: 400 },
      { x: 280, y: 400 },
      { x: 280, y: 120 },
    ],
  },
  {
    name: 'Bishop',
    color: '#e8c9a0',
    waypoints: [
      { x: 940, y: 120 },
      { x: 940, y: 400 },
      { x: 1140, y: 400 },
      { x: 1140, y: 120 },
    ],
  },
  {
    name: 'Knight',
    color: '#c3d8e8',
    waypoints: [
      { x: 420, y: 190 },
      { x: 860, y: 190 },
      { x: 860, y: 335 },
      { x: 420, y: 335 },
    ],
  },
];

export const PLAYER_START = { x: 48, y: 438 };
/** The service door on the left wall: enter here, escape here. */
export const EXIT = { x: 24, y: 446, r: 26 };

/** Every solid rect in the room, for collision and sight. */
export function solids() {
  return [...WALLS, ...COVER, CASE];
}

function circleHitsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

/** Whether a circle at (x, y) with radius r overlaps any solid. */
export function collides(x, y, r) {
  for (const rect of solids()) {
    if (circleHitsRect(x, y, r, rect)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // A segment crosses a rect when either end is inside it, or it cuts an edge.
  const inside = (x, y) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  if (inside(x1, y1) || inside(x2, y2)) return true;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  const d = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  for (const [ax, ay, bx, by] of edges) {
    const d1 = d(x1, y1, x2, y2, ax, ay);
    const d2 = d(x1, y1, x2, y2, bx, by);
    const d3 = d(ax, ay, bx, by, x1, y1);
    const d4 = d(ax, ay, bx, by, x2, y2);
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  }
  return false;
}

/** Whether any solid blocks the sight line between two points. */
export function sightBlocked(x1, y1, x2, y2) {
  for (const rect of solids()) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return true;
  }
  return false;
}
