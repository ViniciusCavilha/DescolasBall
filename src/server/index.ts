import { GameServer } from './GameServer';

const server = new GameServer();
const port = await server.start();
console.log('Servidor DescolasBall ativo em ws://localhost:' + port);

const shutdown = async (): Promise<void> => {
  await server.stop();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
