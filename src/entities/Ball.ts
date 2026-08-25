import { GAME_CONFIG } from '../config/gameConfig';
import { Vector2 } from '../core/math/Vector2';
import type { Renderer } from '../rendering/Renderer';
import type { Entity } from './Entity';

export class Ball implements Entity {
  public readonly radius = GAME_CONFIG.ball.radius;
  public readonly fillColor = GAME_CONFIG.ball.fillColor;
  public readonly strokeColor = GAME_CONFIG.ball.strokeColor;
  public readonly friction = GAME_CONFIG.ball.friction;
  public readonly maximumSpeed = GAME_CONFIG.ball.maximumSpeed;

  public constructor(
    public position: Vector2,
    public velocity: Vector2,
  ) {}

  public update(deltaTime: number): void {
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0
      ? deltaTime
      : 0;

    if (!this.position.isFinite()) {
      this.position = new Vector2(
        GAME_CONFIG.spawn.ballPosition.x,
        GAME_CONFIG.spawn.ballPosition.y,
      );
    }

    if (!this.velocity.isFinite()) {
      this.velocity = Vector2.ZERO;
    }

    this.velocity = this.velocity.clampMagnitude(this.maximumSpeed);

    if (this.velocity.magnitude() < GAME_CONFIG.ball.minimumSpeedThreshold) {
      this.velocity = Vector2.ZERO;
    }

    const nextPosition = this.position.add(this.velocity.scale(safeDeltaTime));
    this.position = nextPosition.isFinite()
      ? nextPosition
      : new Vector2(
        GAME_CONFIG.spawn.ballPosition.x,
        GAME_CONFIG.spawn.ballPosition.y,
      );

    const safeFriction = Number.isFinite(this.friction)
      ? Math.max(this.friction, 0)
      : 0;
    const frictionDecay = Math.exp(-safeFriction * safeDeltaTime);
    this.velocity = this.velocity
      .scale(frictionDecay)
      .clampMagnitude(this.maximumSpeed);

    if (this.velocity.magnitude() < GAME_CONFIG.ball.minimumSpeedThreshold) {
      this.velocity = Vector2.ZERO;
    }
  }

  public render(renderer: Renderer): void {
    renderer.drawCircle(this.position.x, this.position.y, this.radius, {
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      lineWidth: GAME_CONFIG.ball.strokeWidth,
    });
  }

  public reset(position: Vector2): void {
    this.position = position;
    this.velocity = Vector2.ZERO;
  }
}
