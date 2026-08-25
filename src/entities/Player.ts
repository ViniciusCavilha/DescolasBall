import { GAME_CONFIG } from '../config/gameConfig';
import type { InputManager } from '../core/input/InputManager';
import { Vector2 } from '../core/math/Vector2';
import type { Renderer } from '../rendering/Renderer';
import type { Entity } from './Entity';

export class Player implements Entity {
  public position: Vector2;
  public velocity = Vector2.ZERO;
  public orientation = new Vector2(1, 0);

  public readonly radius = GAME_CONFIG.player.radius;
  public readonly maximumSpeed = GAME_CONFIG.player.maximumSpeed;
  public readonly accelerationRate = GAME_CONFIG.player.accelerationRate;
  public readonly decelerationRate = GAME_CONFIG.player.decelerationRate;

  public constructor(
    initialPosition: Vector2,
    private readonly input: InputManager,
  ) {
    this.position = initialPosition;
  }

  public update(deltaTime: number): void {
    const inputDirection = this.getInputDirection();

    if (inputDirection.magnitude() > 0) {
      this.orientation = inputDirection;
      const targetVelocity = inputDirection.scale(this.maximumSpeed);
      this.velocity = this.approachVelocity(
        targetVelocity,
        this.accelerationRate,
        deltaTime,
      );
    } else {
      this.velocity = this.approachVelocity(
        Vector2.ZERO,
        this.decelerationRate,
        deltaTime,
      );

      if (this.velocity.magnitude() < GAME_CONFIG.player.stopSpeed) {
        this.velocity = Vector2.ZERO;
      }
    }

    this.velocity = this.velocity.clampMagnitude(this.maximumSpeed);
    this.position = this.position.add(this.velocity.scale(deltaTime));
  }

  public render(renderer: Renderer): void {
    renderer.drawCircle(this.position.x, this.position.y, this.radius, {
      fillColor: GAME_CONFIG.player.fillColor,
      strokeColor: GAME_CONFIG.player.strokeColor,
      lineWidth: GAME_CONFIG.player.strokeWidth,
    });
  }

  public constrainToWorld(worldWidth: number, worldHeight: number): void {
    const clampedX = Math.min(
      Math.max(this.position.x, this.radius),
      worldWidth - this.radius,
    );
    const clampedY = Math.min(
      Math.max(this.position.y, this.radius),
      worldHeight - this.radius,
    );

    const hitHorizontalBoundary = clampedX !== this.position.x;
    const hitVerticalBoundary = clampedY !== this.position.y;

    this.position = new Vector2(clampedX, clampedY);
    this.velocity = new Vector2(
      hitHorizontalBoundary ? 0 : this.velocity.x,
      hitVerticalBoundary ? 0 : this.velocity.y,
    );
  }

  private getInputDirection(): Vector2 {
    const horizontal = Number(this.input.isActionActive('moveRight'))
      - Number(this.input.isActionActive('moveLeft'));
    const vertical = Number(this.input.isActionActive('moveDown'))
      - Number(this.input.isActionActive('moveUp'));

    return new Vector2(horizontal, vertical).normalize();
  }

  private approachVelocity(
    target: Vector2,
    rate: number,
    deltaTime: number,
  ): Vector2 {
    const blend = 1 - Math.exp(-rate * deltaTime);
    return this.velocity.add(target.subtract(this.velocity).scale(blend));
  }
}
