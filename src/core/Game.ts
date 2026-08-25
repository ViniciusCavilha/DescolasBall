import { GAME_CONFIG } from '../config/gameConfig';
import type { Entity } from '../entities/Entity';
import { Renderer } from '../rendering/Renderer';

export class Game {
  private readonly entities: Entity[] = [];
  private loopFps = 0;
  private renderedFrames = 0;

  public constructor(private readonly renderer: Renderer) {}

  public update(deltaTime: number): void {
    for (const entity of this.entities) {
      entity.update(deltaTime);
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
      GAME_CONFIG.worldWidth / 2,
      GAME_CONFIG.worldHeight / 2 - 24,
      {
        color: GAME_CONFIG.accentColor,
        font: '700 64px system-ui, sans-serif',
        align: 'center',
      },
    );
    this.renderer.drawText(
      `Loop ativo · ${Math.round(this.loopFps)} FPS · frame ${this.renderedFrames}`,
      GAME_CONFIG.worldWidth / 2,
      GAME_CONFIG.worldHeight / 2 + 42,
      {
        font: '22px system-ui, sans-serif',
        align: 'center',
      },
    );
    this.renderer.endFrame();
  }

  public setLoopFps(fps: number): void {
    this.loopFps = fps;
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
