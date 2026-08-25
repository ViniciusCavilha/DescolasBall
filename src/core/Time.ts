export interface FrameTime {
  frameDelta: number;
  fps: number;
}

export class Time {
  private previousTimestamp: number | null = null;
  private accumulator = 0;
  private smoothedFrameDelta = 0;

  public constructor(
    public readonly fixedDeltaTime: number,
    private readonly maxFrameDelta: number,
  ) {}

  public beginFrame(timestamp: number): FrameTime {
    if (this.previousTimestamp === null) {
      this.previousTimestamp = timestamp;
      return { frameDelta: 0, fps: 0 };
    }

    const elapsedSeconds = (timestamp - this.previousTimestamp) / 1_000;
    const frameDelta = Math.min(Math.max(elapsedSeconds, 0), this.maxFrameDelta);

    this.previousTimestamp = timestamp;
    this.accumulator += frameDelta;
    this.smoothedFrameDelta = this.smoothedFrameDelta === 0
      ? frameDelta
      : this.smoothedFrameDelta * 0.9 + frameDelta * 0.1;

    return {
      frameDelta,
      fps: this.smoothedFrameDelta > 0 ? 1 / this.smoothedFrameDelta : 0,
    };
  }

  public hasFixedStep(): boolean {
    return this.accumulator >= this.fixedDeltaTime;
  }

  public consumeFixedStep(): void {
    this.accumulator -= this.fixedDeltaTime;
  }

  public reset(): void {
    this.previousTimestamp = null;
    this.accumulator = 0;
    this.smoothedFrameDelta = 0;
  }
}
