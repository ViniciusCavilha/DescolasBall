import { GAME_CONFIG } from '../config/gameConfig';
import { Vector2 } from '../core/math/Vector2';
import { clampCircleToWorldBounds } from '../core/math/worldBounds';
import type { Renderer } from '../rendering/Renderer';
import type { Entity } from './Entity';

export class Ball implements Entity {
  public readonly radius = GAME_CONFIG.ball.radius;
  public readonly fillColor = GAME_CONFIG.ball.fillColor;
  public readonly strokeColor = GAME_CONFIG.ball.strokeColor;

  public constructor(
    public position: Vector2,
    public velocity: Vector2,
  ) {}

  public update(deltaTime: number): void {
    this.position = this.position.add(this.velocity.scale(deltaTime));
  }

  public render(renderer: Renderer): void {
    renderer.drawCircle(this.position.x, this.position.y, this.radius, {
      fillColor: this.fillColor,
      strokeColor: this.strokeColor,
      lineWidth: GAME_CONFIG.ball.strokeWidth,
    });
  }

  public constrainToWorld(worldWidth: number, worldHeight: number): void {
    const constraint = clampCircleToWorldBounds(
      this.position,
      this.radius,
      worldWidth,
      worldHeight,
    );

    this.position = constraint.position;
    this.velocity = new Vector2(
      constraint.clampedHorizontally ? 0 : this.velocity.x,
      constraint.clampedVertically ? 0 : this.velocity.y,
    );
  }
}
