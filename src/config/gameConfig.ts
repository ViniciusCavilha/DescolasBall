const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

export const GAME_CONFIG = {
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  targetFps: 60,
  maxFrameDeltaSeconds: 0.25,
  backgroundColor: '#10182b',
  accentColor: '#5ee7a8',
  textColor: '#f6f8ff',
  player: {
    radius: 32,
    maximumSpeed: 420,
    accelerationRate: 8,
    decelerationRate: 6,
    stopSpeed: 0.5,
    fillColor: '#5ee7a8',
    strokeColor: '#eafff5',
    strokeWidth: 5,
  },
  ball: {
    radius: 18,
    initialPosition: {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    },
    initialVelocity: {
      x: 0,
      y: 0,
    },
    fillColor: '#f8fafc',
    strokeColor: '#334155',
    strokeWidth: 4,
  },
} as const;

export const FIXED_DELTA_TIME = 1 / GAME_CONFIG.targetFps;
