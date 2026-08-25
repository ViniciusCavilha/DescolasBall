import { GAME_CONFIG } from '../config/gameConfig';
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
    this.context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
  }

  public clear(color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
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

  public drawEntity(entity: Entity): void {
    entity.render(this);
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
    const worldAspectRatio = GAME_CONFIG.worldWidth / GAME_CONFIG.worldHeight;

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

    this.scaleX = this.canvas.width / GAME_CONFIG.worldWidth;
    this.scaleY = this.canvas.height / GAME_CONFIG.worldHeight;
  };
}
