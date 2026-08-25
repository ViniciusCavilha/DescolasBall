import { Vector2 } from './Vector2';

export interface WorldBoundsClampResult {
  position: Vector2;
  clampedHorizontally: boolean;
  clampedVertically: boolean;
}

// Positional safeguard until field-wall physics replaces this clamp.
export function clampCircleToWorldBounds(
  position: Vector2,
  radius: number,
  worldWidth: number,
  worldHeight: number,
): WorldBoundsClampResult {
  const clampedX = Math.min(
    Math.max(position.x, radius),
    worldWidth - radius,
  );
  const clampedY = Math.min(
    Math.max(position.y, radius),
    worldHeight - radius,
  );

  return {
    position: new Vector2(clampedX, clampedY),
    clampedHorizontally: clampedX !== position.x,
    clampedVertically: clampedY !== position.y,
  };
}
