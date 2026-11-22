// The Gilded Hour — tuning constants for a museum heist.
// One frame shows the whole Grand Gallery: 1280 by 480, HUD on top.
export const VIEW_W = 1280;
export const VIEW_H = 480;
export const HUD_H = 52;
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 10,
  walk: 152,
  sneak: 86,
  coins: 3,
};

export const GUARD = {
  radius: 11,
  patrol: 56,
  chase: 98,
  investigate: 70,
  range: 170,
  halfAngle: 0.58, // about 33 degrees each side
  suspectAt: 0.4,
  chaseAt: 0.8,
  catchDistance: 21,
  detectNear: 0.95, // per second, closer than 80 px
  detectMid: 0.45, // per second, 80 to 130 px
  detectFar: 0.3, // per second, beyond 130 px
  decay: 1.0, // per second while unseen
  sneakFactor: 0.5, // sneaking halves how fast a guard spots Mara
  loseSightAfter: 2.5, // seconds of no sight before a chasing guard gives up
  investigateSeconds: 3,
};

export const CAMERA = {
  range: 212,
  halfAngle: 0.52, // about 30 degrees each side
  sweep: 0.96, // radians each side of straight down
  speed: 0.55, // radians per second
  alarmPerSecond: 16,
};

export const ALARM = {
  max: 100,
  guardChase: 18, // per second while any guard chases
  guardSuspect: 7, // per second while any guard is suspicious
  decay: 7, // per second while nobody sees Mara
  rubyTrip: 15, // alarm jumps when the case is cracked open
};

export const RUBY_CRACK_SECONDS = 1.4;
export const COIN_FLIGHT_SECONDS = 0.45;
export const COIN_HEAR_RADIUS = 200;

export const COLORS = {
  floorA: '#221d33',
  floorB: '#1d1930',
  wall: '#3a2f5c',
  wallEdge: '#6b5a9e',
  gold: '#e8b64c',
  goldDim: '#9c7c33',
  velvet: '#a41f3d',
  caseGlass: '#9fd8e8',
  ruby: '#ff2e63',
  idol: '#ffd166',
  vase: '#7fe0a8',
  necklace: '#b8a7ff',
  guard: '#d8d3c3',
  guardSuspect: '#ff9f2e',
  guardChase: '#ff3b30',
  cone: 'rgba(232, 182, 76, 0.20)',
  coneSuspect: 'rgba(255, 159, 46, 0.28)',
  coneChase: 'rgba(255, 59, 48, 0.30)',
  cameraCone: 'rgba(255, 80, 110, 0.16)',
  cameraHot: 'rgba(255, 80, 110, 0.34)',
  player: '#20242e',
  playerTrim: '#f4f1e6',
  hud: '#14101f',
  hudLine: '#3a2f5c',
  text: '#f4efe2',
  textDim: '#b9b2c9',
  alarmOk: '#57d977',
  alarmMid: '#ffb02e',
  alarmHot: '#ff3b30',
};
