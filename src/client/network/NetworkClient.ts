import { NETWORK_CONFIG } from './networkConfig';
import {
  deserializeServerMessage, serializeNetworkMessage,
  type ClientMessage, type NetworkInput, type NetworkMatchSnapshot, type ServerMessage,
} from '../../shared/network';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
export type NetworkListener = (message: ServerMessage) => void;

export class NetworkClient {
  private socket: WebSocket | null = null;
  private pingTimer: number | null = null;
  private hadConnectionError = false;
  private readonly listeners = new Set<NetworkListener>();
  public connectionState: ConnectionState = 'DISCONNECTED';
  public playerId: string | null = null;
  public roundTripTimeMilliseconds: number | null = null;
  public latestSnapshot: NetworkMatchSnapshot | null = null;
  public readonly snapshotBuffer: NetworkMatchSnapshot[] = [];

  public constructor(private readonly url = NETWORK_CONFIG.serverUrl) {}

  public connect(): void {
    if (this.connectionState === 'CONNECTING' || this.connectionState === 'CONNECTED') return;
    this.connectionState = 'CONNECTING';
    this.hadConnectionError = false;
    try {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener('open', this.handleOpen);
      socket.addEventListener('message', this.handleMessage);
      socket.addEventListener('close', this.handleClose);
      socket.addEventListener('error', this.handleError);
    } catch {
      this.connectionState = 'ERROR';
    }
  }

  public disconnect(): void {
    this.send({ type: 'LEAVE_MATCH', payload: {} });
    this.socket?.close(1000, 'Cliente desconectado');
    this.cleanupSocket();
    this.hadConnectionError = false;
    this.connectionState = 'DISCONNECTED';
  }

  public sendInput(input: NetworkInput): boolean {
    return this.send({ type: 'INPUT', payload: input });
  }
  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private readonly handleOpen = (): void => {
    this.connectionState = 'CONNECTED';
    this.send({ type: 'JOIN_MATCH', payload: {} });
    this.sendPing();
    this.pingTimer = window.setInterval(() => this.sendPing(), NETWORK_CONFIG.pingIntervalMilliseconds);
  };
  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (typeof event.data !== 'string') return;
    const parsed = deserializeServerMessage(event.data);
    if (!parsed.value) return;
    const message = parsed.value;
    if (message.type === 'WELCOME') this.playerId = message.payload.playerId;
    if (message.type === 'MATCH_STATE') {
      this.latestSnapshot = message.payload;
      this.snapshotBuffer.push(message.payload);
      if (this.snapshotBuffer.length > NETWORK_CONFIG.snapshotBufferSize) {
        this.snapshotBuffer.shift();
      }
    }
    if (message.type === 'PONG') this.roundTripTimeMilliseconds = Math.max(performance.now() - message.payload.sentAt, 0);
    for (const listener of this.listeners) listener(message);
  };
  private readonly handleClose = (): void => {
    this.cleanupSocket();
    this.connectionState = this.hadConnectionError ? 'ERROR' : 'DISCONNECTED';
    this.playerId = null;
    this.latestSnapshot = null;
    this.snapshotBuffer.length = 0;
  };
  private readonly handleError = (): void => {
    this.hadConnectionError = true;
    this.connectionState = 'ERROR';
  };

  private sendPing(): void {
    this.send({ type: 'PING', payload: { sentAt: performance.now() } });
  }
  private send(message: ClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(serializeNetworkMessage(message));
    return true;
  }
  private cleanupSocket(): void {
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    this.pingTimer = null; this.socket = null;
  }
}
