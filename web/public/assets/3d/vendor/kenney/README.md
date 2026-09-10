# Kenney CC0 3D assets

These browser-ready GLB assets were downloaded from Kenney's official website on
2026-09-10. The original archives include FBX, OBJ, preview images, and other
formats; this repository vendors the GLB files required by the web client,
their required shared textures, and each archive's original license text.

## Included packs

| Pack | Version | GLB files | GLB size | License | Official page |
| --- | ---: | ---: | ---: | --- | --- |
| City Kit (Suburban) | 2.0 | 40 | 2.49 MiB | CC0 1.0 | https://kenney.nl/assets/city-kit-suburban |
| City Kit (Roads) | 2.1 | 95 | 1.50 MiB | CC0 1.0 | https://kenney.nl/assets/city-kit-roads |
| Nature Kit | 1.0 | 329 | 2.89 MiB | CC0 1.0 | https://kenney.nl/assets/nature-kit |

All 464 GLBs in the three packs listed here are glTF 2.0 binary containers and
passed a structural and dependency-resolution check:
their headers, declared lengths, and JSON chunks are valid. City Kit files use
`KHR_texture_transform`; Nature Kit uses `KHR_materials_unlit`. Both extensions
are supported by Three.js `GLTFLoader`. Every Suburban and Roads GLB refers to
the shared relative URI `Textures/colormap.png`; that file is present beside
the models at the exact required path. Nature Kit GLBs have no external image
or buffer dependencies.

## Recommended AmpliWorld selection

### Millionaire Ridge homes

- `city-kit-suburban/models/building-type-b.glb`: wide detached home with a
  garage wing; recommended for Parkside Villa.
- `city-kit-suburban/models/building-type-p.glb` and
  `building-type-q.glb`: flat-roof modern homes; recommended for the Glass
  Courtyard district.
- `city-kit-suburban/models/building-type-d.glb`: substantial two-storey home;
  recommended for Helix Estate.
- `city-kit-suburban/models/building-type-t.glb`: the most detailed house in
  this pack (2,062 triangles, 164 KiB); recommended for Founders' Sky Estate.
- `driveway-long.glb`, `fence-low.glb`, `planter.glb`, `tree-large.glb`, and
  `tree-small.glb`: matching lot dressing.

The house geometry is deliberately stylized and efficient. An estate can feel
substantially more premium by combining one house GLB with a larger landscaped
lot, procedural pool/water shader, driveway, fencing, warm emissive window
overlays, and sparse night lighting rather than scaling the house alone.

### Roads and entrances

- `city-kit-roads/models/road-straight.glb`
- `city-kit-roads/models/road-bend.glb`
- `city-kit-roads/models/road-intersection.glb`
- `city-kit-roads/models/road-roundabout.glb`
- `city-kit-roads/models/road-driveway-single.glb`
- `city-kit-roads/models/light-square.glb`
- `city-kit-roads/models/road-sign-object-stop.glb`
- `city-kit-roads/models/traffic-light.glb`

Most road tiles use a normalized two-unit footprint. The roundabout uses a
three-unit footprint. Build roads on a fixed tile grid and rotate instances in
90-degree increments.

### Landscaping

For the villa district, start with these Nature Kit variants:

- `nature-kit/models/tree_oak.glb`
- `nature-kit/models/tree_detailed.glb`
- `nature-kit/models/tree_tall.glb`
- `nature-kit/models/tree_palmDetailedTall.glb`
- `nature-kit/models/plant_bushDetailed.glb`
- `nature-kit/models/plant_bushLarge.glb`
- `nature-kit/models/grass_leafsLarge.glb`
- `nature-kit/models/rock_largeA.glb`
- `nature-kit/models/flower_purpleA.glb`

Use `InstancedMesh` or merged static geometry for repeated trees, bushes, and
road tiles. Keep the hero estate as a normal scene graph so its lighting and
interaction states can change independently.

## React Three Fiber loading

```tsx
import { Clone, useGLTF } from '@react-three/drei';

const HOUSE_URL =
  '/assets/3d/vendor/kenney/city-kit-suburban/models/building-type-t.glb';

export function FounderEstate(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(HOUSE_URL);
  return (
    <group {...props}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

useGLTF.preload(HOUSE_URL);
```

Recommended integration rules:

1. Load only models used in the current district. Do not preload all 464 GLBs.
2. Wrap the district in `Suspense` and use a lightweight loading marker.
3. Reuse parsed scenes through `useGLTF`; use `Clone` when placing the same GLB
   more than once.
4. Preserve the City Kit `models/Textures/colormap.png` relative path when
   moving or copying assets; otherwise `GLTFLoader` will emit a texture-load
   error.
5. Use simple box/capsule colliders authored in code instead of mesh colliders.
6. Enable shadows only for nearby hero assets. Disable shadow casting for
   distant vegetation and most road tiles.
7. Use distance-based population and vegetation density on mobile.

## Attribution

Attribution is not required by CC0. Keeping a small credit such as “3D assets
by Kenney” in project credits is appreciated by the creator and preserves clear
asset provenance.
