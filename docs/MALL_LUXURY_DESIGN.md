# Aurea luxury gallery — concept interiors

These are original game-world interpretations using illustrative brand names,
not official stores, licensed products, tenancy confirmations or exact replicas.

| Store | Architectural and merchandise language | Floors |
|---|---|---|
| Tiffany & Co. | Blue-green piers, pale stone, chrome, necklace trays and crystal cases | L1 |
| Gucci | Walnut, brown woven pattern, bronze, leather goods, upper salon | L1 + L2 |
| Cartier | Burgundy lacquer, gold-toned frames, jewelry consultation seating | L1 |
| Moncler | Black veined stone, white light, hanging quilted jackets in five colors | L1 |
| Chloé | Warm plaster, light stone, brass arch, leather goods and soft seating | L1 |

The interpretation follows the user's requested palette, not a claim that every
real store uses the same finishes. Public primary references:

- [Tiffany Ginza architecture](https://www.tiffany.com/world-of-tiffany/events/tiffany-ginza/architecture-art-design.html)
- [Gucci Dubai: marble, brushed steel and contemporary art](https://www.gucci.com/gr/en_gb/st/stories/inspirations-and-codes/article/a-new-chapter-in-dubai)
- [Moncler Fifth Avenue: two levels, stone and illuminated facade](https://www.moncler.com/en-us/new-york-5th-avenue)
- [Cartier Vancouver: signature red and private salons](https://stores.cartier.com/en_hk/canada/bc/vancouver/751-burrard-street)

## One spatial contract

`mall-luxury-plan.json` drives shell removal, store addresses, L2 holes and
Gucci's 36-riser staircase and two-stop private lift. The original six generic
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
L2 slab openings. The six-room fit-out budget is 26 materials / 650k triangles;
this is a content budget, not a whole-city frame-rate guarantee.

Real-time lighting remains approximate (environment map, two local fills and
one nearby 512px shadow spotlight),
not path-traced retail lighting. There is no product purchasing, fitting-room
interaction or shop-staff behavior yet. Other upper-floor stores remain generic.
Future work includes distinct ceiling/luminaire design per store, product-scale
texture refinement, proper mannequins and a broader lighting/performance pass.
