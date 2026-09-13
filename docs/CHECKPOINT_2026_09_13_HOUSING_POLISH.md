# Housing completion pass — 13 September 2026

## Completed

- Road and walkway ground queries now match their actual mesh tops, including rotated connector roads. A spatial index replaces full-world road searches; home floor lookups are grouped per parcel.
- Three-metre sidewalks flank residential cross streets, with direct entrance paths from individual homes.
- Gates fold into a wall-side pocket and retain matching collision. Closing is disabled while either the player or the playable car occupies the opening; no floating jump-through gate remains.
- Near housing retains a correctly positioned volume silhouette while its detailed asset loads. Asset failures retain the silhouette instead of blanking the world. Matrix upload occurs before paint, including demand-render invalidation.
- Visual streaming follows the orbit target in 500 m cells; housing and surrounding civic tiles follow the inspection camera. Collision streaming remains player-centred and never teleports the avatar.
- Counts, parcel assignments and existing landmarks are unchanged.

## Checks

TypeScript, production build, housing counts/footprints, road support, proxy bounds, open/closed gate collision and occupied-gate guard checks. A reproducible access sweep uses the player's radius, height and step allowance across 966 lobbies, 15 supermarket entries and 50 gates; 11 sealed tower doors are checked as intentionally solid. Headless preview/return regression and delayed-housing-request screenshots verify loading behavior without opening Safari.

## Not completed

Functioning residential lifts, private apartment interiors, identity-based access control, simulated guard/shop services, full regional road redesign, distinctive art direction per neighborhood and long-session low-end-device performance work remain. Silhouettes are loading/far representations, not a claim of equally detailed geometry at all distances. This pass adds no population, trading or economy features.
