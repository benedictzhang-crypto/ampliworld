# Golden City — landform handoff

2026-09-12. Design study, not a completed or playable city.

The new core occupies 2,000 × 2,000 real metres. It does not scale or replace the legacy client scene. The geography registry is `web/app/world-core-geography.ts`; the parcel registry remains `web/app/world-core-plan.ts`.

Run from `web`: `node --import tsx scripts/export-golden-city-plan.mjs`.

## Outputs

- `web/public/planning/golden-city-masterplan.svg`: north-up survey diagram, 64 parcel IDs, seven precinct allocations, height envelopes and three bridge reservations.
- `golden-city-masterplan.json`: the same metric data, terrain coefficients and planning restrictions for downstream tools.
- `golden-city-terrain.obj`: 10,201 vertices / 20,000 triangles, sampled at 20 metres.
- `golden-city-water.obj`: connected river stations, a 34-metre vertical waterfall curtain and a coastal water surface.

OBJ coordinates are metres, Y up, +Z north. Import into Blender with source forward −Z, up Y, scale 1.0. Building height caps are above local ground, not absolute sea-level elevations. No external art assets or asset licences are introduced here.

## Design decisions

The river enters from the northeast ridge, drops at Aurelian Falls, traverses the civic and commercial reaches and joins the southwest bay. Its centreline is approximately 2.39 km long. The river mouth reaches sea level inside the ocean polygon; the fall is explicit geometry rather than a label at a disconnected river endpoint.

Residential gardens, schools and civic services surround the exchange quarter. The ridge is reserved for lower-height estates; the coast for marina, hotels and public access. These are coarse land-use allocations: water channels and public banks override parcel colours, and a coloured parcel does not mean its full area is buildable.

## Validation and limits

The exporter checks parcel coverage, non-rising downstream water levels, river-to-sea connection, waterfall crest/toe correspondence, finite terrain samples, bridge landing reservations and nine-metre conceptual soffit clearance. It is not a hydrological model or a collision certificate. Bridges are reservations, not finished deck/ramp structures.

Detailed bank grading, waterfall rock/cliff geometry, shoreline treatment, roads, bridge approaches, building assets, HLOD, collision and navmesh are next-stage work. The sampled terrain requires local refinement at the vertical fall and coastline. No Blender/Unreal integration or beautiful-city visual acceptance is claimed.

Next ten-minute unit: establish one connected road corridor and its bridge approach elevations, then select a single showcase parcel for modular street and building production.
