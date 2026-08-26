import './style.css';
import { Game } from './core/Game';
import { GameLoop } from './core/GameLoop';
import { Renderer } from './rendering/Renderer';
import { NetworkClient } from './client/network/NetworkClient';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

if (!canvas) {
  throw new Error('Canvas #game-canvas não foi encontrado.');
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('O navegador não oferece suporte ao Canvas 2D.');
}

const renderer = new Renderer(canvas, context);
const onlineMode = new URLSearchParams(window.location.search).get('mode') === 'online';
const networkClient = onlineMode ? new NetworkClient() : null;
networkClient?.connect();
const game = new Game(renderer, networkClient);
const gameLoop = new GameLoop(game);

gameLoop.start();

window.addEventListener('beforeunload', () => {
  gameLoop.stop();
  game.dispose();
});
