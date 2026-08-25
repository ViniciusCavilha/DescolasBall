import { Vector2 } from './math/Vector2';

export interface Circle {
  readonly position: Vector2;
  readonly radius: number;
}

export interface MovingCircle extends Circle {
  readonly velocity: Vector2;
}

export interface CircleCollisionInfo {
  normal: Vector2;
  overlap: number;
}

export interface BallCollisionResolution {
  position: Vector2;
  velocity: Vector2;
}

export interface SegmentCollisionResolution extends BallCollisionResolution {
  collided: boolean;
}

const COLLISION_EPSILON = 1e-8;
const DEFAULT_COLLISION_NORMAL = new Vector2(1, 0);

export function detectCircleCollision(
  player: Circle,
  ball: Circle,
  fallbackNormal = DEFAULT_COLLISION_NORMAL,
): CircleCollisionInfo | null {
  if (
    !player.position.isFinite()
    || !ball.position.isFinite()
    || !Number.isFinite(player.radius)
    || !Number.isFinite(ball.radius)
  ) {
    return null;
  }

  const combinedRadius = Math.max(player.radius, 0) + Math.max(ball.radius, 0);
  const offset = ball.position.subtract(player.position);
  const distanceSquared = offset.dot(offset);

  if (distanceSquared >= combinedRadius * combinedRadius) {
    return null;
  }

  if (distanceSquared <= COLLISION_EPSILON * COLLISION_EPSILON) {
    const safeFallback = fallbackNormal.normalize();
    return {
      normal: safeFallback.magnitude() > 0
        ? safeFallback
        : DEFAULT_COLLISION_NORMAL,
      overlap: combinedRadius,
    };
  }

  const distance = Math.sqrt(distanceSquared);
  return {
    normal: offset.scale(1 / distance),
    overlap: combinedRadius - distance,
  };
}

export function resolvePlayerBallCollision(
  player: MovingCircle,
  ball: MovingCircle,
  collision: CircleCollisionInfo,
  transferFactor: number,
  maximumBallSpeed: number,
): BallCollisionResolution {
  const normal = collision.normal.normalize();
  const safeNormal = normal.magnitude() > 0
    ? normal
    : DEFAULT_COLLISION_NORMAL;
  const correctedPosition = resolveCircleOverlap(ball.position, collision);

  const playerVelocity = player.velocity.isFinite()
    ? player.velocity
    : Vector2.ZERO;
  let ballVelocity = ball.velocity.isFinite()
    ? ball.velocity
    : Vector2.ZERO;

  const playerNormalSpeed = playerVelocity.dot(safeNormal);
  const ballNormalSpeed = ballVelocity.dot(safeNormal);
  const safeTransferFactor = Number.isFinite(transferFactor)
    ? Math.max(transferFactor, 0)
    : 0;
  const targetNormalSpeed = playerNormalSpeed > 0
    ? playerNormalSpeed * safeTransferFactor
    : 0;

  if (ballNormalSpeed < targetNormalSpeed) {
    ballVelocity = ballVelocity.add(
      safeNormal.scale(targetNormalSpeed - ballNormalSpeed),
    );
  }

  ballVelocity = ballVelocity.clampMagnitude(maximumBallSpeed);

  return {
    position: correctedPosition.isFinite()
      ? correctedPosition
      : ball.position,
    velocity: ballVelocity.isFinite() ? ballVelocity : Vector2.ZERO,
  };
}

export function resolveCircleOverlap(
  circlePosition: Vector2,
  collision: CircleCollisionInfo,
): Vector2 {
  const normal = collision.normal.normalize();
  const safeNormal = normal.magnitude() > 0
    ? normal
    : DEFAULT_COLLISION_NORMAL;
  const safeOverlap = Number.isFinite(collision.overlap)
    ? Math.max(collision.overlap, 0)
    : 0;
  const correctedPosition = circlePosition.add(safeNormal.scale(safeOverlap));
  return correctedPosition.isFinite() ? correctedPosition : circlePosition;
}

export function resolveCircleSegmentCollision(
  circle: MovingCircle,
  segmentStart: Vector2,
  segmentEnd: Vector2,
  restitution: number,
): SegmentCollisionResolution {
  const segment = segmentEnd.subtract(segmentStart);
  const segmentLengthSquared = segment.dot(segment);

  if (segmentLengthSquared <= COLLISION_EPSILON * COLLISION_EPSILON) {
    return {
      position: circle.position,
      velocity: circle.velocity,
      collided: false,
    };
  }

  const progress = Math.min(
    Math.max(
      circle.position.subtract(segmentStart).dot(segment)
        / segmentLengthSquared,
      0,
    ),
    1,
  );
  const closestPoint = segmentStart.add(segment.scale(progress));
  const offset = circle.position.subtract(closestPoint);
  const distanceSquared = offset.dot(offset);

  if (distanceSquared >= circle.radius * circle.radius) {
    return {
      position: circle.position,
      velocity: circle.velocity,
      collided: false,
    };
  }

  const distance = Math.sqrt(Math.max(distanceSquared, 0));
  const normal = distance > COLLISION_EPSILON
    ? offset.scale(1 / distance)
    : getSegmentFallbackNormal(segment, circle.velocity);
  const overlap = circle.radius - distance;
  const correctedPosition = circle.position.add(normal.scale(overlap));
  const safeRestitution = Number.isFinite(restitution)
    ? Math.min(Math.max(restitution, 0), 1)
    : 0;
  const safeVelocity = circle.velocity.isFinite()
    ? circle.velocity
    : Vector2.ZERO;
  const normalSpeed = safeVelocity.dot(normal);
  const reflectedVelocity = normalSpeed < 0
    ? safeVelocity.subtract(normal.scale((1 + safeRestitution) * normalSpeed))
    : safeVelocity;

  return {
    position: correctedPosition.isFinite()
      ? correctedPosition
      : circle.position,
    velocity: reflectedVelocity.isFinite()
      ? reflectedVelocity
      : Vector2.ZERO,
    collided: true,
  };
}

function getSegmentFallbackNormal(
  segment: Vector2,
  velocity: Vector2,
): Vector2 {
  let normal = new Vector2(-segment.y, segment.x).normalize();
  if (velocity.isFinite() && velocity.dot(normal) > 0) {
    normal = normal.scale(-1);
  }

  return normal.magnitude() > 0 ? normal : DEFAULT_COLLISION_NORMAL;
}
