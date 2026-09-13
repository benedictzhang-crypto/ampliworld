# Interior and exterior scale contract

All authored geometry uses metres. Avatar height, street furniture, doors, vehicles and buildings share this unit system. Camera field of view does not change an object's physical size.

## Continuous small interiors

Restaurants and showroom ground floors are part of the exterior world. Open doorways are empty space between individually registered wall and glass colliders. Counters, vehicles, furniture, columns and roofs have separate collision volumes. Never use a solid building-sized collider for an enterable room, or a facade photograph as a substitute for geometry.

The sushi shop is the current small-interior reference. The Aureline automotive centre extends this pattern to a large open showroom and an upper gallery reached by guarded physical stairs. Height-aware support selection preserves both floors. Service areas remain visual first; only explicitly tested routes may be described as playable.

## Large buildings: future streaming boundary

Preserve metre scale and architectural dimensions for publicly visible lobbies, glazing and their connected exterior. Load additional floors/interiors only when required. A streaming boundary must preserve the doorway transform, camera heading, player velocity, floor elevation and collision continuity. Keep a loading guard until the destination collision data is ready.

Private apartments or venues may be separate instances, but must not pretend to occupy contradictory space visible through an exterior window. Use elevators, vestibules or controlled doors for explicit transitions. This is an architectural contract, not a claim that multilevel interior streaming is implemented today.

## Verification

- Positive route tests: cross the entrance threshold without collision or a floor discontinuity.
- Negative tests: glass, furniture and walls block movement.
- Camera clearance includes roof eaves, not only the main footprint.
- Campus bounds and access roads are checked against existing named buildings and obstacles before placement.
- Overview cameras do not teleport the avatar.
