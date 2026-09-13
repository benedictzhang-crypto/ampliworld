# 20 × 30 km generated city checkpoint

Implementation block: 13 September 2026 UTC. Generation stopped after the ten-minute block; validation, source publishing and backup follow separately.

## Implemented

- Exact metre bounds: X −10,000…10,000; Z −15,000…15,000. The existing detailed residences, mall and three original office towers remain intact in the central reserved parcel.
- 485 detailed GLB tiles; 1,300 compounds/campuses; 7,800 registered exterior buildings. Categories: 415 working residential compounds, 344 middle residential, 288 high-end, 153 office campuses, 44 hospitals, 40 schools and 16 cyber churches. These are generated placements, not operational institutions.
- Residential compound boundaries, gate gaps/posts, courtyards and perimeter circulation. High-end parcels include visible basement-entry gates and separated courtyard/perimeter areas. Basement gates are closed; complete garages and enforced pedestrian/vehicle separation are not implemented.
- Seeded variation in dimensions, materials and roof/crown details. IDs and parameter signatures are unique; this does not establish that every silhouette is visually unique. All new structures use geometry rather than facade photographs.
- Continuous curved river, 28 raised bridge crossings with sloped approaches, an estuary widening and a 4 m waterfall down to the sea. Bridge floor interpolation prevents vertical snapping; walkers/cars reject abrupt excessive upward steps.
- Road corridors reserve carriageway, cycle lanes, sidewalks, service lanes and parking strips. Reference principles: [Beijing street design](https://www.beijing.gov.cn/ywdt/gzdt/202007/t20200720_1951859.html) and [keeping parking out of pedestrian/cycle space](https://www.beijing.gov.cn/zhengce/zcjd/202103/t20210329_2331607.html). This is design inspiration, not a claim of engineering or statutory compliance.
- Per-tile building colliders, local infrastructure collider selection and a spatial index for road surface queries. A distance-loaded detail layer replaces corresponding coarse overview shells only after detail is available. Far buildings remain represented.
- Full-city overview is separate from local district overview. Returning to the player preserves their position. Existing driving and day/night code remain active; normal sky renders are hidden only in whole-city overview.

## Reproducible sources

- `web/scripts/assets/build-city20x30.mjs`: parcels, compounds, civic forms, unique registry, per-tile models and overview.
- `web/scripts/assets/build-city-infra.mjs`: terrain, river, waterfall, road mesh, raised bridges, colliders and road surface metadata.
- `web/public/assets/3d/ampliworld/GC-CITY-2030`: tile GLBs, city manifest, building registry and overview GLB.
- `web/public/assets/3d/ampliworld/GC-CITY-INFRA-001`: global infrastructure GLB and manifest.
- `web/app/world-client/city-layer.tsx` and `city-surface.ts`: detail loading and height queries, separate from financial simulation services.

## Validation

- `node --import tsx scripts/check-city2030.mjs`: passed bounds, files, unique registration, core reservation, civic counts, all 28 bridge height transitions, river and sea levels.
- TypeScript: passed.
- Native-GPU headless browser: whole-city overview rendered; returning to character preserved spawn coordinates; no runtime exception in this scenario. Screenshot reviewed in background; Safari was not opened.
- Geometry totals: detailed buildings 1,384,252 triangles; overview 93,600; global infrastructure 360,170. These are asset counts, not a measured frame-rate guarantee.

## Next bounded blocks / limitations

1. Art direction: reduce the uniform outer grid, introduce distinct neighborhood compositions, more varied heights, riverfront landmarks and greenery matching the reference image. Current generated outer city is a planning base, visibly less finished than the core.
2. Finish paved road tie-ins between the retained core and outer network; land is continuous but every arterial intersection is not yet fully designed. Mark real parking bays and safe turning paths instead of only reserved strips.
3. Walk/drive longer routes through representative compounds, civic parcels and bridge approaches. Current tests are not an exhaustive collision audit of all 7,800 buildings.
4. Add bounded GLTF cache eviction and device-specific detail budgets. Current distance loading is a first implementation, not production-grade streaming. Camera-following far sky/weather over the entire world remains to be refined.
5. Build garage ramps/interiors, institution functions, traffic/pedestrian routing and additional high-quality architectural variants. The synthetic population is not instantiated as billions of rendered NPCs.

No claiming that a ten-minute generation pass has produced a finished, fully refined 600 km² city.
