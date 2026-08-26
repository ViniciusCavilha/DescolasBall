import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { ServerGame } from './ServerGame';
import { SERVER_CONFIG } from './serverConfig';
import {
  deserializeClientMessage, serializeNetworkMessage,
  type ServerMessage,
} from '../shared/network';

export interface GameServerOptions { port?: number; tickRate?: number; networkSendRate?: number; }

export class GameServer {
  private readonly game = new ServerGame();
  private readonly playerIds = new Map<WebSocket, string>();
  private server: WebSocketServer | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(private readonly options: GameServerOptions = {}) {}

  public async start(): Promise<number> {
    if (this.server) return this.getPort();
    const port = this.options.port ?? SERVER_CONFIG.port;
    this.server = new WebSocketServer({ port });
    this.server.on('connection', this.handleConnection);
    await new Promise<void>((resolve, reject) => {
      this.server?.once('listening', resolve);
      this.server?.once('error', reject);
    });
    const tickRate = this.options.tickRate ?? SERVER_CONFIG.tickRate;
    const sendRate = this.options.networkSendRate ?? SERVER_CONFIG.networkSendRate;
    this.tickTimer = setInterval(() => this.game.update(1 / tickRate), 1000 / tickRate);
    this.snapshotTimer = setInterval(() => this.broadcastSnapshot(), 1000 / sendRate);
    return this.getPort();
  }

  public async stop(): Promise<void> {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    this.tickTimer = null; this.snapshotTimer = null;
    const server = this.server; this.server = null;
    if (!server) return;
    for (const client of server.clients) client.close(1001, 'Servidor encerrado');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.playerIds.clear();
  }

  public getPlayerCount(): number { return this.game.getPlayerCount(); }
  private getPort(): number {
    const address = this.server?.address();
    return typeof address === 'object' && address ? address.port : 0;
  }

  private readonly handleConnection = (socket: WebSocket): void => {
    const playerId = randomUUID();
    this.playerIds.set(socket, playerId);
    const player = this.game.addPlayer(playerId);
    this.send(socket, { type: 'WELCOME', payload: { playerId, matchId: SERVER_CONFIG.matchId } });
    this.broadcast({ type: 'PLAYER_JOINED', payload: { player } });
    this.broadcastSnapshot();
    socket.on('message', (data) => this.handleMessage(socket, data));
    socket.once('close', () => this.handleDisconnect(socket));
    socket.once('error', () => this.handleDisconnect(socket));
  };

  private handleMessage(socket: WebSocket, data: RawData): void {
    const playerId = this.playerIds.get(socket);
    if (!playerId) return;
    const parsed = deserializeClientMessage(data.toString());
    if (!parsed.value) {
      this.send(socket, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: parsed.error ?? 'Mensagem inválida.' } });
      return;
    }
    const message = parsed.value;
    if (message.type === 'INPUT') {
      if (!this.game.setInput(playerId, message.payload)) {
        this.send(socket, { type: 'ERROR', payload: { code: 'STALE_INPUT', message: 'Input antigo ou inválido.' } });
      }
    } else if (message.type === 'PING') {
      this.send(socket, { type: 'PONG', payload: { sentAt: message.payload.sentAt, serverTime: Date.now() } });
    } else if (message.type === 'LEAVE_MATCH') {
      socket.close(1000, 'Saída solicitada');
    }
  }

  private handleDisconnect(socket: WebSocket): void {
    const playerId = this.playerIds.get(socket);
    if (!playerId) return;
    this.playerIds.delete(socket); this.game.removePlayer(playerId);
    this.broadcast({ type: 'PLAYER_LEFT', payload: { playerId } });
    this.broadcastSnapshot();
  }

  private broadcastSnapshot(): void {
    this.broadcast({ type: 'MATCH_STATE', payload: this.game.createSnapshot() });
  }
  private broadcast(message: ServerMessage): void {
    for (const client of this.server?.clients ?? []) this.send(client, message);
  }
  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(serializeNetworkMessage(message));
  }
}
