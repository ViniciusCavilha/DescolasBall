import { GAME_CONFIG } from '../config/gameConfig';
import type { MatchView } from '../core/Match';
import type { PlayerSide } from '../core/GameSession';

export interface MatchHudView { match: MatchView; localSide: PlayerSide; menuOpen: boolean; }

export class MatchHud {
  private readonly root = document.createElement('section');
  private readonly scoreA = document.createElement('strong');
  private readonly scoreB = document.createElement('strong');
  private readonly clock = document.createElement('time');
  private readonly overlay = document.createElement('div');
  private readonly eyebrow = document.createElement('span');
  private readonly title = document.createElement('strong');
  private readonly hint = document.createElement('small');
  private readonly spectator = document.createElement('div');
  private lastState = '';

  public constructor() {
    this.root.className = 'match-hud';
    this.root.setAttribute('aria-label', 'Informações da partida');
    this.root.style.setProperty('--team-a', GAME_CONFIG.ui.teamA.color);
    this.root.style.setProperty('--team-b', GAME_CONFIG.ui.teamB.color);
    this.buildInterface();
    document.querySelector('#app')?.append(this.root);
  }

  public render(view: MatchHudView): void {
    const { match } = view;
    this.scoreA.textContent = String(match.score.left);
    this.scoreB.textContent = String(match.score.right);
    this.clock.textContent = match.clockText;
    this.spectator.hidden = view.localSide !== 'SPECTATOR';
    this.root.classList.toggle('match-hud--menu-open', view.menuOpen);
    const content = getOverlayContent(match);
    this.overlay.hidden = content === null;
    if (content) {
      const stateKey = match.state + ':' + match.overlayText;
      this.overlay.className = 'match-overlay match-overlay--' + match.state;
      if (this.lastState !== stateKey) {
        this.overlay.classList.add('match-overlay--enter');
        this.overlay.addEventListener('animationend', () => {
          this.overlay.classList.remove('match-overlay--enter');
        }, { once: true });
      }
      this.eyebrow.textContent = content.eyebrow;
      this.title.textContent = content.title;
      this.hint.textContent = content.hint;
    }
    this.lastState = match.state + ':' + match.overlayText;
  }

  public dispose(): void { this.root.remove(); }

  private buildInterface(): void {
    const scoreboard = createScoreboard(this.scoreA, this.scoreB, this.clock);
    this.overlay.className = 'match-overlay';
    this.overlay.append(this.eyebrow, this.title, this.hint);
    this.spectator.className = 'spectator-badge';
    this.spectator.textContent = '● ESPECTADOR';
    const controls = document.createElement('div');
    controls.className = 'controls-hint';
    for (const [key, label] of [['WASD', 'MOVER'], ['ESPAÇO', 'CHUTAR'], ['TAB', 'MENU']]) {
      const item = document.createElement('span');
      const keyboard = document.createElement('kbd');
      keyboard.textContent = key; item.append(keyboard, ' ' + label); controls.append(item);
    }
    this.root.append(scoreboard, this.overlay, this.spectator, controls);
  }
}

function createScoreboard(scoreA: HTMLElement, scoreB: HTMLElement, clock: HTMLElement): HTMLElement {
  const root = document.createElement('div'); root.className = 'scoreboard';
  const teamA = document.createElement('div'); teamA.className = 'scoreboard__team scoreboard__team--a';
  teamA.textContent = GAME_CONFIG.ui.teamA.name;
  const center = document.createElement('div'); center.className = 'scoreboard__center';
  scoreA.className = 'scoreboard__score'; scoreB.className = 'scoreboard__score';
  const divider = document.createElement('i'); divider.textContent = '—';
  center.append(scoreA, divider, scoreB);
  const teamB = document.createElement('div'); teamB.className = 'scoreboard__team scoreboard__team--b';
  teamB.textContent = GAME_CONFIG.ui.teamB.name;
  clock.className = 'scoreboard__clock';
  root.append(teamA, center, teamB, clock);
  return root;
}

function getOverlayContent(match: MatchView): { eyebrow: string; title: string; hint: string } | null {
  if (match.state === 'playing') return null;
  if (match.state === 'countdown') return {
    eyebrow: 'PREPARE-SE',
    title: match.overlayText === 'GO!' ? '▶' : (match.overlayText ?? ''),
    hint: match.overlayText === 'GO!' ? 'VAI!' : '',
  };
  if (match.state === 'goal') {
    const teamName = match.overlayText?.includes('ESQUERDA')
      ? GAME_CONFIG.ui.teamA.name
      : GAME_CONFIG.ui.teamB.name;
    return {
      eyebrow: '⚽ GOOOOOL!',
      title: teamName,
      hint: 'A partida recomeça em instantes',
    };
  }
  if (match.state === 'paused') return { eyebrow: 'PARTIDA', title: 'PAUSADA', hint: 'Aguardando o Host' };
  if (match.state === 'finished') return {
    eyebrow: 'FIM DE JOGO', title: match.overlayText ?? '', hint: 'Pressione R para jogar novamente',
  };
  return { eyebrow: 'DESCOLASBALL', title: 'PRONTO?', hint: 'Pressione R para iniciar' };
}
