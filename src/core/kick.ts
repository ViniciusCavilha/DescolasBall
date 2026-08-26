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
  kickConeHalfAngleDegrees: number,
  kickForce: number,
  maximumBallSpeed: number,
): KickResult | null {
  const offset = ball.position.subtract(player.position);
  const direction = player.facingDirection.normalize();
  if (direction.magnitude() === 0 || !direction.isFinite()) {
    return null;
  }
  if (!isInsideKickCone(
    offset,
    direction,
    kickRange,
    kickConeHalfAngleDegrees,
  )) return null;

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

export function isInsideKickCone(
  offsetToBall: Player['position'],
  facingDirection: Player['facingDirection'],
  kickRange: number,
  halfAngleDegrees: number,
): boolean {
  if (!offsetToBall.isFinite() || !facingDirection.isFinite()) return false;
  const safeRange = Number.isFinite(kickRange) ? Math.max(kickRange, 0) : 0;
  const distance = offsetToBall.magnitude();
  if (!Number.isFinite(distance) || distance > safeRange) return false;
  const facing = facingDirection.normalize();
  if (facing.magnitude() === 0) return false;
  if (distance === 0) return true;
  const safeHalfAngle = Number.isFinite(halfAngleDegrees)
    ? Math.min(Math.max(halfAngleDegrees, 0), 180)
    : 0;
  const minimumAlignment = Math.cos(safeHalfAngle * Math.PI / 180);
  return facing.dot(offsetToBall.scale(1 / distance)) >= minimumAlignment;
}
