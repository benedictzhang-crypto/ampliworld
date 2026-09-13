# Two metric residential communities

## Implemented

- Qingting Garden / 青庭花园: 15 separately registered mid-market homes at X −950/−850/−750 m, Z 570/650/730/810/890 m. Three original six/eight/ten-storey prototypes (20/26/32 m) provide true projecting balconies and hollow ground-floor lobbies. Upper apartments remain sealed.
- Lan'an River Estates / 澜岸御邸: 60 individually numbered detached homes, four original designs in three curved rows on the urban river's west bank, Z 660–1344 m. Street approaches face west; terraces face the river. Each prototype has dimensional balconies, roof pergolas, a closed garage, raised plunge pool and dry terrace.
- Plot registry retains metres, coordinates, prototype identity, rotated bounds, collision and floor surfaces. Reused GLB meshes are GPU-instanced; seven prototype assets total 2,055,700 bytes. No facade images or external art were added.
- Middle-community perimeter, open gate, internal loop and pedestrian approaches connect to the west sports boulevard and global road. River lanes join the existing X=1500 m road via Z=1000 m, avoiding elevated bridge ramps. Existing roads, dealerships, named sites and all generated compounds are preserved.
- City plan includes the two communities, individually selectable building identifiers, streets and dedicated map zoom buttons. Two overview buttons change only the camera, never player coordinates.
- CBD/mall remains the highest-value city core in the planning description. These are district categories, not implemented purchase prices or an asset-pricing model.

## Validation

`check-communities.mjs` checks exactly 15/60 instances, unique identifiers, rotated-footprint separation, existing compound/civic/road exclusion, river retreat, zero image facades, prototype size, all 15 lobby entry paths and rear-wall blocking, three ground-level ingress routes. Existing garage and civic-route regressions passed. Build passed.

Background Chromium landmark checks passed, including both community views and return to the unchanged player position; screenshots were visually inspected. Targeted lint of the new community modules passed. The broader pre-existing view/map lint still reports React Compiler ref/effect/camera-mutation and SVG/link/import findings; this checkpoint does not claim a clean repository-wide lint result.

## Remaining

Private villa interiors, upper apartment interiors, lifts, property transactions, residents and swimming are not implemented. River terraces/pools are external geometry, not an assertion of complete playable homes. Ground trees are reusable original volume models; detailed landscape furniture, parking allocation, collision broadphase optimization and asset-level LOD need another bounded pass. No Safari foreground operation was used.
