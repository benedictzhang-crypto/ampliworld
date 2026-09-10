# AmpliWorld CBD asset map

This is the recommended 25-model working set for replacing the initial
procedural CBD blocks. It combines 20 newly vendored GLBs with five models from
the existing City Kit (Roads) directory. All four upstream Kenney packs are
CC0 1.0 and may be used commercially without attribution.

All dimensions below are native GLB axis-aligned bounds in `X × Y × Z` units.
Treat one model unit as approximately one compact city-module unit, then tune a
single uniform scale in the scene. The suggested scales are starting points,
not baked transforms.

## Landmark mapping

| AmpliWorld destination | Primary GLB | Native bounds | Triangles | Start scale | Direction |
| --- | --- | ---: | ---: | ---: | --- |
| Stock Exchange | `city-kit-commercial/models/building-n.glb` | 2.320 × 2.480 × 1.820 | 4,350 | 1.35 | Broad financial headquarters; place the interaction collider at the side canopy. |
| Neon Atelier / fashion | `city-kit-commercial/models/building-k.glb` | 2.084 × 1.470 × 0.942 | 2,960 | 1.80 | Long yellow shopfront reads clearly as retail; recolor signage in HTML rather than altering the model texture. |
| Nova Dining / restaurant | `city-kit-commercial/models/building-h.glb` | 0.884 × 1.293 × 1.008 | 1,512 | 1.75 | Compact green-canopy storefront; pair with two or three parasols to fill its pavement terrace. |
| Skyline Realty | `city-kit-commercial/models/building-skyscraper-a.glb` | 1.360 × 2.880 × 1.360 | 1,292 | 1.30 | Glass-fronted real-estate tower; keep the entrance facing the player spawn axis. |
| Career Tower | `city-kit-commercial/models/building-skyscraper-d.glb` | 1.280 × 5.470 × 1.388 | 1,892 | 0.82 | Tallest clean silhouette in the selection; use `building-j.glb` as an optional podium or neighboring office. |

Supporting commercial pieces:

| GLB | Bounds | Triangles | Suggested use |
| --- | ---: | ---: | --- |
| `city-kit-commercial/models/building-g.glb` | 0.970 × 1.693 × 0.922 | 2,006 | Mixed-use restaurant overflow or apartment-over-retail frontage. |
| `city-kit-commercial/models/building-j.glb` | 2.084 × 1.693 × 1.340 | 5,246 | Career Tower podium, hotel, or office block. |
| `city-kit-commercial/models/building-skyscraper-c.glb` | 1.280 × 4.080 × 1.388 | 1,704 | Distant office skyline. |
| `city-kit-commercial/models/building-skyscraper-e.glb` | 1.295 × 4.080 × 1.242 | 1,156 | Green-accent finance or sustainability tower. |
| `city-kit-commercial/models/detail-awning-wide.glb` | 0.800 × 0.400 × 0.148 | 40 | Additional shop entrance marker. |
| `city-kit-commercial/models/detail-parasol-a.glb` | 0.346 × 0.450 × 0.400 | 96 | Dining terrace prop; clone or instance at scale 1.3–1.6. |

## Infrastructure and service edge

| GLB | Bounds | Triangles | Suggested use |
| --- | ---: | ---: | --- |
| `city-kit-industrial/models/building-o.glb` | 0.884 × 0.918 × 1.240 | 868 | Market-data center, utility building, or exchange infrastructure annex. |
| `city-kit-industrial/models/building-t.glb` | 1.722 × 1.015 × 1.390 | 1,586 | Grid operations or clean-energy research office. |
| `city-kit-industrial/models/solar-panel-landscape-group.glb` | 1.513 × 0.262 × 0.895 | 976 | Solar canopy beside the event lab or data center. |
| `city-kit-industrial/models/shipping-container-a.glb` | 0.373 × 0.348 × 0.823 | 402 | Back-of-house deliveries; do not place in the hero streetscape. |

