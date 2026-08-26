import { GAME_CONFIG } from '../config/gameConfig';
import type { InputManager } from '../core/input/InputManager';
import { Vector2 } from '../core/math/Vector2';
import { clampCircleToWorldBounds } from '../core/math/worldBounds';
import type { Renderer } from '../rendering/Renderer';
import type { Entity } from './Entity';

export type KickState = 'idle' | 'charging' | 'ready' | 'cooldown';

export class Player implements Entity {
  public position: Vector2;
  public velocity = Vector2.ZERO;
  public facingDirection = new Vector2(1, 0);
  private kickState: KickState = 'idle';
  private kickChargeSeconds = 0;
  private kickCooldownRemainingSeconds = 0;

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
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0
      ? deltaTime
      : 0;
    this.kickCooldownRemainingSeconds = Math.max(
      this.kickCooldownRemainingSeconds - safeDeltaTime,
      0,
    );
    if (
      this.kickState === 'cooldown'
      && this.kickCooldownRemainingSeconds <= 0
    ) {
      this.kickState = 'idle';
    }

    if (this.kickState === 'charging') {
      this.kickChargeSeconds = Math.min(
        this.kickChargeSeconds + safeDeltaTime,
        GAME_CONFIG.player.powerShotChargeSeconds,
      );
      if (
        this.kickChargeSeconds
        >= GAME_CONFIG.player.powerShotChargeSeconds
      ) {
        this.kickState = 'ready';
      }
    }

    const inputDirection = this.getInputDirection();

    if (inputDirection.magnitude() > 0) {
      this.facingDirection = inputDirection;
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
    this.renderForViewer(renderer, true);
  }

  public renderForViewer(renderer: Renderer, showFacingIndicator: boolean): void {
    renderer.drawCircle(this.position.x, this.position.y, this.radius, {
      fillColor: GAME_CONFIG.player.fillColor,
      strokeColor: GAME_CONFIG.player.strokeColor,
      lineWidth: GAME_CONFIG.player.strokeWidth,
    });
    if (showFacingIndicator) {
      renderer.drawFacingIndicator(this.position, this.facingDirection, this.radius);
    }
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

  public reset(position: Vector2): void {
    this.position = position;
    this.velocity = Vector2.ZERO;
    this.facingDirection = new Vector2(1, 0);
    this.kickState = 'idle';
    this.kickChargeSeconds = 0;
    this.kickCooldownRemainingSeconds = 0;
  }

  public startKickCharge(): void {
    if (this.kickState !== 'idle') {
      return;
    }

    this.kickState = 'charging';
    this.kickChargeSeconds = 0;
  }

  public releaseKickCharge(): number | null {
    if (this.kickState !== 'charging' && this.kickState !== 'ready') {
      return null;
    }

    const multiplier = this.kickState === 'ready'
      ? GAME_CONFIG.player.powerShotMultiplier
      : 1;
    this.kickState = 'idle';
    this.kickChargeSeconds = 0;
    return multiplier;
  }

  public cancelKickCharge(): void {
    if (this.kickState === 'charging' || this.kickState === 'ready') {
      this.kickState = 'idle';
      this.kickChargeSeconds = 0;
    }
  }

  public getKickChargeProgress(): number | null {
    if (this.kickState !== 'charging' && this.kickState !== 'ready') {
      return null;
    }

    return Math.min(
      this.kickChargeSeconds / GAME_CONFIG.player.powerShotChargeSeconds,
      1,
    );
  }

  public startKickCooldown(): void {
    this.kickState = 'cooldown';
    this.kickChargeSeconds = 0;
    this.kickCooldownRemainingSeconds = GAME_CONFIG.player.kickCooldownSeconds;
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
