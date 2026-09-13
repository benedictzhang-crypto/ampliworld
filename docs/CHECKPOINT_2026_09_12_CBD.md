# CBD skyline checkpoint

## Implemented

| Asset | Name | Height, including crown/spire | Local centre X/Z |
| --- | --- | --- | --- |
| GC-OFFICE-001 | 曜旋中心 / Aurelia Helix | 500 m | −150 / −410 m |
| GC-OFFICE-002 | 棱境中心 / Prism Gate | 350 m | 150 / −410 m |
| GC-OFFICE-003 | 星穹中心 / Celestial Spire | 420 m | 0 / −590 m |

Original swept envelopes, actual floor bands, fins, canopies, podiums, plaza planters and benches. Opaque metallic glass uses the existing environment reflections. Geometry is exported offline into three reusable GLBs, not built from facade pictures. 391,356 tower triangles across 25 merged material meshes. Each full-detail tower remains mounted at distance; normal view has no abrupt LOD swap.

96 × 96 m plazas, supported at Y=0.18 m. Sealed podium colliders, planter/bench/column colliders, vertical envelope bands and spire colliders support the existing approximate AABB player/camera system. No claim of mesh-perfect physics. New ground envelope: X ±440 m, Z ±780 m. Existing mall ramp void remains open. New 40 m-wide street corridors connect at X ±240 m, with cross-boulevards at Z −310, −500 and −700 m, cycle strips and lamp-lined sidewalks. Buildings are not relocated or overwritten.

Overview framing now fits all three towers without hiding the rear tower. Overview near plane is 8 m rather than the walker's 0.1 m, retaining depth-buffer precision for fine coplanar street/facade detail at kilometre viewing distances. The previous player's camera/location restore behaviour is retained. Raised cloud layer and 55-minute day/night cycle are preserved.

## Validation

- `node --import tsx scripts/check-cbd-assets.mjs`: exact exported heights; no facade images; material draw-call budgets; non-overlapping tower/mall parcels; continuous ring-road floor heights; plaza support; basement cutout.
- `node --import tsx scripts/check-mall-campus.mjs`: existing mall, both gallery entrances, parking and basement regression checks.
- TypeScript and deployment build.
- Background browser gameplay/visual check passed with native GPU: animated gait, turn-and-walk, released jump/landing, no held-key bunny hopping, stationary mouse orbit, overview state retention. Software-only rendering was too slow for fixed wall-clock jump samples; this does not establish a software-rendering performance pass. No Safari opening.

## Remaining

Office interiors, functioning lifts, occupancy/economy integration, richer ground-level civic landscaping and street vehicles are not built. No new tower LOD assets, streaming controller, HLOD or occlusion budget has been implemented in this block. All towers are presently full-detail assets; mobile/low-power performance requires future profiling. This is a skyline/connected-street prototype, not completion of the 2 × 2 km quality core.

## Design references, not reproduced designs

Only architectural vocabulary was studied: twisting envelope, crystalline clarity, and progressive setbacks. All meshes and dimensions are AmpliWorld originals, with no copied logos, building models or facade imagery.

- [Gensler — Shanghai Tower](https://www.gensler.com/projects/shanghai-tower)
- [SOM — One World Trade Center](https://www.som.com/projects/one-world-trade-center/)
- [SOM — Burj Khalifa](https://www.som.com/projects/burj-khalifa/)
