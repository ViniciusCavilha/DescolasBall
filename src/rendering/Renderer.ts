import { GAME_CONFIG } from '../config/gameConfig';
import type { FieldGeometry } from '../core/field';
import type { MatchView } from '../core/Match';
import type { Vector2 } from '../core/math/Vector2';
import type { Entity } from '../entities/Entity';

export class Renderer {
  private scaleX = 1;
  private scaleY = 1;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  public beginFrame(): void {
    this.context.save();
    this.context.setTransform(
      this.scaleX,
      0,
      0,
      this.scaleY,
      GAME_CONFIG.field.goalDepth * this.scaleX,
      0,
    );
  }

  public clear(color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(
      -GAME_CONFIG.field.goalDepth,
      0,
      GAME_CONFIG.worldWidth + GAME_CONFIG.field.goalDepth * 2,
      GAME_CONFIG.worldHeight,
    );
  }

  public drawField(field: FieldGeometry): void {
    const fieldConfig = GAME_CONFIG.field;
    this.context.fillStyle = fieldConfig.surfaceColor;
    this.context.fillRect(0, 0, field.width, field.height);

    this.context.strokeStyle = fieldConfig.lineColor;
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
        : fieldConfig.lineColor;
      this.context.beginPath();
      this.context.moveTo(wall.start.x, wall.start.y);
      this.context.lineTo(wall.end.x, wall.end.y);
      this.context.stroke();
    }
  }

  public drawMatchHud(match: MatchView): void {
    const centerX = GAME_CONFIG.worldWidth / 2;
    this.context.fillStyle = 'rgba(9, 13, 24, 0.82)';
    this.context.fillRect(centerX - 180, 20, 360, 82);

    this.drawText(
      `ESQUERDA  ${match.score.left}  ×  ${match.score.right}  DIREITA`,
      centerX,
      47,
      {
        font: '700 24px system-ui, sans-serif',
        align: 'center',
      },
    );
    this.drawText(match.clockText, centerX, 79, {
      color: GAME_CONFIG.accentColor,
      font: '700 20px ui-monospace, monospace',
      align: 'center',
    });

    if (match.overlayText) {
      this.context.fillStyle = 'rgba(9, 13, 24, 0.72)';
      this.context.fillRect(centerX - 260, 125, 520, 135);
      this.drawText(match.overlayText, centerX, 170, {
        color: GAME_CONFIG.accentColor,
        font: '800 48px system-ui, sans-serif',
        align: 'center',
      });

      if (match.restartHint) {
        this.drawText('Pressione R para iniciar uma nova partida', centerX, 225, {
          font: '18px system-ui, sans-serif',
          align: 'center',
        });
      }
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

  public endFrame(): void {
    this.context.restore();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.resize);
  }

  private readonly resize = (): void => {
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    const visibleWorldWidth = GAME_CONFIG.worldWidth
      + GAME_CONFIG.field.goalDepth * 2;
    const worldAspectRatio = visibleWorldWidth / GAME_CONFIG.worldHeight;

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
    this.scaleY = this.canvas.height / GAME_CONFIG.worldHeight;
  };
}
