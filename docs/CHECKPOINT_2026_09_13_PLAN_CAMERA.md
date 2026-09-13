# City plan, upward gaze and detailed street assets

Ten-minute implementation block on 13 September 2026; checks, publishing and backup follow separately.

## Completed

- Detached final gaze pitch from the collision-safe camera boom. Vertical pointer drag / two-finger scroll and R/F / visible look buttons adjust gaze; horizontal input rotates around the character. Walking direction stays horizontal and independent of upward gaze. Normal OrbitControls rotation/zoom is disabled in street-control mode to prevent conflicting input. Architecture asset preview retains its own controls. Pitch reset is visible. At steep upward angles the full avatar naturally leaves the field of view.
- Zoomable/pannable city plan with north arrow, user position, whole-city/core/user-centred views, road/compound layer switches and parcel selection. Roads, water, bridges and compounds use current scene registries. Gates and unfinished garage state are shown; map inspection does not teleport the avatar. This exposes the actual generated layout rather than representing the current grid as a completed urban design.
- Original GC-CAR-001 Aureline: 5 × 2.138 × 1.5 m, 36,498 triangles, capped sculpted body, real wheel-arch openings, independent wheels, rim/disc/tread geometry, glazing and simple seats, mirrors, vents and light strips. Forward −Z. Wheel rotation and front steering are linked to vehicle movement. Existing conservative driving collision remains, not a suspension simulation. Doors/cabin are not interactive.
- Original GC-TREE-001: 8 m authored tree, 6,842 triangles, closed bent/tapered branches, bark ridges and irregular solid leaf volumes; no alpha cards or billboards. Five material batches instance 184 trees (24 original core street planters and 160 south street/park placements). Old render-only tree meshes are hidden in those two kits while collision, planters, lamps and soil are preserved. Outer-city generated vegetation is unchanged.
- District-only environment intensity reduced to 0.3; standalone architecture preview remains at its existing intensity. This reduces flat over-lighting without replacing the weather system.
- Added an explicit initial asset-loading cover so partially loaded, unlit silhouettes are not presented as the playable city.

## Verified

- TypeScript and production build.
- Headless browser: six upward-look increments result in view-direction Y greater than 0.65 while camera remains above ground and avatar coordinates stay unchanged. Gaze reset works. City plan opens, switches to core view, closes with Escape and preserves player position.
- Headless enter/drive/exit regression passed with the new car. Screenshots reviewed in background; Safari was not opened.
- Asset generation enforces dimensional and triangle limits. Tree geometry and placements are preserved in its manifest; car registry records named wheel groups and dimensional bounds.

## Still unfinished

- Distinct hand-designed neighborhood composition, meaningful block-level roads everywhere, further bridge/river landscape polish and individual building variety remain required beyond this map overlay.
- Outer city trees remain the older coarse geometry. New core trees currently share one detailed asset with rotation/scale variation; more species and distance budgets remain needed.
- Steep upward gaze is a third-person look feature, not a full first-person head rig. Exhaustive camera checks across every building/underground junction remain outstanding.
- Car model needs further art direction, interactive doors, suspension and richer cabin details. It is a refined prototype, not a production automotive model.
