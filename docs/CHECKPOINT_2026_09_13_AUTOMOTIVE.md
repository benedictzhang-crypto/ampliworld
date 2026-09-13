# Automotive campus / physical interiors checkpoint

## Scope

- New original GC-AUTO-001 automotive campus at (-565, 655), approximately 1,015 m straight-line from the mall centre (0, -188). Road travel is longer; this is not a teleport destination.
- Campus reservation 190 × 240 m, clear of the named stadium, existing buildings and west sports boulevard. Entrance connects at (-440, 745), between existing trees and lamps.
- Concrete-grey cladding, steel framing, glass and angular cantilever language. Architectural reference: [HOK, Porsche Cars North America Experience Center](https://www.hok.com/projects/view/porsche-cars-north-america-experience-center-and-headquarters/). No Porsche branding, reproduced building mesh or scraped facade imagery.
- Skyline bridge detailing replaces rounded tubes with faceted shells, narrow structural edges, diagonal bracing, bearings and lighting. Existing upper collision envelopes remain conservative; bridges are not yet publicly traversable interiors.
- Sushi shop stays a direct 1:1 walk-in interior. Doorway, front glass, stools and counter have regression checks; roof-clearance bounds now include projecting eaves.

## Validation recorded

`check-civic-assets.mjs` passed: continuous road-to-showroom route, floor height, non-entry glass collision, sushi counter/stool/window collision and existing road seams. `check-cbd-assets.mjs` and `check-city2030.mjs` passed. Headless Chrome completed the stadium, restaurant and automotive views, returned to the unchanged avatar position, and reported no runtime exceptions. This is sampled regression coverage, not an exhaustive collision audit of the whole city.

## Remaining scope

The automotive centre is an architectural/gameplay prototype, not a completed car purchase, tuning or workshop simulation. Showcase vehicles are displays. Existing street-car driving remains separate. Large-building interior streaming, working lifts, complete upper floors and expanded dealership interactions remain future work.

The city uses real metre coordinates and a single connected exterior. See INTERIOR_SCALE_CONTRACT.md: small rooms use continuous entry; larger interiors may be streamed later without changing visible physical scale.
