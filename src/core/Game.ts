import { FIXED_DELTA_TIME, GAME_CONFIG } from '../config/gameConfig';
import { detectGoalCrossing, hasWallTunnelingRisk } from './field';
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
import { Player } from '../entities/Player';
import { Renderer } from '../rendering/Renderer';
import { ARENAS, createArenaField, getArena, type ArenaDefinition } from './arenas';
import { GameSession, type PlayerSide } from './GameSession';
import { MatchMenu } from '../ui/MatchMenu';
import { MatchHud } from '../ui/MatchHud';
import type { NetworkClient } from '../client/network/NetworkClient';
import { canViewFacingIndicator } from './playerVisibility';

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
  private arena: ArenaDefinition = ARENAS[0];
  private field = createArenaField(this.arena);
  private readonly match = new Match(GAME_CONFIG.match);
  private readonly session = new GameSession();
  private readonly menu: MatchMenu;
  private readonly hud = new MatchHud();
  private menuOpen = false;
  private networkInputSequence = 0;
  private kickFeedbackRemainingSeconds = 0;

  public constructor(
    private readonly renderer: Renderer,
    private readonly networkClient: NetworkClient | null = null,
  ) {
    this.menu = new MatchMenu(this.session, {
      close: () => this.setMenuOpen(false),
      changeSide: (playerId, side) => this.changePlayerSide(playerId, side),
      togglePause: () => this.togglePause(),
      changeMap: (mapId) => this.changeMap(mapId),
    });
    this.renderer.setArena(this.arena);
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

    if (this.input.consumeActionPress('toggleMenu')) this.setMenuOpen(!this.menuOpen);
    if (this.menuOpen && this.input.consumeActionPress('closeMenu')) this.setMenuOpen(false);
    this.sendNetworkInput();
    if (this.menuOpen) {
      this.player.cancelKickCharge();
      this.match.update(deltaTime);
      return;
    }

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
    const localPlayerActive = this.isLocalPlayerActive();
    if (localPlayerActive) this.player.update(deltaTime);
    this.player.constrainToWorld(
      this.arena.width,
      this.arena.height,
    );

    if (localPlayerActive && kickJustPressed) {
      this.player.startKickCharge();
    }

    if (localPlayerActive && kickJustReleased) {
      const forceMultiplier = this.player.releaseKickCharge();
      if (forceMultiplier !== null) {
        this.tryKick(forceMultiplier);
      }
    } else if (!kickHeld) {
      this.player.cancelKickCharge();
    }

    const previousBallPosition = this.ball.position;
    this.ball.update(deltaTime);
    this.resolveBallFieldWalls(previousBallPosition);

    const collision = localPlayerActive ? detectCircleCollision(
      this.player,
      this.ball,
      this.player.facingDirection,
    ) : null;

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
    const previousBallPosition = this.ball.position;
    const kick = applyKick(
      this.player,
      this.ball,
      GAME_CONFIG.player.kickRange,
      GAME_CONFIG.player.kickConeHalfAngleDegrees,
      GAME_CONFIG.player.kickForce * forceMultiplier,
      GAME_CONFIG.player.kickExistingVelocityRetention,
      GAME_CONFIG.ball.maximumSpeed,
    );

    if (kick) {
      this.ball.position = kick.position;
      this.ball.velocity = kick.velocity;
      this.resolveBallFieldWalls(previousBallPosition);
      this.player.startKickCooldown();
      this.kickFeedbackRemainingSeconds = Game.KICK_FEEDBACK_DURATION_SECONDS;
    }
  }

  public render(): void {
    this.renderer.beginFrame();
    this.renderer.clear(GAME_CONFIG.backgroundColor);
    this.renderer.drawField(this.field);

    if (this.isLocalPlayerActive()) this.player.renderForViewer(this.renderer, true);
    this.drawRemotePlayers();
    this.renderer.drawEntity(this.ball);

    if (this.isLocalPlayerActive() && this.kickFeedbackRemainingSeconds > 0) {
      this.renderer.drawKickFeedback(
        this.player.position,
        this.player.radius + 13,
      );
    }

    const kickChargeProgress = this.isLocalPlayerActive() ? this.player.getKickChargeProgress() : null;
    if (kickChargeProgress !== null) {
      this.renderer.drawKickChargeBar(
        this.player.position,
        kickChargeProgress,
      );
    }

    this.renderer.endFrame();
    const matchView = this.match.getView();
    this.hud.render({
      match: matchView,
      localSide: this.session.getLocalPlayer().side,
      menuOpen: this.menuOpen,
    });
    this.menu.render(this.menuOpen, this.arena.id, matchView);
  }

  public setLoopFps(_fps: number): void {}

  public dispose(): void {
    this.input.dispose();
    this.menu.dispose();
    this.hud.dispose();
    this.networkClient?.disconnect();
    this.renderer.dispose();
  }

  private resolveBallFieldWalls(previousPosition?: Vector2): void {
    for (let pass = 0; pass < 2; pass += 1) {
      for (const wall of this.field.walls) {
        const resolution = resolveCircleSegmentCollision(
          this.ball,
          wall.start,
          wall.end,
          GAME_CONFIG.field.wallRestitution,
          pass === 0 ? previousPosition : undefined,
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
        this.getLocalSpawn().x,
        this.getLocalSpawn().y,
      ),
    );
    this.ball.reset(
      new Vector2(
        this.arena.spawns.ball.x,
        this.arena.spawns.ball.y,
      ),
    );
  }

  private setMenuOpen(open: boolean): void {
    this.menuOpen = open;
    if (open) this.input.clearGameplayInput();
  }

  private sendNetworkInput(): void {
    if (!this.networkClient) return;
    this.networkInputSequence += 1;
    this.networkClient.sendInput(this.input.createNetworkInput(
      this.networkInputSequence,
      !this.menuOpen && this.isLocalPlayerActive(),
    ));
  }

  private drawRemotePlayers(): void {
    const snapshot = this.networkClient?.latestSnapshot;
    const localNetworkId = this.networkClient?.playerId;
    if (!snapshot || !localNetworkId) return;
    const viewer = snapshot.players.find((player) => player.id === localNetworkId);
    if (!viewer) return;
    for (const remote of snapshot.players) {
      if (remote.id === localNetworkId || remote.side === 'SPECTATOR') continue;
      const fillColor = remote.side === 'TEAM_A'
        ? GAME_CONFIG.ui.teamA.color
        : GAME_CONFIG.ui.teamB.color;
      this.renderer.drawRemotePlayer(
        new Vector2(remote.position.x, remote.position.y),
        new Vector2(remote.facingDirection.x, remote.facingDirection.y),
        fillColor,
        canViewFacingIndicator(viewer.side, remote.side, false),
      );
    }
  }

  private isLocalPlayerActive(): boolean {
    return this.session.getLocalPlayer().side !== 'SPECTATOR';
  }

  private getLocalSpawn(): Vector2 {
    return this.session.getLocalPlayer().side === 'TEAM_B'
      ? this.arena.spawns.teamB
      : this.arena.spawns.teamA;
  }

  private changePlayerSide(playerId: string, side: PlayerSide): void {
    const authorized = this.session.dispatch({
      type: 'CHANGE_TEAM', actorId: this.session.localPlayerId, playerId, side,
    });
    if (authorized && playerId === this.session.localPlayerId) {
      this.player.reset(this.getLocalSpawn());
      this.input.clearGameplayInput();
    }
  }

  private togglePause(): void {
    if (!this.session.dispatch({ type: 'PAUSE_MATCH', actorId: this.session.localPlayerId })) return;
    this.match.togglePause();
    this.player.cancelKickCharge();
  }

  private changeMap(mapId: string): void {
    if (!this.session.dispatch({ type: 'CHANGE_MAP', actorId: this.session.localPlayerId, mapId })) return;
    const nextArena = getArena(mapId);
    if (!nextArena || nextArena.id === this.arena.id) return;
    this.arena = nextArena;
    this.field = createArenaField(nextArena);
    this.renderer.setArena(nextArena);
    this.resetEntities();
    this.match.restartCountdown();
  }
}
