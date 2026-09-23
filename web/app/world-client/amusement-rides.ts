import plan from './amusement-park-plan.json';

type Track = { x: number; z: number; rx: number; rz: number; peak: number; phase: number; wooden?: boolean; inverted?: boolean };
type Coaster = { id: string; label: string; kind: 'coaster'; station: [number, number]; track: Track; speed: number; color: string };
type Tower = { id: string; label: string; kind: 'tower'; station: [number, number]; x: number; z: number; height: number; color: string; duration: number };
export type ParkRide = Coaster | Tower;
export type RideSession = { id: string; startedAt: number };

// Station positions and track equations match the editable Blender source.
export const PARK_RIDES: ParkRide[] = [
  { id: 'leviathan', label: 'Leviathan', kind: 'coaster', station: [-365, -25], track: { x: -362, z: -219, rx: 220, rz: 145, peak: 90, phase: 0 }, speed: .16, color: '#209bc6' },
  { id: 'wraith', label: 'Wraith', kind: 'coaster', station: [-372, 297], track: { x: -370, z: 149, rx: 186, rz: 127, peak: 65, phase: 1.3, inverted: true }, speed: .2, color: '#8451bc' },
  { id: 'timberfall', label: 'Timberfall', kind: 'coaster', station: [-37, 274], track: { x: -20, z: 148, rx: 146, rz: 102, peak: 42, phase: .7, wooden: true }, speed: .14, color: '#a0784a' },
  { id: 'eclipse', label: 'Eclipse', kind: 'coaster', station: [0, -142], track: { x: 0, z: -255, rx: 94, rz: 66, peak: 27, phase: 1.8 }, speed: .22, color: '#ca4a4a' },
  { id: 'comet', label: 'Little Comet', kind: 'coaster', station: [263, 291], track: { x: 261, z: 185, rx: 103, rz: 79, peak: 21, phase: .4 }, speed: .12, color: '#e49b3c' },
  { id: 'twin-blue', label: 'Skyfall Blue', kind: 'tower', station: [350, 6], x: 350, z: -30, height: 110, color: '#2496f1', duration: 17 },
  { id: 'twin-red', label: 'Skyfire Red', kind: 'tower', station: [430, 6], x: 430, z: -30, height: 105, color: '#e84459', duration: 16 },
];

export function rideAtStation(worldX: number, worldZ: number) {
  const x = worldX - plan.center.x;
  const z = worldZ - plan.center.z;
  return PARK_RIDES.find((ride) => Math.abs(x - ride.station[0]) <= 27 && Math.abs(z - ride.station[1]) <= 19) ?? null;
}

export function rideDuration(ride: ParkRide) {
  return ride.kind === 'coaster' ? 8 + 2 * Math.PI / ride.speed : ride.duration;
}

export function coasterPoint(ride: Coaster, t: number) {
  const { x, z, rx, rz, peak, phase, wooden, inverted } = ride.track;
  const wave = Math.max(0, Math.cos(t + phase)) ** 9;
  const hill = Math.max(0, Math.sin(3 * t - phase)) ** 6;
  let y = 10 + (peak - 10) * wave + peak * .26 * hill;
  if (inverted) y += 8 * Math.sin(2 * t) ** 2;
  if (wooden) y = 9 + (peak - 9) * Math.max(0, Math.sin(2 * t + phase)) ** 4 + 5 * Math.sin(7 * t) ** 2;
  return { x: x + rx * Math.cos(t), y, z: z + rz * Math.sin(t) };
}

export function coasterSpurControls(ride: Coaster) {
  const rail = coasterPoint(ride, Math.PI / 2);
  return [
    { x: ride.station[0], y: 2.5, z: ride.station[1] },
    { x: ride.station[0] + 10, y: 5, z: ride.station[1] - 12 },
    { x: rail.x + 30, y: Math.max(6, rail.y - 5), z: rail.z + 8 },
    rail,
  ] as const;
}

export function coasterSpurPoint(ride: Coaster, progress: number) {
  const p = coasterSpurControls(ride);
  const t = Math.max(0, Math.min(1, progress));
  const s = 1 - t;
  return {
    x: s ** 3 * p[0].x + 3 * s ** 2 * t * p[1].x + 3 * s * t ** 2 * p[2].x + t ** 3 * p[3].x,
    y: s ** 3 * p[0].y + 3 * s ** 2 * t * p[1].y + 3 * s * t ** 2 * p[2].y + t ** 3 * p[3].y,
    z: s ** 3 * p[0].z + 3 * s ** 2 * t * p[1].z + 3 * s * t ** 2 * p[2].z + t ** 3 * p[3].z,
  };
}

function towerHeight(ride: Tower, elapsed: number) {
  const top = ride.height - 9;
  if (ride.id === 'twin-blue') {
    if (elapsed < 9) return 4 + (top - 4) * elapsed / 9;
    if (elapsed < 10.5) return top;
    if (elapsed < 12.5) return top - (top - 5) * ((elapsed - 10.5) / 2) ** 2;
    if (elapsed < 14.5) return 5 + 8 * Math.sin((elapsed - 12.5) * Math.PI / 2) * Math.exp(-(elapsed - 12.5));
    return 4;
  }
  if (elapsed < 2.5) return 4 + (top - 4) * Math.sin(elapsed / 2.5 * Math.PI / 2);
  if (elapsed < 4) return top;
  if (elapsed < 13) return 4 + (top - 4) * (1 - (elapsed - 4) / 9) ** 2;
  return 4;
}

export function ridePose(ride: ParkRide, elapsed: number) {
  const time = Math.max(0, Math.min(elapsed, rideDuration(ride)));
  if (ride.kind === 'tower') {
    const y = towerHeight(ride, time);
    // Seat-eye remains just outside the safety ring, so the rail does not fill the view.
    return { x: ride.x + 10.8, y, z: ride.z, aheadX: ride.x + 30, aheadY: y + 1, aheadZ: ride.z, done: elapsed >= ride.duration };
  }
  const lap = 2 * Math.PI / ride.speed;
  let p;
  let ahead;
  if (time < 4) {
    const u = time / 4;
    p = coasterSpurPoint(ride, u);
    ahead = coasterSpurPoint(ride, Math.min(1, u + .03));
  } else if (time < 4 + lap) {
    const t = Math.PI / 2 + (time - 4) * ride.speed;
    p = coasterPoint(ride, t);
    ahead = coasterPoint(ride, t + .035);
  } else {
    const u = 1 - (time - 4 - lap) / 4;
    p = coasterSpurPoint(ride, u);
    ahead = coasterSpurPoint(ride, Math.max(0, u - .03));
  }
  return { ...p, aheadX: ahead.x, aheadY: ahead.y, aheadZ: ahead.z, done: elapsed >= rideDuration(ride) };
}
