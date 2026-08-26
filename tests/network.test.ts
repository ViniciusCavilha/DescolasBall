import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import WebSocket from 'ws';
import { GameServer } from '../src/server/GameServer';
import { deserializeClientMessage, deserializeServerMessage, serializeNetworkMessage, type ServerMessage } from '../src/shared/network';

let server: GameServer;
let url: string;
const sockets: WebSocket[] = [];

before(async () => {
  server = new GameServer({ port: 0, tickRate: 60, networkSendRate: 30 });
  const port = await server.start();
  url = 'ws://127.0.0.1:' + port;
});
after(async () => {
  for (const socket of sockets) socket.close();
  await server.stop();
});

describe('contratos de rede', () => {
  test('rejeita JSON e payload inválidos', () => {
    assert.equal(deserializeClientMessage('{').value, null);
    assert.equal(deserializeClientMessage(JSON.stringify({ type: 'INPUT', payload: {} })).value, null);
  });
});

describe('servidor com dois clientes', () => {
  test('conecta, identifica, recebe input/snapshot, responde ping e desconecta', async () => {
    const first = await connectClient();
    const second = await connectClient();
    assert.notEqual(first.playerId, second.playerId);
    assert.equal(server.getPlayerCount(), 2);
    const firstSnapshot = await waitForMessage(first.socket, (message) =>
      message.type === 'MATCH_STATE' && message.payload.players.length === 2);
    const secondSnapshot = await waitForMessage(second.socket, (message) =>
      message.type === 'MATCH_STATE' && message.payload.players.length === 2);
    assert.equal(firstSnapshot.type, 'MATCH_STATE');
    assert.equal(secondSnapshot.type, 'MATCH_STATE');

    first.socket.send(serializeNetworkMessage({ type: 'INPUT', payload: {
      sequence: 1, up: false, down: false, left: false, right: true, kick: false,
    } }));
    const moved = await waitForMessage(first.socket, (message) =>
      message.type === 'MATCH_STATE'
      && (message.payload.players.find((player) => player.id === first.playerId)?.velocity.x ?? 0) > 0);
    assert.equal(moved.type, 'MATCH_STATE');

    first.socket.send(serializeNetworkMessage({ type: 'PING', payload: { sentAt: 123 } }));
    const pong = await waitForMessage(first.socket, (message) => message.type === 'PONG');
    assert.equal(pong.type, 'PONG');
    assert.equal(pong.payload.sentAt, 123);

    second.socket.close();
    const left = await waitForMessage(first.socket, (message) =>
      message.type === 'PLAYER_LEFT' && message.payload.playerId === second.playerId);
    assert.equal(left.type, 'PLAYER_LEFT');
    const finalSnapshot = await waitForMessage(first.socket, (message) =>
      message.type === 'MATCH_STATE' && message.payload.players.length === 1);
    assert.equal(finalSnapshot.type, 'MATCH_STATE');
    assert.equal(server.getPlayerCount(), 1);
  });
});

async function connectClient(): Promise<{ socket: WebSocket; playerId: string }> {
  const socket = new WebSocket(url); sockets.push(socket);
  const welcome = await waitForMessage(socket, (message) => message.type === 'WELCOME');
  assert.equal(welcome.type, 'WELCOME');
  return { socket, playerId: welcome.payload.playerId };
}

function waitForMessage(socket: WebSocket, predicate: (message: ServerMessage) => boolean, timeoutMilliseconds = 2_000): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Tempo esgotado aguardando mensagem.')); }, timeoutMilliseconds);
    const onMessage = (data: WebSocket.RawData): void => {
      const parsed = deserializeServerMessage(data.toString());
      if (parsed.value && predicate(parsed.value)) { cleanup(); resolve(parsed.value); }
    };
    const cleanup = (): void => { clearTimeout(timeout); socket.off('message', onMessage); };
    socket.on('message', onMessage);
  });
}
