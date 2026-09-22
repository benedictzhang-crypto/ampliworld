# Aureole Adventure Park — playable scene checkpoint

This checkpoint adds a 1,300 × 900 m park at world coordinate `(-7000, 2000)` in the active metre-scale city. The selected plot has no overlap with named housing, civic, service or generated building colliders. The south entrance is accessible from the city map; map teleport lands at the physical gate at `(-7000, 2432)`, and the visitor can then walk through the park. Teleportation is a player convenience, not a simulated transit trip.

## Spatial plan

- Northwest and west: five distinct coaster envelopes — the 90 m Leviathan hypercoaster, 65 m Wraith inverted ride with a vertical loop, 42 m Timberfall wooden-style ride, Eclipse indoor dark ride, and 21 m Little Comet family coaster.
- East: the blue 110 m Skyfall drop tower and red 105 m Skyfire launch tower, separated by their own queuing courts and linked by a sculptural canopy.
- South-central Festival Court: carousel, teacups, a three-hoop basketball court, and a narrow balance path over a foam-ball basin. A sloped start ramp is modeled for the balance path.
- Northeast: The Manor and Midnight Laboratory, each with a south entrance, six alternating rooms and a north exit. Alternating transverse walls force a serpentine walk rather than a facade-only scene. Two stage-triggered apparition events occur per house.
- South: ticket gates and the entrance plaza. Perimeter stone plinths and metal railings preserve views through the boundary.

The editable unmerged Blender scene is `web/asset-library/blender/amusement/amusement-park-source.blend`. The runtime mesh and manifest are in `web/public/assets/3d/ampliworld/GC-AMUSEMENT-001/`. The exact attraction layout lives in `web/app/world-client/amusement-park-plan.json`; the export script is `web/scripts/assets/build-amusement-park.py`.

## What works now

The park exists as original 3D geometry in the active city. The map selects it and teleports the player to the gate. The park floor, haunted-house floors, basketball court and foam-walk ramp/beam have matching height support; 214 structural and haunted-wall colliders are registered. Entering a haunted house reveals its current room and triggers a short 3D apparition at stages three and six. Basketball allows choosing release angle and speed; a visible ball follows ballistic motion and the hoop-height result is scored.

`npm run check:amusement`, `npx tsc --noEmit`, `npm run build`, and a headless Chrome map-to-entrance test passed. The Chrome test confirms the walker reaches `(-7000, 2432)` grounded. The export contains no pasted building images.

## Deliberate limits and next art/gameplay pass

This is a geometric production prototype, not final AAA art. Coaster trains, tower gondolas, carousel and teacups are currently display vehicles; boarding, dispatch, motion, safety restraints and ride cameras are not implemented. The Halloween routes are walkable and have jump-scare triggers, but room-by-room lighting, audio, branching secrets and final creature art need a dedicated pass. NPC leisure schedules are not connected, so resident avatars do not yet queue, play or work in the park. The park also needs higher-quality materials, signage, terrain sculpting and rigorous in-engine walking QA at every attraction.

Do not describe the current visuals as a finished high-fidelity theme park. The next most valuable slice is a focused 1:1 art and interaction pass on the entrance, one coaster loading station and one haunted-house room, followed by asset reuse across the park.
