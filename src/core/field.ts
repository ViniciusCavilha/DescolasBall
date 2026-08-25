import { Vector2 } from './math/Vector2';

export type FieldSide = 'left' | 'right';
export type WallKind = 'field' | 'goal';

export interface FieldWall {
  start: Vector2;
  end: Vector2;
  kind: WallKind;
}

export interface FieldGeometry {
  width: number;
  height: number;
  goalDepth: number;
  goalTop: number;
  goalBottom: number;
  walls: readonly FieldWall[];
}

export function createFieldGeometry(
  worldWidth: number,
  worldHeight: number,
  goalOpeningSize: number,
  goalDepth: number,
): FieldGeometry {
  const safeOpeningSize = Math.min(
    Math.max(goalOpeningSize, 0),
    worldHeight,
  );
  const safeGoalDepth = Math.max(goalDepth, 0);
  const goalTop = (worldHeight - safeOpeningSize) / 2;
  const goalBottom = goalTop + safeOpeningSize;

  const walls: FieldWall[] = [
    wall(0, 0, worldWidth, 0, 'field'),
    wall(0, worldHeight, worldWidth, worldHeight, 'field'),
    wall(0, 0, 0, goalTop, 'field'),
    wall(0, goalBottom, 0, worldHeight, 'field'),
    wall(worldWidth, 0, worldWidth, goalTop, 'field'),
    wall(worldWidth, goalBottom, worldWidth, worldHeight, 'field'),
    wall(-safeGoalDepth, goalTop, -safeGoalDepth, goalBottom, 'goal'),
    wall(-safeGoalDepth, goalTop, 0, goalTop, 'goal'),
    wall(-safeGoalDepth, goalBottom, 0, goalBottom, 'goal'),
    wall(
      worldWidth + safeGoalDepth,
      goalTop,
      worldWidth + safeGoalDepth,
      goalBottom,
      'goal',
    ),
    wall(worldWidth, goalTop, worldWidth + safeGoalDepth, goalTop, 'goal'),
    wall(
      worldWidth,
      goalBottom,
      worldWidth + safeGoalDepth,
      goalBottom,
      'goal',
    ),
  ];

  return {
    width: worldWidth,
    height: worldHeight,
    goalDepth: safeGoalDepth,
    goalTop,
    goalBottom,
    walls,
  };
}

export function detectGoalCrossing(
  previousPosition: Vector2,
  currentPosition: Vector2,
  field: FieldGeometry,
): FieldSide | null {
  if (!previousPosition.isFinite() || !currentPosition.isFinite()) {
    return null;
  }

  if (previousPosition.x >= 0 && currentPosition.x < 0) {
    const crossingY = interpolateYAtX(previousPosition, currentPosition, 0);
    if (isInsideGoalOpening(crossingY, field)) {
      // Entering the left goal awards the point to the right side.
      return 'right';
    }
  }

  if (
    previousPosition.x <= field.width
    && currentPosition.x > field.width
  ) {
    const crossingY = interpolateYAtX(
      previousPosition,
      currentPosition,
      field.width,
    );
    if (isInsideGoalOpening(crossingY, field)) {
      // Entering the right goal awards the point to the left side.
      return 'left';
    }
  }

  return null;
}

export function hasWallTunnelingRisk(
  maximumSpeed: number,
  fixedDeltaTime: number,
  circleRadius: number,
): boolean {
  return maximumSpeed * fixedDeltaTime >= circleRadius * 2;
}

function wall(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  kind: WallKind,
): FieldWall {
  return {
    start: new Vector2(startX, startY),
    end: new Vector2(endX, endY),
    kind,
  };
}

function interpolateYAtX(
  start: Vector2,
  end: Vector2,
  x: number,
): number {
  const horizontalDistance = end.x - start.x;
  if (horizontalDistance === 0) {
    return end.y;
  }

  const progress = (x - start.x) / horizontalDistance;
  return start.y + (end.y - start.y) * progress;
}

function isInsideGoalOpening(y: number, field: FieldGeometry): boolean {
  return y >= field.goalTop && y <= field.goalBottom;
}
