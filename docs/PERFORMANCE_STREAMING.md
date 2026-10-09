# Persistent world, selective rendering

The city is not regenerated when the camera moves. World coordinates, collision
boxes, resident records and purchases remain independent of visual asset mounts.
Interior streaming is a presentation optimisation, not a simulation shortcut.

## 2026-10-09 implementation

- Mall exterior shell stays available. The 26 modular tenant interiors select
  at most six nearby units, weighted strongly toward camera floor. One new unit
  is admitted per 250 ms tick; exit thresholds provide hysteresis.
- Interior-only sports, entertainment and boutique assets load in their local
  volumes. Collision registries stay available even before a GLB finishes.
- Cached GLTF downloads are reused on return. This is **not** a bounded GPU-cache
  eviction implementation; previously visited cached assets may retain memory.
- Walker and vehicle collision queries use a conservative 24 m XZ spatial grid.
  Exact wall, floor, ceiling, vehicle footprint and camera ray tests remain
  unchanged. Large spanning colliders stay in a separate always-tested list.
- Inactive controllers do not rebuild spatial indices as another vehicle moves.
- Resident controller identity and panels are memoized. Player movement no
  longer causes wealth sorting and the full resident panel to rerender.
- Visual coordinates report at roughly 8 Hz; movement/physics remains per frame.
  Population instance writes are capped at the allocated 1,200 instance slots.

## Measured local checks

Same browser, camera poses and viewport; numbers include renderer shadow work.
Visual day time differs slightly. These are workload snapshots, not a
controlled FPS benchmark.

| View | Before draw calls | After draw calls | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: |
| Walk spawn (0, -68) | 1,121 | 878 | 9,149,114 | 6,088,108 |
| L2 tailoring entrance (-177, -230) | 467 | 384 | 7,000,530 | 5,808,770 |

At the L2 entrance the walker broad phase selected 26 out of 23,836 boxes.
The scene deliberately uses demand rendering and an idle sky timer; its idle
render cadence around 15–17 Hz is not an interactive frame-rate benchmark.

## Verification and limitations

Run `node --import tsx scripts/check-streaming-performance.mjs`:
every store selects itself at its location; the six-unit cap, staged mounts and
distant eviction are checked; 400 grid queries match exhaustive tests over
12,002 boxes, including giant slabs and negative grid boundaries. Indexed
vehicle trajectories are compared against exhaustive tests at maximum speed.
Mall circulation, safe vehicle arrival and retail ownership tests also apply.

Cold teleports can still show interiors arriving after download/decode; exterior
shells and collision remain. Large legacy combined mall/infrastructure meshes
still account for millions of triangles. Next: author spatial/floor chunks for
those assets, add bounded cache eviction and measure active movement frame-time
percentiles on target machines. Do not claim universally stutter-free rendering.
