# Aurea luxury gallery — concept interiors

Latest expansion: see [Mall expansion layout](MALL_EXPANSION_LAYOUT.md) for the
380 × 170 m enclosure, full B1, five cinemas, arcade and rear freight route.
There are now twenty detailed interiors across nineteen businesses; the
retail budget is 26 material batches / 1.6 million triangles. L6 structural
clearance is now 16 m and roof elevation 52.37 m, superseding the earlier
6.5 m / 42.77 m measurements below. New gold stores are Lukfook and Chow Tai
Fook concepts; new dining includes steak, Cantonese and seafood.

These are original game-world interpretations using illustrative brand names,
not official stores, licensed products, tenancy confirmations or exact replicas.

| Store | Architectural and merchandise language | Floors |
|---|---|---|
| Tiffany & Co. | Blue-green piers, pale stone, chrome, necklace trays and crystal cases | L1 |
| Gucci | Walnut, brown woven pattern, bronze, leather goods, upper salon | L1 + L2 |
| Cartier | Burgundy lacquer, gold-toned frames, jewelry consultation seating | L1 |
| Moncler | Black veined stone, white light, hanging quilted jackets in five colors | L1 |
| Chloé | Warm plaster, light stone, brass arch, leather goods and soft seating | L1 |
| Van Cleef & Arpels | Green salon, pearl-toned clover pendants, consultation tables | L1 |
| Givenchy | Black/white stone, tailored coats, bags, open rails and mirrors | L1 |
| lululemon | Warm timber, activewear, leggings, rolled yoga mats | L3 |
| LEGO | Yellow/blue fixtures, studded brick skyline, sets and build tables | L3 |
| Aurea Fitness | Treadmills, barbell racks, benches, stretch mats | L4 |
| Jade Pot | Divided hot pots, induction hobs, dining tables and kitchen | L5 |
| Ember Table | Table grills, extraction ducts, dining tables and kitchen | L5 |
| Koma Sushi | Sushi counter, glass case, paper lanterns and kitchen | L5 |
| Daily Noodle | Noodle bowls, inexpensive illustrative menu, tables and kitchen | L5 |

Tiffany displays now contain smile-arc necklaces with fine chains, solitaire
rings with faceted stones and paired diamond studs. These are original stylized
geometry, not exact catalog reproductions or purchasable merchandise.

The interpretation follows the user's requested palette, not a claim that every
real store uses the same finishes. Public primary references:

- [Tiffany Ginza architecture](https://www.tiffany.com/world-of-tiffany/events/tiffany-ginza/architecture-art-design.html)
- [Gucci Dubai: marble, brushed steel and contemporary art](https://www.gucci.com/gr/en_gb/st/stories/inspirations-and-codes/article/a-new-chapter-in-dubai)
- [Moncler Fifth Avenue: two levels, stone and illuminated facade](https://www.moncler.com/en-us/new-york-5th-avenue)
- [Cartier Vancouver: signature red and private salons](https://stores.cartier.com/en_hk/canada/bc/vancouver/751-burrard-street)

## One spatial contract

`mall-luxury-plan.json` drives shell removal, store addresses, L2 holes and
Gucci's 40-riser staircase and two-stop private lift. The original fifteen generic
rooms are removed from the shell before exporting the replacement Blender
interiors; old displays, signs and invisible colliders do not remain inside.
L2 can be reached from the public mall lifts/gallery or through the store.

Geometry, glass cases, cabinets and walls are exported in metre scale. Garments
include curved quilted baffles, sleeves, cuffs, collars, hoods and zippers.
Brown fabric uses an original woven-loop texture, not downloaded product art.
Textured stone and fabric are packed into GLB. No storefront photograph is
used as a wall. Fixtures share materials to avoid one draw call per garment.

## Validation and remaining work

Run `check-luxury-boutiques.mjs`, `check-exploration-fitout.mjs` and
`check-mall-circulation.mjs` with `node --import tsx`.
Validate room entrances, private lift landing doors, stair ascent/descent and
L2 slab openings and floor-aware map arrivals. The fifteen-room fit-out budget
plus six washroom suites is 26 materials / 1.2 million triangles;
this is a content budget, not a whole-city frame-rate guarantee.

Real-time lighting remains approximate (environment map, two local fills and
one nearby 512px shadow spotlight),
not path-traced retail lighting. There is no product purchasing, fitting-room
interaction or shop-staff behavior yet. Restaurant meals, construction tables
and exercise equipment are static display geometry, not playable activities.
The new shop names are not yet mapped to separate economic simulation firms.
Other upper-floor stores remain generic. Front-door routes remain clear;
map destinations carry floor elevations, so L3/L4/L5 entries do not land on L1.
Future work includes distinct ceiling/luminaire design per store, product-scale
texture refinement, proper mannequins and a broader lighting/performance pass.

## Taller floors and restrooms on every retail level

`mall-spatial-plan.json` is the single floor-elevation contract used by the
shell, fit-out, escalators, lift shafts, lights and map arrivals. L1 clear height
is 7.1 m; L2–L5 are 6 m; L6 is 6.5 m. Floor elevations are 0.17, 8.17,
14.97, 21.77, 28.57 and 35.37 m, with the roof at 42.77 m.
Escalators use an 18 m run for the increased rise. Stock and people remain
human-scale; they are not stretched along with the architecture.

Each of L1–L6 has a north-gallery restroom suite at local X=88, Z=-51.
The suites replace six generic rooms and have six modeled washbasins, four
private cubicles (one larger), mirrors, soap, bins and a baby-changing counter.
Service ceilings remain 3.65 m high. Walls, counters and partitions have
collision volumes; each floor has its own map arrival and location label.
This is a modeled layout, not accessibility-code certification, working
plumbing or a simulated sanitation service. Entry and central aisle clearances
are regression tested.
