# Kenney Mini Characters

## Source and license

- Creator: Kenney
- Official asset page: https://kenney.nl/assets/mini-characters
- Official archive used: https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip
- Retrieved: 2026-09-10
- Archive SHA-256: `9e1d48e6d7b8479ebbe84df71eb5bd8e1b3f0da546dea641890dccc8a02d0999`
- Pack version: 1.0
- License: Creative Commons Zero v1.0 Universal (CC0-1.0)
- License text: `LICENSE.txt`

The official page and the supplied license both permit personal, educational, and commercial use. Attribution is not required, although Kenney asks users to consider crediting `Kenney` or `www.kenney.nl`.

## Files retained for AmpliWorld

The repository keeps the twelve rigged human variants from the pack:

- `models/character-female-a.glb` through `models/character-female-f.glb`
- `models/character-male-a.glb` through `models/character-male-f.glb`

It also keeps the four wheelchair models for future inclusive NPC variants:

- `models/wheelchair.glb`
- `models/wheelchair-deluxe.glb`
- `models/wheelchair-power.glb`
- `models/wheelchair-power-deluxe.glb`

In Kenney's original archive, every retained GLB references the shared external texture `models/Textures/colormap.png`. For AmpliWorld, that exact PNG has been embedded into the binary buffer of all twelve character GLBs and all four wheelchair GLBs. Each runtime GLB now uses an internal image `bufferView` with MIME type `image/png` and no longer depends on an external texture request. The original shared PNG is retained at its source-relative path for provenance and inspection; its SHA-256 is `0d4947d34ff32acf4a359c7f22ca784e057e7e72f622170a9a77b6fc88fdb70e`.

The embedding is a packaging-only change. Geometry, materials, skinning, and animation data were not altered. The resulting GLBs were loaded with Three.js `GLTFLoader` under a validation rule that rejects every non-`blob:` resource request: all twelve characters loaded successfully, each retained all 32 animations, and zero external fetches occurred.

## Character animation clips

Every retained character variant was checked and contains the same 32 named clips:

`static`, `idle`, `walk`, `sprint`, `jump`, `fall`, `crouch`, `sit`, `drive`, `die`, `pick-up`, `emote-yes`, `emote-no`, `holding-right`, `holding-left`, `holding-both`, `holding-right-shoot`, `holding-left-shoot`, `holding-both-shoot`, `attack-melee-right`, `attack-melee-left`, `attack-kick-right`, `attack-kick-left`, `interact-right`, `interact-left`, `wheelchair-sit`, `wheelchair-look-left`, `wheelchair-look-right`, `wheelchair-move-forward`, `wheelchair-move-back`, `wheelchair-move-left`, and `wheelchair-move-right`.

For AmpliWorld's first pass, use `character-male-a.glb` for the player, cycle the other eleven character files across representative NPCs, and limit active clips to `idle`, `walk`, `sprint`, `sit`, `interact-right`, `emote-yes`, and `emote-no`.

## Size and runtime notes

- Individual character GLBs are 249,188–279,936 bytes after embedding the texture.
- The twelve character GLBs, four wheelchair models, shared texture, license, and source record total about 3.2 MB on disk.
- `useGLTF` caches requests by URL, but every animated clone still requires its own skeleton. Reuse a small number of source URLs, clone skinned scenes with `SkeletonUtils.clone`, and share geometry and materials where practical.
- For a 32-person visible crowd, animate only the nearest 8–12 skinned characters. Render distant citizens as static clones, instanced simplified meshes, or sprites.
- Avoid 32 independent React state updates per frame. Advance crowd movement and animation mixers in one `useFrame` loop or a small manager component.
- Use `useGLTF.preload` for the player and the few NPC variants near spawn; lazy-load the rest by district.
