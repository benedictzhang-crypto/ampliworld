# Mori Sushi refinement

- Original single-floor restaurant enlarged from20×14m to24×20m, including a separated rear kitchen. Existing city coordinates (180,−38) retained.
- Seven original counter stools and hinoki counter retained; four Japanese timber dining tables and sixteen individual chairs.
- Rear kitchen includes prep benches, twin-bowl sink/faucets, six-burner range, oven, hood/duct and stocked pantry shelving. Staff opening at local(8.2,−6.7),1.8m wide.
- New registered `GC-SUSHI-GARDEN-001` surrounds the building with stone slab paths, gravel, low timber/stone boundaries, gate, sculpted pines/maples, bamboo, rocks and stone lanterns. All assets are original 3D geometry, not facade photographs.
- Exactly12 marked parking bays, two banks of six, with8m central aisle, wheel stops and a separate entrance from the existing road. A pedestrian crossing links parking and garden.
- Ground support and colliders are registered in the same continuous world. Existing named buildings are not removed or covered.

## Checks

- TypeScript and production build passed.
- `check-civic-assets.mjs` verifies GLB geometry, entrance/window/counter collision, customer-to-kitchen path, garden ring routes,12 unique bays and a conservative car envelope through driveway/aisle. Existing stadium and automotive checks still pass.
- Background headless scene load and screenshot passed; the exterior was visually inspected. No Safari window opened.
- Restaurant34,376triangles/16material batches; garden17,200triangles/10batches. Site source includes both asset generators.

## Limits

Kitchen appliances and furniture are modeled fixtures, not functional cooking/seating systems. Ordering and business-agent placement remain separate integration work. Parking bay count and access are tested; a full driving/turning test into every individual bay and an interior visual walkthrough remain to be completed.
