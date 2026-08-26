import type { FieldSide } from './field';

export type MatchState =
  | 'waiting'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'goal'
  | 'finished';

export interface MatchScore {
  left: number;
  right: number;
}

export interface MatchView {
  score: Readonly<MatchScore>;
  clockText: string;
  overlayText: string | null;
  restartHint: boolean;
  state: MatchState;
}

export interface MatchConfig {
  durationSeconds: number;
  goalPauseDurationSeconds: number;
  countdownStartValue: number;
  countdownStepDurationSeconds: number;
}

export class Match {
  private state: MatchState = 'waiting';
  private score: MatchScore = { left: 0, right: 0 };
  private remainingSeconds: number;
  private stateElapsedSeconds = 0;
  private lastScoringSide: FieldSide | null = null;

  public constructor(private readonly config: MatchConfig) {
    this.remainingSeconds = config.durationSeconds;
  }

  public isPlaying(): boolean {
    return this.state === 'playing';
  }

  public togglePause(): boolean {
    if (this.state === 'playing') { this.state = 'paused'; return true; }
    if (this.state === 'paused') { this.state = 'playing'; return true; }
    return false;
  }

  public restartCountdown(): void {
    this.stateElapsedSeconds = 0;
    this.state = 'countdown';
  }

  public startNewMatch(): void {
    this.score = { left: 0, right: 0 };
    this.remainingSeconds = this.config.durationSeconds;
    this.stateElapsedSeconds = 0;
    this.lastScoringSide = null;
    this.state = 'countdown';
  }

  public registerGoal(scoringSide: FieldSide): void {
    if (!this.isPlaying()) {
      return;
    }

    this.score = {
      ...this.score,
      [scoringSide]: this.score[scoringSide] + 1,
    };
    this.lastScoringSide = scoringSide;
    this.stateElapsedSeconds = 0;
    this.state = 'goal';
  }

  public update(deltaTime: number): void {
    const safeDeltaTime = Number.isFinite(deltaTime) && deltaTime > 0
      ? deltaTime
      : 0;

    if (this.state === 'playing') {
      this.remainingSeconds = Math.max(
        this.remainingSeconds - safeDeltaTime,
        0,
      );
      if (this.remainingSeconds === 0) {
        this.state = 'finished';
      }
      return;
    }

    if (this.state === 'goal') {
      this.stateElapsedSeconds += safeDeltaTime;
      if (
        this.stateElapsedSeconds
        >= this.config.goalPauseDurationSeconds
      ) {
        this.stateElapsedSeconds = 0;
        this.state = 'countdown';
      }
      return;
    }

    if (this.state === 'countdown') {
      this.stateElapsedSeconds += safeDeltaTime;
      const countdownDuration = (
        this.config.countdownStartValue + 1
      ) * this.config.countdownStepDurationSeconds;

      if (this.stateElapsedSeconds >= countdownDuration) {
        this.stateElapsedSeconds = 0;
        this.state = 'playing';
      }
    }
  }

  public getView(): MatchView {
    return {
      score: this.score,
      clockText: formatClock(this.remainingSeconds),
      overlayText: this.getOverlayText(),
      restartHint: this.state === 'waiting' || this.state === 'finished',
      state: this.state,
    };
  }

  private getOverlayText(): string | null {
    if (this.state === 'waiting') {
      return 'PRONTO PARA JOGAR';
    }

    if (this.state === 'countdown') {
      const step = Math.floor(
        this.stateElapsedSeconds / this.config.countdownStepDurationSeconds,
      );
      return step < this.config.countdownStartValue
        ? String(this.config.countdownStartValue - step)
        : 'GO!';
    }

    if (this.state === 'goal') {
      return this.lastScoringSide === 'left'
        ? 'GOL DA ESQUERDA!'
        : 'GOL DA DIREITA!';
    }

    if (this.state === 'paused') return 'PARTIDA PAUSADA';

    if (this.state === 'finished') {
      if (this.score.left === this.score.right) {
        return 'EMPATE';
      }

      return this.score.left > this.score.right
        ? 'ESQUERDA VENCEU'
        : 'DIREITA VENCEU';
    }

    return null;
  }
}

function formatClock(remainingSeconds: number): string {
  const totalSeconds = Math.max(Math.ceil(remainingSeconds - 1e-9), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
