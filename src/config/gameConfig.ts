export const GAME_CONFIG = {
  worldWidth: 1280,
  worldHeight: 720,
  targetFps: 60,
  maxFrameDeltaSeconds: 0.25,
  backgroundColor: '#10182b',
  accentColor: '#5ee7a8',
  textColor: '#f6f8ff',
} as const;

export const FIXED_DELTA_TIME = 1 / GAME_CONFIG.targetFps;
