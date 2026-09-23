import plan from './amusement-park-plan.json';

export type HauntStep = {
  house: 'haunt-manor' | 'haunt-lab';
  stage: number;
  title: string;
  cue: string | null;
};

const MANOR_CUES = [
  null,
  'The portraits begin to watch you.',
  'A pale figure lunges from behind the wall.',
  null,
  'The attic door slams behind you.',
  'Something follows you into the exit garden.',
] as const;
const LAB_CUES = [
  null,
  'The specimen tank opens.',
  'A containment suit appears beside you.',
  null,
  'The corridor suddenly goes red.',
  'The final subject is no longer in its cell.',
] as const;

/** Six sequential rooms in each physical, serpentine haunted-house plan. */
export function hauntStepAt(x: number, z: number): HauntStep | null {
  const localX = x - plan.center.x;
  const localZ = z - plan.center.z;
  for (const house of plan.hauntRoutes) {
    const attraction = plan.attractions.find((a) => a.id === house.id);
    if (!attraction) continue;
    const dx = localX - attraction.x;
    const dz = localZ - attraction.z;
    if (Math.abs(dx) > 70 || Math.abs(dz) > 74) continue;
    const stage = Math.max(0, Math.min(5, Math.floor((74 - dz) / 25)));
    const cues = house.id === 'haunt-manor' ? MANOR_CUES : LAB_CUES;
    return {
      house: house.id as HauntStep['house'],
      stage,
      title: house.stages[stage],
      cue: cues[stage],
    };
  }
  return null;
}

/** The actual open gap in the next physical partition, not a UI-only marker. */
export function hauntNextDoor(step: HauntStep) {
  const house = plan.attractions.find((a) => a.id === step.house)!;
  if (step.stage === 5) return {
    x: plan.center.x + house.x,
    z: plan.center.z + house.z - 76,
    side: 'exit' as const,
  };
  const offsets = [51, 26, 1, -24, -49];
  const right = step.stage % 2 === 0;
  return {
    x: plan.center.x + house.x + (right ? 63 : -63),
    z: plan.center.z + house.z + offsets[step.stage],
    side: right ? 'right' as const : 'left' as const,
  };
}

export function nearBasketballCourt(x: number, z: number) {
  const localX = x - plan.center.x;
  const localZ = z - plan.center.z;
  return Math.abs(localX + 140) < 43 && Math.abs(localZ - 345) < 36;
}

export function evaluateBasketballShot(speed: number, degrees: number) {
  const distance = 34;
  const radians = degrees * Math.PI / 180;
  const t = distance / (speed * Math.cos(radians));
  const height = 1.8 + speed * Math.sin(radians) * t - 4.905 * t * t;
  return { height, hit: Math.abs(height - 3.35) < .55, flightSeconds: t };
}
