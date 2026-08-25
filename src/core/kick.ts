import type { Ball } from '../entities/Ball';
import type { Player } from '../entities/Player';
import { detectCircleCollision, resolveCircleOverlap } from './collision';

export interface KickResult {
  position: Ball['position'];
  velocity: Ball['velocity'];
}

export function applyKick(
  player: Player,
  ball: Ball,
  kickRange: number,
  kickForce: number,
  maximumBallSpeed: number,
): KickResult | null {
  const offset = ball.position.subtract(player.position);
  const safeRange = Number.isFinite(kickRange) ? Math.max(kickRange, 0) : 0;
  if (offset.magnitude() > safeRange) {
    return null;
  }

  const direction = player.orientation.normalize();
  if (direction.magnitude() === 0 || !direction.isFinite()) {
    return null;
  }

  const collision = detectCircleCollision(player, ball, direction);
  const position = collision
    ? resolveCircleOverlap(ball.position, collision)
    : ball.position;
  const safeForce = Number.isFinite(kickForce) ? Math.max(kickForce, 0) : 0;
  const velocity = direction
    .scale(safeForce)
    .clampMagnitude(maximumBallSpeed);

  return {
    position,
    velocity,
  };
}
