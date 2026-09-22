/** Canonical metre-space stops for the active city. A station is not playable
 * until its entrance, vertical circulation, platform and track are built. */
export const METRO_HEADWAY_SECONDS = 180;
export const METRO_DWELL_SECONDS = 25;

export const METRO_STATIONS = [
  { id: 'M01', name: 'Central Mall', x: 0, z: -68, arrivalX: 0, arrivalZ: -68, platformY: -64, mode: 'UNDERGROUND', line: 'A', status: 'SURVEYED' },
  { id: 'M02', name: 'Stadium Gardens', x: -355, z: 700, arrivalX: -355, arrivalZ: 700, platformY: -64, mode: 'UNDERGROUND', line: 'A', status: 'SURVEYED' },
  { id: 'M03', name: 'Civic Square', x: 1070, z: 500, arrivalX: 1070, arrivalZ: 500, platformY: -64, mode: 'UNDERGROUND', line: 'A', status: 'SURVEYED' },
  { id: 'M04', name: 'Medical Campus', x: 3380, z: 4400, arrivalX: 3380, arrivalZ: 4418, platformY: 12, mode: 'ELEVATED', line: 'A', status: 'SURVEYED' },
  { id: 'M05', name: 'East Center', x: 5300, z: 3000, arrivalX: 5300, arrivalZ: 3018, platformY: 12, mode: 'ELEVATED', line: 'A', status: 'SURVEYED' },
  { id: 'M06', name: 'East Bay Marina', x: 6500, z: 12800, arrivalX: 6500, arrivalZ: 12818, platformY: 12, mode: 'ELEVATED', line: 'A', status: 'SURVEYED' },
] as const;

export type MetroStation = (typeof METRO_STATIONS)[number];

/** Surveyed world-space alignment, including a gradual climb before the river.
 * These are engineering control points, not yet rendered collision geometry. */
export const METRO_ALIGNMENT = [
  { x: 0, z: -68, y: -64 },
  { x: -355, z: 700, y: -64 },
  { x: 1070, z: 500, y: -64 },
  { x: 1630, z: 1060, y: -48 },
  { x: 2160, z: 1650, y: -32 },
  { x: 2700, z: 2200, y: -20 },
  { x: 3200, z: 2800, y: -8 },
  { x: 3350, z: 3220, y: -4 },
  { x: 3350, z: 3400, y: 0 },
  { x: 3380, z: 4400, y: 12 },
  { x: 5300, z: 3000, y: 12 },
  { x: 6500, z: 12800, y: 12 },
] as const;

export const METRO_PORTAL = { x: 3350, z: 3310, y: 0, headingRadians: -Math.PI / 2 } as const;

export function maximumAlignmentGrade() {
  return Math.max(...METRO_ALIGNMENT.slice(1).map((point, index) => {
    const previous = METRO_ALIGNMENT[index];
    return Math.abs(point.y - previous.y) / Math.hypot(point.x - previous.x, point.z - previous.z);
  }));
}

export function nextMetroDeparture(nowSeconds: number) {
  return Math.ceil(nowSeconds / METRO_HEADWAY_SECONDS) * METRO_HEADWAY_SECONDS;
}
