export type NetworkMatchState =
  | 'waiting' | 'countdown' | 'playing' | 'paused' | 'goal' | 'finished';
export type NetworkPlayerSide = 'TEAM_A' | 'TEAM_B' | 'SPECTATOR';
export type NetworkPlayerRole = 'HOST' | 'PLAYER';
export interface NetworkVector { x: number; y: number; }
export interface NetworkInput {
  sequence: number; up: boolean; down: boolean; left: boolean; right: boolean; kick: boolean;
}
export interface NetworkPlayerState {
  id: string; position: NetworkVector; velocity: NetworkVector;
  side: NetworkPlayerSide; role: NetworkPlayerRole;
}
export interface NetworkBallState { position: NetworkVector; velocity: NetworkVector; }
export interface NetworkMatchSnapshot {
  id: string; tick: number; serverTime: number; state: NetworkMatchState;
  remainingSeconds: number; score: { left: number; right: number };
  players: NetworkPlayerState[]; ball: NetworkBallState;
}

export type ClientMessage =
  | { type: 'JOIN_MATCH'; payload: { name?: string } }
  | { type: 'LEAVE_MATCH'; payload: Record<string, never> }
  | { type: 'INPUT'; payload: NetworkInput }
  | { type: 'PING'; payload: { sentAt: number } };
export type ServerMessage =
  | { type: 'WELCOME'; payload: { playerId: string; matchId: string } }
  | { type: 'MATCH_STATE'; payload: NetworkMatchSnapshot }
  | { type: 'PLAYER_JOINED'; payload: { player: NetworkPlayerState } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'MATCH_STARTED'; payload: { matchId: string } }
  | { type: 'MATCH_ENDED'; payload: { matchId: string } }
  | { type: 'GOAL'; payload: { side: 'left' | 'right' } }
  | { type: 'PONG'; payload: { sentAt: number; serverTime: number } }
  | { type: 'ERROR'; payload: { code: string; message: string } };

export interface ParseResult<T> { value: T | null; error: string | null; }
export function serializeNetworkMessage(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

export function deserializeClientMessage(raw: string): ParseResult<ClientMessage> {
  return parseMessage(raw, isClientMessage);
}
export function deserializeServerMessage(raw: string): ParseResult<ServerMessage> {
  return parseMessage(raw, isServerMessage);
}

function parseMessage<T>(raw: string, validator: (value: unknown) => value is T): ParseResult<T> {
  try {
    const value: unknown = JSON.parse(raw);
    return validator(value)
      ? { value, error: null }
      : { value: null, error: 'Formato de mensagem inválido.' };
  } catch {
    return { value: null, error: 'JSON inválido.' };
  }
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value) || typeof value.type !== 'string' || !isRecord(value.payload)) return false;
  if (value.type === 'JOIN_MATCH') return value.payload.name === undefined || typeof value.payload.name === 'string';
  if (value.type === 'LEAVE_MATCH') return true;
  if (value.type === 'PING') return isFiniteNumber(value.payload.sentAt);
  if (value.type === 'INPUT') return isNetworkInput(value.payload);
  return false;
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value) || typeof value.type !== 'string' || !isRecord(value.payload)) return false;
  if (value.type === 'WELCOME') return isString(value.payload.playerId) && isString(value.payload.matchId);
  if (value.type === 'PLAYER_LEFT') return isString(value.payload.playerId);
  if (value.type === 'PLAYER_JOINED') return isPlayer(value.payload.player);
  if (value.type === 'MATCH_STATE') return isSnapshot(value.payload);
  if (value.type === 'PONG') return isFiniteNumber(value.payload.sentAt) && isFiniteNumber(value.payload.serverTime);
  if (value.type === 'ERROR') return isString(value.payload.code) && isString(value.payload.message);
  if (value.type === 'MATCH_STARTED' || value.type === 'MATCH_ENDED') return isString(value.payload.matchId);
  if (value.type === 'GOAL') return value.payload.side === 'left' || value.payload.side === 'right';
  return false;
}

function isNetworkInput(value: unknown): value is NetworkInput {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.sequence)
    && typeof value.sequence === 'number'
    && value.sequence >= 0
    && ['up', 'down', 'left', 'right', 'kick'].every((key) => typeof value[key] === 'boolean');
}
function isSnapshot(value: unknown): value is NetworkMatchSnapshot {
  if (!isRecord(value) || !isRecord(value.score) || !isRecord(value.ball)) return false;
  return isString(value.id) && Number.isSafeInteger(value.tick)
    && isFiniteNumber(value.serverTime) && isFiniteNumber(value.remainingSeconds)
    && isMatchState(value.state) && isFiniteNumber(value.score.left) && isFiniteNumber(value.score.right)
    && Array.isArray(value.players) && value.players.every(isPlayer)
    && isVector(value.ball.position) && isVector(value.ball.velocity);
}
function isPlayer(value: unknown): value is NetworkPlayerState {
  return isRecord(value) && isString(value.id) && isVector(value.position)
    && isVector(value.velocity)
    && (value.side === 'TEAM_A' || value.side === 'TEAM_B' || value.side === 'SPECTATOR')
    && (value.role === 'HOST' || value.role === 'PLAYER');
}
function isMatchState(value: unknown): value is NetworkMatchState {
  return value === 'waiting' || value === 'countdown' || value === 'playing'
    || value === 'paused' || value === 'goal' || value === 'finished';
}
function isVector(value: unknown): value is NetworkVector {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function isString(value: unknown): value is string { return typeof value === 'string'; }
