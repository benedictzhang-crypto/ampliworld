/** Shared metre-space river survey. West bank stays fixed beside existing homes. */
export const riverBaseX = (z) => 2200 + 550 * Math.sin(z / 3500);
export const riverCenterX = (z) => riverBaseX(z) + 120;
export const riverHalfWidth = (z) =>
  300 + 700 * Math.max(0, Math.min(1, (z - 13000) / 200));
export const riverWestBank = (z) => riverCenterX(z) - riverHalfWidth(z);
export const riverEastBank = (z) => riverCenterX(z) + riverHalfWidth(z);
