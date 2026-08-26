import { FIXED_DELTA_TIME, GAME_CONFIG } from '../config/gameConfig';
import {
  createFieldGeometry,
  detectGoalCrossing,
  hasWallTunnelingRisk,
} from './field';
import {
  detectCircleCollision,
  resolveCircleSegmentCollision,
  resolvePlayerBallCollision,
} from './collision';
import { InputManager } from './input/InputManager';
import { applyKick } from './kick';
import { Match } from './Match';
import { Vector2 } from './math/Vector2';
import { Ball } from '../entities/Ball';
import type { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Renderer } from '../rendering/Renderer';

export class Game {
  private static readonly KICK_FEEDBACK_DURATION_SECONDS = 0.12;

  private readonly input = new InputManager();
  private readonly player = new Player(
    new Vector2(
      GAME_CONFIG.spawn.playerPosition.x,
      GAME_CONFIG.spawn.playerPosition.y,
    ),
    this.input,
  );
  private readonly ball = new Ball(
    new Vector2(
      GAME_CONFIG.spawn.ballPosition.x,
      GAME_CONFIG.spawn.ballPosition.y,
    ),
    new Vector2(
      GAME_CONFIG.ball.initialVelocity.x,
      GAME_CONFIG.ball.initialVelocity.y,
    ),
  );
  private readonly field = createFieldGeometry(
    GAME_CONFIG.worldWidth,
    GAME_CONFIG.worldHeight,
    GAME_CONFIG.field.goalOpeningSize,
    GAME_CONFIG.field.goalDepth,
  );

  private readonly entities: Entity[] = [this.player, this.ball];
  private readonly match = new Match(GAME_CONFIG.match);
  private kickFeedbackRemainingSeconds = 0;
  private loopFps = 0;
  private renderedFrames = 0;

  public constructor(private readonly renderer: Renderer) {
    if (
      hasWallTunnelingRisk(
        GAME_CONFIG.ball.maximumSpeed,
        FIXED_DELTA_TIME,
        GAME_CONFIG.ball.radius,
      )
    ) {
      throw new Error(
        'A velocidade máxima da bola exige detecção contínua de paredes.',
      );
    }
  }

  public update(deltaTime: number): void {
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0
      ? deltaTime
      : 0;
    this.kickFeedbackRemainingSeconds = Math.max(
      this.kickFeedbackRemainingSeconds - safeDeltaTime,
      0,
    );

    if (this.input.consumeActionPress('restartMatch')) {
      this.match.startNewMatch();
      this.resetEntities();
    }

    const kickJustPressed = this.input.consumeActionPress('kick');
    const kickJustReleased = this.input.consumeActionRelease('kick');
    const kickHeld = this.input.isActionActive('kick');
    const wasPlaying = this.match.isPlaying();
    this.match.update(deltaTime);
    if (!wasPlaying || !this.match.isPlaying()) {
      this.player.cancelKickCharge();
      return;
    }

    this.updatePhysics(
      deltaTime,
      kickJustPressed,
      kickJustReleased,
      kickHeld,
    );
  }

  private updatePhysics(
    deltaTime: number,
    kickJustPressed: boolean,
    kickJustReleased: boolean,
    kickHeld: boolean,
  ): void {
    this.player.update(deltaTime);
    this.player.constrainToWorld(
      GAME_CONFIG.worldWidth,
      GAME_CONFIG.worldHeight,
    );

    if (kickJustPressed) {
      this.player.startKickCharge();
    }

    if (kickJustReleased) {
      const forceMultiplier = this.player.releaseKickCharge();
      if (forceMultiplier !== null) {
        this.tryKick(forceMultiplier);
      }
    } else if (!kickHeld) {
      this.player.cancelKickCharge();
    }

    const previousBallPosition = this.ball.position;
    this.ball.update(deltaTime);
    this.resolveBallFieldWalls();

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
      this.resolveBallFieldWalls();
    }

    const scoringSide = detectGoalCrossing(
      previousBallPosition,
      this.ball.position,
      this.field,
    );
    if (scoringSide) {
      this.match.registerGoal(scoringSide);
      this.resetEntities();
    }
  }

  private tryKick(forceMultiplier: number): void {
    const kick = applyKick(
      this.player,
      this.ball,
      GAME_CONFIG.player.kickRange,
      GAME_CONFIG.player.kickForce * forceMultiplier,
      GAME_CONFIG.ball.maximumSpeed,
    );

    if (kick) {
      this.ball.position = kick.position;
      this.ball.velocity = kick.velocity;
      this.player.startKickCooldown();
      this.kickFeedbackRemainingSeconds = Game.KICK_FEEDBACK_DURATION_SECONDS;
    }
  }

  public render(): void {
    this.renderedFrames += 1;
    this.renderer.beginFrame();
    this.renderer.clear(GAME_CONFIG.backgroundColor);
    this.renderer.drawField(this.field);

    for (const entity of this.entities) {
      this.renderer.drawEntity(entity);
    }

    if (this.kickFeedbackRemainingSeconds > 0) {
      this.renderer.drawKickFeedback(
        this.player.position,
        this.player.radius + 13,
      );
    }

    const kickChargeProgress = this.player.getKickChargeProgress();
    if (kickChargeProgress !== null) {
      this.renderer.drawKickChargeBar(
        this.player.position,
        kickChargeProgress,
      );
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
    this.renderer.drawText('Mover: WASD/setas · Chutar: ESPAÇO', 32, 108, {
      font: '16px system-ui, sans-serif',
    });
    this.renderer.drawMatchHud(this.match.getView());
    this.renderer.endFrame();
  }

  public setLoopFps(fps: number): void {
    this.loopFps = fps;
  }

  public dispose(): void {
    this.input.dispose();
    this.renderer.dispose();
  }

  private resolveBallFieldWalls(): void {
    for (let pass = 0; pass < 2; pass += 1) {
      for (const wall of this.field.walls) {
        const resolution = resolveCircleSegmentCollision(
          this.ball,
          wall.start,
          wall.end,
          GAME_CONFIG.field.wallRestitution,
        );

        if (resolution.collided) {
          this.ball.position = resolution.position;
          this.ball.velocity = resolution.velocity.clampMagnitude(
            GAME_CONFIG.ball.maximumSpeed,
          );
        }
      }
    }
  }

  private resetEntities(): void {
    this.kickFeedbackRemainingSeconds = 0;
    this.player.reset(
      new Vector2(
        GAME_CONFIG.spawn.playerPosition.x,
        GAME_CONFIG.spawn.playerPosition.y,
      ),
    );
    this.ball.reset(
      new Vector2(
        GAME_CONFIG.spawn.ballPosition.x,
        GAME_CONFIG.spawn.ballPosition.y,
      ),
    );
  }
}
