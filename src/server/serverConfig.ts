function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : fallback;
}

export const SERVER_CONFIG = {
  port: readPort(process.env.DESCOLASBALL_SERVER_PORT, 3001),
  tickRate: 60,
  networkSendRate: 20,
  matchId: 'default',
  world: { width: 1600, height: 900 },
  player: { radius: 32, maximumSpeed: 320 },
  matchDurationSeconds: 5 * 60,
} as const;
