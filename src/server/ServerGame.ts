import { SERVER_CONFIG } from './serverConfig';
import type {
  NetworkInput, NetworkMatchSnapshot, NetworkPlayerRole,
  NetworkPlayerSide, NetworkPlayerState, NetworkVector,
} from '../shared/network';

interface AuthoritativePlayer extends NetworkPlayerState {
  input: NetworkInput;
  lastInputSequence: number;
}
const EMPTY_INPUT: NetworkInput = {
  sequence: 0, up: false, down: false, left: false, right: false, kick: false,
};

export class ServerGame {
  private readonly players = new Map<string, AuthoritativePlayer>();
  private tick = 0;
  private remainingSeconds = SERVER_CONFIG.matchDurationSeconds;

  public addPlayer(id: string): NetworkPlayerState {
    const index = this.players.size;
    const side: NetworkPlayerSide = index % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
    const role: NetworkPlayerRole = index === 0 ? 'HOST' : 'PLAYER';
    const player: AuthoritativePlayer = {
      id, side, role, velocity: { x: 0, y: 0 }, facingDirection: { x: 1, y: 0 },
      position: {
        x: side === 'TEAM_A' ? SERVER_CONFIG.world.width * 0.25 : SERVER_CONFIG.world.width * 0.75,
        y: SERVER_CONFIG.world.height / 2,
      },
      input: { ...EMPTY_INPUT }, lastInputSequence: -1,
    };
    this.players.set(id, player);
    return toPublicPlayer(player);
  }

  public removePlayer(id: string): boolean { return this.players.delete(id); }
  public setInput(id: string, input: NetworkInput): boolean {
    const player = this.players.get(id);
    if (!player || input.sequence <= player.lastInputSequence) return false;
    player.input = { ...input }; player.lastInputSequence = input.sequence;
    return true;
  }

  public update(deltaTime: number): void {
    const safeDelta = Number.isFinite(deltaTime) ? Math.max(deltaTime, 0) : 0;
    this.tick += 1;
    for (const player of this.players.values()) {
      const horizontal = Number(player.input.right) - Number(player.input.left);
      const vertical = Number(player.input.down) - Number(player.input.up);
      const direction = normalize({ x: horizontal, y: vertical });
      if (direction.x !== 0 || direction.y !== 0) player.facingDirection = direction;
      player.velocity = scale(direction, SERVER_CONFIG.player.maximumSpeed);
      player.position = {
        x: clamp(player.position.x + player.velocity.x * safeDelta, SERVER_CONFIG.player.radius, SERVER_CONFIG.world.width - SERVER_CONFIG.player.radius),
        y: clamp(player.position.y + player.velocity.y * safeDelta, SERVER_CONFIG.player.radius, SERVER_CONFIG.world.height - SERVER_CONFIG.player.radius),
      };
    }
  }

  public createSnapshot(): NetworkMatchSnapshot {
    return {
      id: SERVER_CONFIG.matchId, tick: this.tick, serverTime: Date.now(),
      state: 'waiting', remainingSeconds: this.remainingSeconds,
      score: { left: 0, right: 0 },
      players: [...this.players.values()].map(toPublicPlayer),
      ball: {
        position: { x: SERVER_CONFIG.world.width / 2, y: SERVER_CONFIG.world.height / 2 },
        velocity: { x: 0, y: 0 },
      },
    };
  }
  public getPlayerCount(): number { return this.players.size; }
}

function toPublicPlayer(player: AuthoritativePlayer): NetworkPlayerState {
  return { id: player.id, side: player.side, role: player.role,
    position: { ...player.position }, velocity: { ...player.velocity },
    facingDirection: { ...player.facingDirection } };
}
function normalize(value: NetworkVector): NetworkVector {
  const length = Math.hypot(value.x, value.y);
  return length > 0 ? { x: value.x / length, y: value.y / length } : { x: 0, y: 0 };
}
function scale(value: NetworkVector, factor: number): NetworkVector { return { x: value.x * factor, y: value.y * factor }; }
function clamp(value: number, minimum: number, maximum: number): number { return Math.min(Math.max(value, minimum), maximum); }
