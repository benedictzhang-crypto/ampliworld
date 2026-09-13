# AmpliWorld — retained city brief

The architecture upgrade does not discard the game or the owner's world design. Keep the legacy playable client available while replacing terrain, roads and architecture district by district. Do not claim a construction-yard asset viewer is the upgraded city. Do not delete named buildings or functional destinations to make room for unreviewed replacements.

## The whole city remains the objective

| Region / system | Retained requirements and design references |
|---|---|
| Metropolitan structure | Los Angeles and Beijing: a large connected metropolis, multiple centres, ring/radial routes, broad boulevards, commercial clusters and residential communities. Start with a detailed 2×2 km core inside a future 20×20 km city; do not stretch the old world. |
| River corridor | Chicago, Boston and Shanghai: one continuous main river, bridges, waterfront streets, riverfront parks and skyline. Upstream waterfall and a credible sea connection. |
| CBD / vertical living | New York skyline; Manhattan Central Park luxury duplex residences with private lift arrivals. Different towers have different silhouettes, setbacks and roof structures. |
| Mixed residential neighbourhoods | Lower-middle, middle, upgraded, high-end and top-tier homes around malls, offices and suburban centres. Beijing Xinghewan and Shanghai Tomson Riviera are owner-provided design references, not licensed assets or exact replicas. |
| Villas | Townhouses, semi-detached and detached houses. Owner references: 北京润园、茂源云紀、北辰红橡墅、紫玉山庄、润泽御府. Combine distinct courtyards, pools, terraces and landscape settings rather than scaling one building. |
| Ridge and summit | Los Angeles and Hong Kong hillside living: varied mid-slope and summit villas, switchback roads, retaining structures, panoramic terraces and real elevation changes. |
| Coast and marina | Sanya bays and Miami: beaches, yacht hotels, marinas, varied yacht sizes, working vessels and waterfront commerce. Waterborne assets stay registered at water locations. |
| Street life | Preserve Taiwan as an owner-requested neighbourhood/street-life reference alongside the other cities; specific districts still need art-direction selection. Schools, supermarkets, produce markets, restaurants, shops and social destinations remain real places. |
| Civic and transport | Hospitals, police stations, schools and their campuses; concrete-grey/white/gold cyber church; Beijing-style street-level metro entrances; elevated coastal rail and bridge to the offshore city; highways, ramps, sidewalks and cycle lanes. |
| Leisure and prestige | Sea casino/offshore destination, original grand-prix circuit, large car dealerships with forecourts and parking, yacht trade, luxury consumption and gated high-end estates. |

## Game systems to retain

Character-centred WASD movement with independent camera look; market trading and portfolio; jobs, wages and food/wellbeing; transport costs; housing ownership; NPCs and social actions; server-authoritative economy and save snapshots. These systems must be adapted to new metre-space placements without migrating legacy compressed coordinates blindly. Rendering client, world registry and AI/economy backend remain separate concerns.

## Building production rule

Every new building is a reusable asset with stable ID, original/source rights, metric dimensions, complete four-sided geometry and roof, materials, collision, entry anchor and LODs. Balconies, columns, canopies, rails and setbacks must create real silhouettes and parallax. A facade photograph does not count as a building. Facade textures may eventually provide surface detail, but never substitute for essential geometry.

Interiors are separate instances built from reusable room modules, with studio/1-bedroom/2-bedroom, duplex/penthouse and villa families. Reference photographs, including publicly viewable Zillow listings, may inform layout, lighting and material decisions; public visibility does not grant redistribution or texture-use rights. Keep provenance and permission for any imported asset. Original reinterpretations can be more lavish and imaginative than real property.

## Current measurable slice

GC-RES-001: original 32×24 m residence, about 29.1 m high, four complete facades, 84 projecting balconies, roof garden and three independently exported GLB LODs. Intended placement: GC-X1-Z3 at WORLD_METERS (-625, 8, -125), on a 45×40 m plot. Current `/architecture` view is a standalone local-origin construction yard; placement is registered, not yet integrated into the full terrain. Interior, district streets, transit and market UI integration are pending.

Acceptance order: one usable residence and collision → connected mixed-use block with street/metro access → river/bridge/civic corridor → multiple residential tiers → marina and hills. The final acceptance target is a playable, coherent, beautiful city, not a collection of disconnected showcase scenes.
