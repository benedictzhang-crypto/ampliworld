# East-wing sports anchors

The L1 east wing now contains three physical concept stores, with local metre coordinates owned by `mall-sports-plan.json`. The public gallery at X 114–125 remains continuous. Higher-floor and B1 reservations are unchanged.

| Store | Gross rectangle | Use |
|---|---|---|
| NIKE · Court Concept | 60 × 52 m | Trainers, apparel, try-on benches, a 15 × 14 m half court inside a 22 × 22 m glass enclosure |
| Aurea Sports Hall | 60 × 42 m | Sportswear, footwear, balls, rackets, cycles, swim goggles and outdoor equipment |
| Contour Golf Garden | 60 × 46 m | Club and clothing displays plus a 37 × 27 m contoured indoor putting green |

The half court has painted lines, a raised hoop/net/backboard, a three-metre opening in collision-bearing glass and 6.6 m reserved overhead clearance. This is a retail demonstration court, not a certified competition facility. NIKE is an illustrative concept label, not an official partnership.

The golf green is a triangulated 0.5 m grid with rolling elevation up to 0.65 m, not a flat green decal. Runtime foot support follows the same triangles; cup targets and flags are currently modeled markers. Putting, ball-flight, basketball scoring, purchases and staff operations are not yet implemented.

Geometry is authored in Blender, batched by material and exported separately as `GC-MALL-SPORTS-001`. Existing L1 east-wing reservation planters are removed from these leased footprints; other floors retain them. Asset and route checks: `node --import tsx scripts/check-mall-sports.mjs`.
