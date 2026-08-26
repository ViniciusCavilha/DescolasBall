const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;

export const GAME_CONFIG = {
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  targetFps: 60,
  maxFrameDeltaSeconds: 0.25,
  backgroundColor: '#10182b',
  accentColor: '#5ee7a8',
  textColor: '#f6f8ff',
  ui: {
    teamA: { name: 'TEAM A', color: '#ff4d6d' },
    teamB: { name: 'TEAM B', color: '#4da3ff' },
  },
  player: {
    radius: 32,
    maximumSpeed: 320,
    accelerationRate: 6.5,
    decelerationRate: 8,
    stopSpeed: 0.5,
    kickRange: 100,
    kickConeHalfAngleDegrees: 55,
    kickForce: 600,
    kickCooldownSeconds: 0.35,
    powerShotChargeSeconds: 1.5,
    powerShotMultiplier: 3,
    fillColor: '#5ee7a8',
    strokeColor: '#eafff5',
    strokeWidth: 5,
  },
  ball: {
    radius: 18,
    initialVelocity: {
      x: 0,
      y: 0,
    },
    fillColor: '#f8fafc',
    strokeColor: '#334155',
    strokeWidth: 4,
    friction: 1.1,
    maximumSpeed: 1800,
    minimumSpeedThreshold: 1,
    collisionTransferFactor: 1.15,
  },
  field: {
    goalOpeningSize: 220,
    goalDepth: 80,
    wallRestitution: 0.82,
    surfaceColor: '#167a4b',
    lineColor: '#d9f5e7',
    goalColor: '#cbd5e1',
    lineWidth: 4,
    centerCircleRadius: 90,
    penaltyAreaWidth: 180,
    penaltyAreaHeight: 360,
  },
  match: {
    durationSeconds: 5 * 60,
    goalPauseDurationSeconds: 2,
    countdownStartValue: 3,
    countdownStepDurationSeconds: 1,
  },
  spawn: {
    ballPosition: {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    },
    playerPosition: {
      x: WORLD_WIDTH / 4,
      y: WORLD_HEIGHT / 2,
    },
  },
} as const;

export const FIXED_DELTA_TIME = 1 / GAME_CONFIG.targetFps;