## Roads and street furniture

These assets already live in the City Kit (Roads) directory. The shared
`models/Textures/colormap.png` file is required by the GLBs and is included.

| GLB | Bounds | Triangles | Suggested use |
| --- | ---: | ---: | --- |
| `city-kit-roads/models/road-straight.glb` | 1.000 × 0.020 × 1.000 | 44 | Repeat with `InstancedMesh`; rotate in 90-degree increments. |
| `city-kit-roads/models/road-crossroad-line.glb` | 1.000 × 0.020 × 1.000 | 108 | Main CBD junction. |
| `city-kit-roads/models/light-square.glb` | 0.050 × 0.600 × 0.238 | 60 | Primary pedestrian lighting. |
| `city-kit-roads/models/light-curved.glb` | 0.050 × 0.675 × 0.225 | 92 | Alternate road-edge silhouette. |
| `city-kit-roads/models/traffic-light.glb` | 0.118 × 0.515 × 0.090 | 212 | Junction prop; use simple code-authored collider only if interactive. |

## Vehicle population

| GLB | Bounds | Triangles | Suggested use |
| --- | ---: | ---: | --- |
| `car-kit/models/sedan.glb` | 1.500 × 1.300 × 2.550 | 2,032 | Common private car. |
| `car-kit/models/taxi.glb` | 1.500 × 1.500 × 2.750 | 2,072 | CBD traffic and arrival animation. |
| `car-kit/models/delivery.glb` | 1.500 × 1.650 × 3.250 | 2,476 | Restaurant and retail logistics. |
| `car-kit/models/suv-luxury.glb` | 1.500 × 1.300 × 2.850 | 2,086 | Millionaire Ridge and premium-property traffic. |
| `car-kit/models/race-future.glb` | 1.200 × 0.833 × 2.660 | 2,068 | Rare aspirational vehicle; keep spawn frequency low. |

The vehicles are authored with their longer axis on Z. In the current world,
rotate them around Y to align with road direction. Their native dimensions are
already close to human-scale vehicle proportions; start around `0.85–0.95`
against the current player avatars. With the road surface at roughly `Y=0.04`,
place the vehicle root near `Y=0.045` so the wheels sit on the surface.

## Loading paths and performance

The browser URLs begin at `/assets/3d/vendor/kenney/`. For example:

```ts
const STOCK_EXCHANGE_URL =
  '/assets/3d/vendor/kenney/city-kit-commercial/models/building-n.glb';
```

- Load landmark models through `useGLTF`, and use `Clone` for repeated static
  storefronts.
- Use instances for repeated road tiles, lamps, parasols, and traffic.
- Keep mesh collision out of these assets; code-authored box/capsule colliders
  are cheaper and more predictable.
- Cast shadows only for the five landmarks, the player, and nearby vehicles.
- On mobile, reduce cars and lamps by distance rather than switching to a
  separate asset set.
- Do not preload the entire Road pack. Preload only the five paths listed here.

## Validation and provenance

- Newly vendored selection: 20 GLBs, 2.99 MiB total GLB payload.
- Structural validation: 20/20 containers have valid `glTF` magic, version 2,
  matching declared byte length, valid JSON chunks, and glTF asset version 2.0.
- Resource validation: 20/20 selected GLBs resolve their referenced
  `Textures/colormap.png` locally.
- The five selected Road GLBs were also checked and resolve the retained Road
  texture.
- Per-file hashes are in each pack's `SHA256SUMS.txt`; archive hashes, download
  URLs, versions, retrieval date, and license details are in each `SOURCE.md`.
- The original Kenney `LICENSE.txt` is retained unmodified inside every pack.

Official pack pages:

- https://kenney.nl/assets/city-kit-commercial
- https://kenney.nl/assets/city-kit-industrial
- https://kenney.nl/assets/city-kit-roads
- https://kenney.nl/assets/car-kit
