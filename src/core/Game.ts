import { GAME_CONFIG } from '../config/gameConfig';
import {
  detectCircleCollision,
  resolvePlayerBallCollision,
} from './collision';
import { InputManager } from './input/InputManager';
import { Vector2 } from './math/Vector2';
import { Ball } from '../entities/Ball';
import type { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Renderer } from '../rendering/Renderer';

export class Game {
  private readonly input = new InputManager();
  private readonly player = new Player(
    new Vector2(GAME_CONFIG.worldWidth / 2, GAME_CONFIG.worldHeight / 2),
    this.input,
  );
  private readonly ball = new Ball(
    new Vector2(
      GAME_CONFIG.ball.initialPosition.x,
      GAME_CONFIG.ball.initialPosition.y,
    ),
    new Vector2(
      GAME_CONFIG.ball.initialVelocity.x,
      GAME_CONFIG.ball.initialVelocity.y,
    ),
  );

  private readonly entities: Entity[] = [this.player, this.ball];
  private loopFps = 0;
  private renderedFrames = 0;

  public constructor(private readonly renderer: Renderer) {}

  public update(deltaTime: number): void {
    this.player.update(deltaTime);
    this.player.constrainToWorld(
      GAME_CONFIG.worldWidth,
      GAME_CONFIG.worldHeight,
    );

    this.ball.update(deltaTime);
    this.ball.constrainToWorld(
      GAME_CONFIG.worldWidth,
      GAME_CONFIG.worldHeight,
    );

    const collision = detectCircleCollision(
      this.player,
      this.ball,
      this.player.orientation,
    );

    if (collision) {
      const resolution = resolvePlayerBallCollision(
        this.player,
        this.ball,
        collision,
        GAME_CONFIG.ball.collisionTransferFactor,
        GAME_CONFIG.ball.maximumSpeed,
      );
      this.ball.position = resolution.position;
      this.ball.velocity = resolution.velocity;
      this.ball.constrainToWorld(
        GAME_CONFIG.worldWidth,
        GAME_CONFIG.worldHeight,
      );
    }
  }

  public render(): void {
    this.renderedFrames += 1;
    this.renderer.beginFrame();
    this.renderer.clear(GAME_CONFIG.backgroundColor);

    for (const entity of this.entities) {
      this.renderer.drawEntity(entity);
    }

    this.renderer.drawText(
      'DescolasBall',
      32,
      40,
      {
        color: GAME_CONFIG.accentColor,
        font: '700 34px system-ui, sans-serif',
      },
    );
    this.renderer.drawText(
      `Loop ativo · ${Math.round(this.loopFps)} FPS · frame ${this.renderedFrames}`,
      32,
      78,
      {
        font: '18px system-ui, sans-serif',
      },
    );
    this.renderer.drawText('Mover: WASD ou setas', 32, 108, {
      font: '16px system-ui, sans-serif',
    });
    this.renderer.endFrame();
  }

  public setLoopFps(fps: number): void {
    this.loopFps = fps;
  }

  public dispose(): void {
    this.input.dispose();
    this.renderer.dispose();
  }
}
