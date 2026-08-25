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
    kickRange: 76,
    kickForce: 680,
    kickCooldownSeconds: 0.35,
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
    friction: 1.35,
    maximumSpeed: 720,
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
