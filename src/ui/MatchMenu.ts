import { ARENAS } from '../core/arenas';
import type { MatchView } from '../core/Match';
import type { GameSession, PlayerSide } from '../core/GameSession';

export interface MenuActions {
  close: () => void;
  changeSide: (playerId: string, side: PlayerSide) => void;
  togglePause: () => void;
  changeMap: (mapId: string) => void;
}

export class MatchMenu {
  private readonly root = document.createElement('section');
  private renderKey = '';
  public constructor(private readonly session: GameSession, private readonly actions: MenuActions) {
    this.root.className = 'match-menu';
    this.root.setAttribute('aria-label', 'Menu da partida');
    document.querySelector('#app')?.append(this.root);
  }
  public render(open: boolean, mapId: string, match: MatchView): void {
    this.root.hidden = !open;
    if (!open) { this.renderKey = ''; return; }
    const isHost = this.session.getLocalPlayer().role === 'HOST';
    const nextRenderKey = JSON.stringify({ mapId, match, players: this.session.getPlayers() });
    if (nextRenderKey === this.renderKey) return;
    this.renderKey = nextRenderKey;
    this.root.replaceChildren();
    const panel = document.createElement('div'); panel.className = 'match-menu__panel';
    const mapName = ARENAS.find((map) => map.id === mapId)?.name ?? mapId;
    panel.innerHTML = `<header><h1>DESCOLASBALL</h1><span>${isHost ? 'HOST' : 'JOGADOR'}</span></header><p>Mapa: ${mapName} · Placar ${match.score.left} × ${match.score.right}</p><h2>Jogadores</h2>`;
    for (const player of this.session.getPlayers()) {
      const row = document.createElement('div'); row.className = 'match-menu__player';
      const label = document.createElement('span');
      label.textContent = `${player.name}${player.role === 'HOST' ? ' ★' : ''} — ${player.side}`; row.append(label);
      if (isHost) for (const side of ['TEAM_A', 'TEAM_B', 'SPECTATOR'] as const) {
        const button = document.createElement('button');
        button.textContent = side === 'SPECTATOR' ? 'Espectador' : side.replace('_', ' ');
        button.disabled = player.side === side;
        button.addEventListener('click', () => this.actions.changeSide(player.id, side)); row.append(button);
      }
      panel.append(row);
    }
    if (isHost) {
      const admin = document.createElement('div'); admin.className = 'match-menu__admin';
      const pause = document.createElement('button');
      pause.textContent = match.state === 'paused' ? 'Continuar partida' : 'Pausar partida';
      pause.addEventListener('click', this.actions.togglePause); admin.append(pause);
      for (const map of ARENAS) {
        const button = document.createElement('button'); button.textContent = `Carregar ${map.name}`;
        button.disabled = map.id === mapId;
        button.addEventListener('click', () => this.actions.changeMap(map.id)); admin.append(button);
      }
      panel.append(admin);
    }
    const close = document.createElement('button'); close.className = 'match-menu__close';
    close.textContent = 'Fechar [TAB]'; close.addEventListener('click', this.actions.close);
    panel.append(close); this.root.append(panel);
  }
  public dispose(): void { this.root.remove(); }
}
