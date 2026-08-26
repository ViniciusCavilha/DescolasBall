import { GAME_CONFIG } from '../config/gameConfig';
import type { FieldGeometry } from '../core/field';
import type { Vector2 } from '../core/math/Vector2';
import type { Entity } from '../entities/Entity';
import type { ArenaDefinition } from '../core/arenas';

export class Renderer {
  private scaleX = 1;
  private scaleY = 1;
  private arena: ArenaDefinition | null = null;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  public beginFrame(): void {
    const goalDepth = this.arena?.goalDepth ?? GAME_CONFIG.field.goalDepth;
    this.context.save();
    this.context.setTransform(
      this.scaleX,
      0,
      0,
      this.scaleY,
      goalDepth * this.scaleX,
      0,
    );
  }

  public clear(color: string): void {
    const width = this.arena?.width ?? GAME_CONFIG.worldWidth;
    const height = this.arena?.height ?? GAME_CONFIG.worldHeight;
    const goalDepth = this.arena?.goalDepth ?? GAME_CONFIG.field.goalDepth;
    this.context.fillStyle = color;
    this.context.fillRect(
      -goalDepth,
      0,
      width + goalDepth * 2,
      height,
    );
  }

  public drawField(field: FieldGeometry): void {
    const fieldConfig = GAME_CONFIG.field;
    this.context.fillStyle = this.arena?.visual.surfaceColor ?? fieldConfig.surfaceColor;
    this.context.fillRect(0, 0, field.width, field.height);

    this.context.strokeStyle = this.arena?.visual.lineColor ?? fieldConfig.lineColor;
    this.context.lineWidth = fieldConfig.lineWidth;
    this.context.beginPath();
    this.context.moveTo(field.width / 2, 0);
    this.context.lineTo(field.width / 2, field.height);
    this.context.stroke();

    this.context.beginPath();
    this.context.arc(
      field.width / 2,
      field.height / 2,
      fieldConfig.centerCircleRadius,
      0,
      Math.PI * 2,
    );
    this.context.stroke();

    const penaltyAreaTop = (field.height - fieldConfig.penaltyAreaHeight) / 2;
    this.context.strokeRect(
      0,
      penaltyAreaTop,
      fieldConfig.penaltyAreaWidth,
      fieldConfig.penaltyAreaHeight,
    );
    this.context.strokeRect(
      field.width - fieldConfig.penaltyAreaWidth,
      penaltyAreaTop,
      fieldConfig.penaltyAreaWidth,
      fieldConfig.penaltyAreaHeight,
    );

    for (const wall of field.walls) {
      this.context.strokeStyle = wall.kind === 'goal'
        ? fieldConfig.goalColor
        : (this.arena?.visual.lineColor ?? fieldConfig.lineColor);
      this.context.beginPath();
      this.context.moveTo(wall.start.x, wall.start.y);
      this.context.lineTo(wall.end.x, wall.end.y);
      this.context.stroke();
    }
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    options: {
      color?: string;
      font?: string;
      align?: CanvasTextAlign;
    } = {},
  ): void {
    this.context.fillStyle = options.color ?? GAME_CONFIG.textColor;
    this.context.font = options.font ?? '24px system-ui, sans-serif';
    this.context.textAlign = options.align ?? 'left';
    this.context.textBaseline = 'middle';
    this.context.fillText(text, x, y);
  }

  public drawCircle(
    x: number,
    y: number,
    radius: number,
    options: {
      fillColor: string;
      strokeColor?: string;
      lineWidth?: number;
    },
  ): void {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.fillStyle = options.fillColor;
    this.context.fill();

    if (options.strokeColor && options.lineWidth) {
      this.context.strokeStyle = options.strokeColor;
      this.context.lineWidth = options.lineWidth;
      this.context.stroke();
    }
  }

  public drawEntity(entity: Entity): void {
    entity.render(this);
  }

  public drawKickFeedback(position: Vector2, radius: number): void {
    this.context.beginPath();
    this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
    this.context.strokeStyle = GAME_CONFIG.accentColor;
    this.context.lineWidth = 7;
    this.context.stroke();
  }

  public drawKickChargeBar(position: Vector2, progress: number): void {
    const width = 104;
    const height = 14;
    const x = position.x - width / 2;
    const y = position.y + GAME_CONFIG.player.radius + 14;
    const safeProgress = Math.min(Math.max(progress, 0), 1);

    this.context.save();
    if (safeProgress >= 1) {
      this.context.shadowColor = '#ffd166';
      this.context.shadowBlur = 16;
    }
    this.context.fillStyle = 'rgba(9, 13, 24, 0.92)';
    this.context.fillRect(x, y, width, height);
    this.context.fillStyle = safeProgress >= 1
      ? '#ffd166'
      : GAME_CONFIG.accentColor;
    this.context.fillRect(x + 2, y + 2, (width - 4) * safeProgress, height - 4);
    this.context.strokeStyle = GAME_CONFIG.textColor;
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, width, height);
    if (safeProgress >= 1) {
      this.drawText('⚡ READY', position.x, y + height + 16, {
        color: '#ffd166',
        font: '800 15px system-ui, sans-serif',
        align: 'center',
      });
    }
    this.context.restore();
  }

  public endFrame(): void {
    this.context.restore();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.resize);
  }

  public setArena(arena: ArenaDefinition): void {
    this.arena = arena;
    this.resize();
  }

  private readonly resize = (): void => {
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    const worldWidth = this.arena?.width ?? GAME_CONFIG.worldWidth;
    const worldHeight = this.arena?.height ?? GAME_CONFIG.worldHeight;
    const goalDepth = this.arena?.goalDepth ?? GAME_CONFIG.field.goalDepth;
    const visibleWorldWidth = worldWidth + goalDepth * 2;
    const worldAspectRatio = visibleWorldWidth / worldHeight;

    let displayWidth = availableWidth;
    let displayHeight = displayWidth / worldAspectRatio;

    if (displayHeight > availableHeight) {
      displayHeight = availableHeight;
      displayWidth = displayHeight * worldAspectRatio;
    }

    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    this.canvas.style.width = `${Math.floor(displayWidth)}px`;
    this.canvas.style.height = `${Math.floor(displayHeight)}px`;
    this.canvas.width = Math.max(Math.round(displayWidth * pixelRatio), 1);
    this.canvas.height = Math.max(Math.round(displayHeight * pixelRatio), 1);

    this.scaleX = this.canvas.width / visibleWorldWidth;
    this.scaleY = this.canvas.height / worldHeight;
  };
}
