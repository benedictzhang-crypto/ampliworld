# Sports district, street dining and core road connections

## Implemented

- Original GC-STADIUM-001 at (0,600)m: 288 × 356 m parcel, sculptural asymmetric white/gold roof with a 144 × 204 m open oculus, 28 seating tiers, 105 × 68 m marked football pitch and dimensional goals/net fibres. 112,860 triangles, 11 material meshes. South entrance at (0,776)m leads to the field; sectional stand collision does not seal the central space. Roof winding and coplanar turf/runoff were corrected during visual review; runoff is now a ring outside the grass footprint.
- Original GC-SUSHI-001 at (180,−38)m: 20 × 14 m main building, deep eaves, raised MORI SUSHI lettering, cedar fins, lanterns, display glazing, four-metre door, counter/stools, tables, geometric sushi and bottles. 27,792 triangles. Porch and eaves extend beyond the main footprint. Wall/furniture collision leaves the room enterable.
- South sports streets extend the retained CBD loop. Main roads, cycle lanes, sidewalks, moderate planted strips, pedestrian stadium approach and 44 marked surface parking bays. Core/global seams at (±650,−500) and (±500,1150)m are now paved. Existing CBD curb strips were removed at the new crossroad rather than leaving curbs through traffic lanes.
- All new assets registered with metric positions, geometry, surfaces and collision metadata. No old named buildings removed or covered. Overall world boundary remains 20 × 30 km; the amount of developed playable content increased.
- Camera-only stadium and sushi previews; returning to the character retains their physical location. These are inspection cameras, not map travel or teleportation.
- Sky and cloud horizontal origins now follow the camera in metre-space mode so travelling outside the original 8 km sky centre no longer leaves the viewer outside the sky. The 55-minute day/night cycle is preserved.

## Verified

- New asset checks: GLB validity, no facade-image substitution, metric field dimensions, open roof, triangle budgets, restaurant/stadium entrance paths, four regional road seam paths and height continuity.
- Existing city checks: all 28 bridges and city registry still pass.
- Native-GPU headless browser: both landmark views render; returning retains avatar coordinates; no runtime exceptions. Stadium and storefront screenshots reviewed without opening Safari.
- TypeScript and production build passed before publishing this source.

## Not yet implemented

- No football match rules, moving ball, animated crowd, seat navigation or ticketing. Stands remain blocked for this stage; the pitch and south approach are walkable.
- Restaurant is enterable geometry, not a functioning ordering/payment/job system.
- No new garage interiors, traffic AI, parking enforcement or extra road lanes through every generated neighborhood. Route tests check sampled centres/entrances, not exhaustive rigid-body simulation of all city objects.
- Outer city remains a procedural base. Photoreal material/lighting refinement, independent building variants, richer district composition and bounded streaming-cache eviction remain follow-up blocks.
