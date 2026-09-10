# Quaternius Ultimate Modular Citizens

## Source and license

These four files are a small, web-focused selection from two Quaternius packs:

- Ultimate Modular Men Pack: https://quaternius.com/packs/ultimatemodularcharacters.html
- Official source folder: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX
- Ultimate Modular Women Pack: https://quaternius.com/packs/ultimatemodularwomen.html
- Official source folder: https://drive.google.com/drive/folders/1720N9IGyQHXYvtvZJzazhxtTTlz-y2Vf
- Retrieved: 2026-09-10
- License: Creative Commons Zero v1.0 Universal (CC0-1.0), including commercial use

The exact license files distributed in the two official source folders are retained as `LICENSE-men.txt` and `LICENSE-women.txt`. The upstream license file in the women pack also says “Ultimate Modular Males”; this appears to be an upstream copy error. The official Ultimate Modular Women page separately and explicitly marks that pack CC0 and free for personal and commercial projects.

## Selected source files

| Repository file | Original pack | Original file | Google Drive file ID |
| --- | --- | --- | --- |
| `models/male-casual-hoodie.glb` | Ultimate Modular Men | `Casual_Hoodie.gltf` | `1em1So1xwwQNfHJYMvzKcXkZllvtxpKP5` |
| `models/male-suit.glb` | Ultimate Modular Men | `Suit.gltf` | `1NhXHnGU0zK9hBrT5FoZp8nTz_EmvTPg5` |
| `models/female-casual.glb` | Ultimate Modular Women | `Casual.gltf` | `18b3WwlrwrFYWAM7BcnjWeIxKJyxAQiGh` |
| `models/female-suit.glb` | Ultimate Modular Women | `Suit.gltf` | `1GjWtofxjmPku25cXJxHrzLLeUbXw7A_s` |

The official single-file glTF 2.0 downloads embed their binary mesh and animation data as data URIs and contain no external images. They were losslessly repacked into binary GLB containers for AmpliWorld, reducing the four public runtime assets from about 12.1 MB to about 6.5 MB without changing geometry, skinning, materials, or animation clips. Each repository file can be loaded directly by `useGLTF` without companion files.

SHA-256 checksums:

- `female-casual.glb`: `bc2d84fba249ebaa0629cb9d133ad37234196e4b8004aa205a6397abed04e05c`
- `female-suit.glb`: `9a7dae48ef51246abd542efc23cd0742fced08a500caec2497c3a735b86c0fcc`
- `male-casual-hoodie.glb`: `f5b722199f7628b24550989af4230f65d5230727df9c326fd2b3e360effe5249`
- `male-suit.glb`: `500ae95582c31288606934f6d28a8d2c5122e1e96a5b99a776da36197250de12`

## Animation clips

Each selected citizen contains the same 24 named clips:

`Death`, `Gun_Shoot`, `HitRecieve`, `HitRecieve_2`, `Idle`, `Idle_Gun`, `Idle_Gun_Pointing`, `Idle_Gun_Shoot`, `Idle_Neutral`, `Idle_Sword`, `Interact`, `Kick_Left`, `Kick_Right`, `Punch_Left`, `Punch_Right`, `Roll`, `Run`, `Run_Back`, `Run_Left`, `Run_Right`, `Run_Shoot`, `Sword_Slash`, `Walk`, and `Wave`.

AmpliWorld should normally expose only `Idle`, `Idle_Neutral`, `Walk`, `Run`, `Interact`, and `Wave`. The combat clips are part of the original CC0 assets but are not required for the finance-and-lifestyle core loop.

## Recommended use

- Player at launch: `models/male-casual-hoodie.glb` or `models/female-casual.glb`.
- Trading floor, concierge, and high-value social NPCs: the two suit variants.
- Do not load these four 3 MB assets for every crowd member. Use them for the player and the nearest 4–8 hero NPCs.
- Use the much smaller Kenney Mini Characters, static low-LOD proxies, or sprites beyond the near field.
- Because these are skinned assets, clone each animated instance with `SkeletonUtils.clone`; a shallow `scene.clone()` can share skeleton state incorrectly.
