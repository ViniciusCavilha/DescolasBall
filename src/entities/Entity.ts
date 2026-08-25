import type { Renderer } from '../rendering/Renderer';

export interface Entity {
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
}
