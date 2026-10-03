# CBD interior quality gate

The mall's five brand-specific boutiques (six room interiors) are a quality sample,
not a photorealism claim or a finished CBD. Original geometry remains editable
in Blender; the web client displays exported GLB assets at metre scale.

## Spatial consistency

- Keep the 3.4 m shop entrance and a continuous route around display islands clear.
- Ceilings, wall linings, display furniture and circulation must share the
  same world coordinates. A thickened decorative wall needs a matching
  collision volume, including for the follow camera.
- Preserve all elevator wells, landings and escalator openings.
- Smaller merchandise may use the supporting cabinet's collision volume;
  furniture and room boundaries cannot be purely visual.

## Material and lighting

- Stone, timber and fabric need embedded base-color and normal maps that
  survive export, with metre-scaled UVs. Blender-only procedural nodes are
  not accepted as evidence of a working web material.
- Use low-contrast mineral variation and legible slab joints; reject obvious
  wavy repetition, giant wood grain, emissive white floors and glossy fabric.
- Model visible reveals, cabinet depth, thresholds, bevels and ceiling coves.
  These are geometry, not photos of a facade placed on a single plane.
- Real-time fill is limited to two unshadowed lights at the nearest boutique,
  reused as one fixture-anchored light in the L2 gallery, plus one nearby
  512px shadow-casting spotlight. Glass uses a cloned,
  low-iron physical material with environment reflections, not transmission.
  This is not path tracing or physically validated interior illumination.

## Product identity

The rooms use Tiffany, Gucci, Cartier, Moncler and Chloé concept themes.
Their ceiling, finishes, displays and consultation areas should differ while
sharing one architectural language. Brand names in the older mall shell are
illustrative; no affiliation, tenancy or merchandise licensing is implied.

## Acceptance and unfinished work

Run `node --import tsx scripts/check-exploration-fitout.mjs` for exported map
presence, entrance and aisle clearance, camera-lining contact and speed safety.
Check the actual browser at the gallery, inside the shop, and when turning
near a wall; a Blender render alone is not sufficient.

Keep the six-room fit-out under 26 material batches and 650,000 triangles.
These content budgets do not guarantee acceptable whole-city frame rates.
L1 lounge pots now contain curved three-dimensional leaves; L2 has three west
gallery seating pockets, six planted pots and ten pendant fixtures. The L2
through-route and shop doors have explicit clearance tests.
Except for Gucci's duplex, L2 shop interiors and L3-L6 fit-outs, store interactions, staff placement,
realistic mannequins and tuned day/night interior lighting remain unfinished.
The old structural-shell atrium tree crowns still need a separate replacement.
