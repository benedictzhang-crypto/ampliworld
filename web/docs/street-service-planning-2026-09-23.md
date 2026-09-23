# Street-service parcel and Blender pass

The 409 street-service sites previously used a centre-only 38 m spacing rule.
That rule did not reserve the actual building/forecourt envelope or exclude
residential compounds and authored landmarks. An audit of the previous seed
found 14 housing-parcel contacts, 39 contacts with authored civic-asset bounds,
and 14 with metropolitan-centre bounds (the sets may overlap). The shared
`SERVICE_SITES` registry now searches for a collision-free parcel against those
envelopes, named solids, neighbouring shops and the river. If it cannot find a
site, initialization throws instead of silently placing a shop at the origin.

293 small shops now use an original Blender-authored, instanced volumetric
storefront instead of the old body/glass/roof box stack. The source `.blend`,
GLB, manifest and inspection render are in `asset-library/blender/services`
and `public/assets/3d/ampliworld/GC-STREET-SERVICE-KIT-001`. The storefront
contains structural walls, an open entrance, glazing, a rounded canopy,
interior counters, display shelves and roof planting. Collision follows the
walls and front glazing while leaving the doorway open. Other large service
types retain their existing models and need separate architectural passes.

`npm run check:service-placements` verifies pairwise site clearances, housing
and landmark envelopes, river clearance, modeled-door collision topology,
asset bytes and a saved-world migration that changes workplace coordinates
without changing wages, jobs or money. `npm run check:world-plan` covers the
older named architecture and continuous-world invariants. These are geometric
planning checks, not a visual claim that all 20 × 30 km of the city has been
hand-finished. The new kit is a reusable first variant; future passes need
more distinct shop typologies, district-level streaming/LOD, street signs,
sidewalk/roadway checks and in-browser walkthrough QA.
