import { GAME_CONFIG } from '../config/gameConfig';
import { createFieldGeometry, type FieldGeometry } from './field';
import { Vector2 } from './math/Vector2';

export interface ArenaVisual { surfaceColor: string; lineColor: string; }
export interface ArenaDefinition {
  id: string; name: string; width: number; height: number;
  goalOpeningSize: number; goalDepth: number;
  spawns: { ball: Vector2; teamA: Vector2; teamB: Vector2 };
  visual: ArenaVisual;
}

const arena = (definition: Omit<ArenaDefinition, 'spawns'>): ArenaDefinition => ({
  ...definition,
  spawns: {
    ball: new Vector2(definition.width / 2, definition.height / 2),
    teamA: new Vector2(definition.width * 0.25, definition.height / 2),
    teamB: new Vector2(definition.width * 0.75, definition.height / 2),
  },
});

export const ARENAS: readonly ArenaDefinition[] = [
  arena({ id: 'default', name: 'Arena Principal', width: GAME_CONFIG.worldWidth,
    height: GAME_CONFIG.worldHeight, goalOpeningSize: 260, goalDepth: 90,
    visual: { surfaceColor: '#167a4b', lineColor: '#d9f5e7' } }),
  arena({ id: 'compact', name: 'Arena Compacta', width: 1360, height: 800,
    goalOpeningSize: 220, goalDepth: 75,
    visual: { surfaceColor: '#166a61', lineColor: '#d9fff9' } }),
] as const;

export function getArena(id: string): ArenaDefinition | null {
  return ARENAS.find((candidate) => candidate.id === id) ?? null;
}
export function createArenaField(value: ArenaDefinition): FieldGeometry {
  return createFieldGeometry(value.width, value.height, value.goalOpeningSize, value.goalDepth);
}
