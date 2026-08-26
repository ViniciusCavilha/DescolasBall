import type { NetworkPlayerSide } from '../shared/network';

export function canViewFacingIndicator(
  viewerSide: NetworkPlayerSide,
  targetSide: NetworkPlayerSide,
  isLocalPlayer: boolean,
): boolean {
  if (isLocalPlayer) return true;
  return viewerSide !== 'SPECTATOR' && viewerSide === targetSide;
}
