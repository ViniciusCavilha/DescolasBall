import { GAME_CONFIG, FIXED_DELTA_TIME } from '../config/gameConfig';
import type { Game } from './Game';
import { Time } from './Time';

export class GameLoop {
  private readonly time = new Time(
    FIXED_DELTA_TIME,
    GAME_CONFIG.maxFrameDeltaSeconds,
  );

  private animationFrameId: number | null = null;
  private running = false;

  public constructor(private readonly game: Game) {}

  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.time.reset();
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  public stop(): void {
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.time.reset();
  }

  private readonly frame = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    const { fps } = this.time.beginFrame(timestamp);

    while (this.time.hasFixedStep()) {
      this.game.update(this.time.fixedDeltaTime);
      this.time.consumeFixedStep();
    }

    this.game.setLoopFps(fps);
    this.game.render();
    this.animationFrameId = requestAnimationFrame(this.frame);
  };
}
