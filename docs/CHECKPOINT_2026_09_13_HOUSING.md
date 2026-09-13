# Housing replan — 13 September 2026

## Delivered

| Class | Compounds | Buildings each | Height / provisions |
|---|---:|---:|---|
| Older low-income | 25 | 20–35 | Six storeys; faded concrete, patching, rusted window details |
| Lower-middle | 15 | 15–20 | 8/10 storeys; each has a physically enterable supermarket |
| High-end garden apartments | 5 | 6–10 | 5/8 storeys at 3.7 m; planted courts, management, guardhouse, gate |
| Ultra residential towers | 2 | 5/6 | 50/60 storeys at 4 m; luxury exterior, clubhouse; two-lift/one-home layout metadata |
| Mixed urban villas | 2 | 36 | 12 townhouses, 12 duplexes, 12 detached buildings each; East and South subcenters |
| Edge detached estates | 2 | 20 | Large palatial detached residences inside a gated community |

Existing main-center river community retains all 60 villas. Qingting's 15 buildings count toward the lower-middle total, and now use only 8/10-storey prototypes. All 251 non-residential generated compounds and named core landmarks remain. 296 unused residential-only tile files were moved into the recoverable asset archive, not destroyed.

51 replanned parcels use surveyed rotated boundaries, dogleg external connections and offset internal building rows. Main internal lanes gently bend. The city's regional arterial grid remains: this is not yet a complete Beijing-like road-network redesign. Shrunk compound count leaves significant undeveloped land; do not describe it as a finished dense metropolis.

## Engineering and verification

Housing is an independent registry and rendering layer, not further additions to the legacy world. 16 small original GLB prototypes supply volumetric geometry, colliders and floor manifests. Nearby instances share geometry/materials; distant homes retain volume proxies. Rotated low-level colliders are subdivided to avoid a whole-building AABB sealing a genuine lobby. Access gates change their collision state through a nearby demonstration button; previews never relocate the avatar.

Checks: TypeScript, production build, city/housing/community/metropolitan invariant scripts and background headless landmark preview/return checks. Independent parcel audit verifies exact counts, footprint and river/road clearances, preserved campuses and connector endpoint support. No Safari opened.

## Remaining

- Apartment upper floors, functioning lifts, furnished individual homes and identity-aware property access are not implemented. Two elevators per exclusive apartment is a design contract, not a working elevator system.
- Supermarket, guardhouse, management and clubhouse accessible areas are geometric interiors; checkout, guards and services are not simulated yet.
- Eight apartment prototypes and three villa families are reused, not hundreds of uniquely designed houses. Facade aging, courtyard decoration and neighborhood-specific character need an art pass.
- Global road geometry, corner shops, street trees, parking and high-end garden detailing need further refinement. Streaming transitions and long-distance gameplay need extended device testing.
