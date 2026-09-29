# CBD interior quality gate

The mall's first four boutique fit-outs are an in-progress quality sample,
not a photorealism claim or a finished CBD. Original geometry remains editable
in Blender; the web client displays exported GLB assets at metre scale.

## Spatial consistency

- Keep the existing 3.4 m shop entrance and a continuous central aisle clear.
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
- Real-time fill is limited to two unshadowed lights at the nearest boutique.
  This is not path tracing or physically validated interior illumination.

## Product identity

The initial rooms use leather goods, watches, jewelry and footwear themes.
Their ceiling, finishes, displays and consultation areas should differ while
sharing one architectural language. Brand names in the older mall shell are
illustrative; no affiliation, tenancy or merchandise licensing is implied.

## Acceptance and unfinished work

Run `node --import tsx scripts/check-exploration-fitout.mjs` for exported map
presence, entrance and aisle clearance, camera-lining contact and speed safety.
Check the actual browser at the gallery, inside the shop, and when turning
near a wall; a Blender render alone is not sufficient.

Keep the fit-out under 12 material batches and 120,000 triangles for this
sample. These budgets do not guarantee acceptable whole-city frame rates.
Upper-floor fit-outs, store-specific interactions, staff placement, realistic
mannequins, convincing indoor plants, reflective glazing and tuned day/night
interior lighting remain separate unfinished work.
