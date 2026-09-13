# Mall circulation and parking checkpoint — 2026-09-13

## Implemented

- Existing mall footprint preserved at 225 × 180 metres. Six occupied levels now use thin slabs, open atrium galleries, glass rails and independently enterable furnished rooms rather than solid upper-wing blocks. Roof has a continuous ring promenade with planted beds, benches and balustrades.
- L1 luxury/lifestyle; L2 luxury/jewellery; L3–L4 technology, outdoor travel and accessible fashion; L5–L6 tea, dining, cinema/arcade-themed rooms. 108 prototype shop rooms. Requested brands are illustrative plain-name signage, not claims of tenancy, sponsorship or Michelin/Black Pearl accreditation.
- Outdoor customer striping and parked cars replaced by three supply truck/loading docks and service equipment. Existing customer descent remains.
- Four garage levels at −7.2, −13.2, −19.2 and −25.2 metres: 6 m floor spacing, 5.6 m structural clearance, 4.8 m minimum service clearance. B1 has 152 VIP bays and a furnished food/activity block; other floors have 216 each. Total 800 bays, with 96 static display vehicles.
- Blue A, green B, amber C and violet D color coding on columns, bay strips and wayfinding. Stable floor-specific bay IDs and occupancy detection.
- Three-turn 12 m-wide helical ramp with floor landings. Preserved outer ramp connects through the new internal slope. Real tyre-width terrain probes replace the incorrectly oversized square probes; low obstacles compare against local tyre support, cached once per collision check.
- Four aligned elevator banks, four cars each. Sixteen cabs serve B4 through RF. Shafts are cut from every floor/ceiling, door blockers close other landings, and cabs move continuously rather than teleporting the player. Nearby UI calls a lift; walking inside allows a destination choice. This is a local single-player prototype, not a dispatched passenger-capacity simulation.
- Shorter, more level underground walking/driving cameras. Height-aware parking and safe disembark checks prevent confusing vertically aligned spaces.
- Added mall-floor previews without moving the avatar. No Safari window was opened.

## Verification

- TypeScript and production build checked.
- Headless browser previews passed for B1–B4, L1, L6 and RF, with no runtime exceptions and unchanged avatar position on return. Screenshots visually inspected; these remain plainly modular prototype finishes, not final photoreal art. Initial software-renderer attempt timed out; short native headless GPU rerun passed.
- `node --import tsx scripts/check-garage.mjs`: nine off-centre ramp entries at 20/30/60 FPS, 800 unique bays, layer-aware parking/exits, ceiling camera clips and physical parked cars.
- `node --import tsx scripts/check-mall-circulation.mjs`: all 16 cabs to all 11 stops (176 continuous state-machine routes), landing-door interlocks, lift shaft openings, floor support and four zones per basement.
- `scripts/check-garage-production-drive.mjs` uses the same `stepVehicleMotion` as the running vehicle, with complete nearby district colliders. Fixtures cover continuous B2/B3/B4 descent, B1-F2-12 parking and B4-to-outside uphill return in reverse gear. Return fixture steers around a real pillar; it is not a forward turnaround test.
- Structural and state-machine tests do not substitute for a full human walk-to-lift, ride, exit and shopping session. Continue manual/background interaction QA on every bank and level.

## Still unfinished

- Individual brands' tailored shopfronts, detailed product inventory and premium finish polish; present rooms reuse original modular furnishings.
- Actual purchases, food service, VIP access/payment rules, parking fees, cinema playback and playable arcade machines.
- Lift traffic dispatch, NPC passengers, multi-user synchronization, emergency stairs/service lift refinement and accessible routing audit.
- Forward-driving turnaround and complete per-bay path coverage; complex edge cases around ramps remain a regression-test priority.
- Historical garage asset remains archived in the library; only the new four-level asset is loaded.

## Entry / usage

Use “地库览景” for four parking levels or “商场楼层览景” for L1–L6 and RF. Return to “控制小人” restores the previous walking position. Elevator banks occupy the north-west, north-east, south-west and south-east interior strips. Walk toward a lift and use the appearing elevator control; call it to your floor, enter the cab, then choose the destination. Preview buttons do not transport the avatar.
