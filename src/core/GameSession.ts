export type PlayerSide = 'TEAM_A' | 'TEAM_B' | 'SPECTATOR';
export type PlayerRole = 'HOST' | 'PLAYER';
export interface SessionPlayer { id: string; name: string; role: PlayerRole; side: PlayerSide; }
export type AdminAction =
  | { type: 'CHANGE_TEAM'; actorId: string; playerId: string; side: PlayerSide }
  | { type: 'PAUSE_MATCH'; actorId: string }
  | { type: 'CHANGE_MAP'; actorId: string; mapId: string };

export class GameSession {
  private readonly players: SessionPlayer[] = [
    { id: 'local', name: 'Jogador 1', role: 'HOST', side: 'TEAM_A' },
    { id: 'guest', name: 'Jogador 2', role: 'PLAYER', side: 'TEAM_B' },
  ];
  public readonly localPlayerId = 'local';
  public getPlayers(): readonly Readonly<SessionPlayer>[] { return this.players; }
  public getLocalPlayer(): Readonly<SessionPlayer> { return this.players[0]; }
  public dispatch(action: AdminAction): boolean {
    const actor = this.players.find((player) => player.id === action.actorId);
    if (actor?.role !== 'HOST') return false;
    if (action.type === 'CHANGE_TEAM') {
      const player = this.players.find((candidate) => candidate.id === action.playerId);
      if (!player) return false;
      player.side = action.side;
    }
    return true;
  }
}
