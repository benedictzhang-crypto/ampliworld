# Skyline redesign and playable driving

Ten-minute implementation block; publishing/backup follows the block.

## Completed

- Replaced all three skyline assets: unequal leaning blades/high cantilever and open void; asymmetric bridged twins with fork crowns; broad curved tower and tilted oval crown. Heights500/350/420m. 100,408 total triangles, down from391,356; no copied meshes or facade images. Structural references: [OMA CCTV](https://www.oma.com/projects/cctv-headquarters), [Pelli Clarke Petronas](https://pcparch.com/work/petronas-towers), used for architectural principles, not reproduced shapes.
- Centres: (−310,−490), (310,−490), (0,−900)m. Existing mall and four residences preserved. Road loop X±440m; cross streets Z−650/−1030m; widened ground envelope1,200×2,200m, mostly undeveloped.
- Three64×64m sunken plazas, floor−4.2m, actual ramps, cut terrain, retaining walls and guards, planters and benches. Twelve-metre underground links connect all three gardens to the mall B1 entrance. Mall-side opening remains3m wide. Full underground shopping interiors are not implemented.
- Walker now resolves stacked ground by current foot elevation. Vehicle disembarkation relocates existing Walker state once, without remount/return to spawn.
- CC0 Kenney sedan, metre-normalized4.6m length; nearby E/button enter, WASD accelerate/reverse/steer, Space brake, E/button exit. World and obstacle checks substep movement; safe left/right exit sampling. Separate drive mode, not overview manipulation.

## Verified

- TypeScript and deployment build.
- `check-cbd-assets.mjs`: heights, spaced parcels, no facade images, supported podiums, ring roads, unobstructed below-ground route sampling across all gardens and mall portal.
- `check-mall-campus.mjs`: existing galleries, ramp, parking and open B1 door.
- Native-GPU headless browser: enter car, throttle advances vehicle, exit beside current car rather than original spawn; skyline screenshot reviewed. No Safari opening.

## Remaining / honest limits

- No full underground shopping mall, office interiors, lifts or escalator simulation.
- Vehicle is an existing licensed low-poly prototype, not a finished luxury model. No animated door sequence, tyre suspension, wheelspin, traffic AI or multiplayer driving yet.
- Conservative collision bounds rather than a rigid-body physics engine. Interior tunnel traversal has geometric route tests, not a complete end-to-end manual walk of every path.
- Long ground envelope contains blank development parcels. Further greenery, architectural detail and street furniture remain staged work.
