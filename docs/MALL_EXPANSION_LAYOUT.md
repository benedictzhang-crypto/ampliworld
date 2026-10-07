# Aurea Galleria: expansion and operational circulation

## Spatial contract

The main enclosure is **380 m east–west × 170 m north–south**. This is
64,600 m² gross per full rectangular plate, not net leasable area. The open
90 × 70 m atrium, shafts, circulation, walls and service rooms reduce usable
space. Existing retail fixtures remain at human scale; the new wings add real
floor plates rather than scaling people, furniture or merchandise.

`app/world-client/mall-spatial-plan.json` owns all elevations and reservations.
L1 clear height is 7.1 m, L2–L5 6 m, and the L6 entertainment volume 16 m.
The roof is at Y=52.37 m. Lower shop/arcade ceilings may sit beneath the L6
structural volume. All six retail levels retain their restroom suites.

| Area | Physical location | Current use |
|---|---|---|
| Existing core | Local X ±112.5 m | Shops, restaurants, galleries and atrium |
| West wing L6 | X −184…−125 m, five Z bays | Five independent cinema auditoria |
| South-east L6 | X 38…96 m, Z 51…74 m | Connected arcade hall |
| West/east wings L1–L5 | Outside the original core | Planted public space and future tenant reservations |
| B1 | Expanded 380 × 170 m envelope | VIP parking, existing food block, new market/events wings and service routes |
| B2–B4 | Original parking envelope | Standard parking; unchanged 800-bay total across B1–B4 |
| Rear freight tower | X 60 m, Z −98 m | B4–B1, L1–L6 and roof |
| External loading yard | East, X 217…280 m | Relocated truck docks and equipment |

B1 has 6.8 m structural clearance. The older central parking fixtures still
hang lower; 6.8 m is not a vehicle clearance promise for every route. Reserved
commercial wings are not yet fully tenanted stores. Future occupancy must
preserve the marked walking routes and shaft/ramp exclusions.

## Cinema

The five halls occupy real 59 × 28 m rooms, each with 216 seats: 1,080 seats
total. The screen ends, acoustic side walls, ceilings, centre aisles, entry
stairs, seat rows and projection equipment have explicit positions. The
stepped support function shares dimensions with the Blender geometry; these
are not five screens pasted into an undivided room.

- Hall 1: IMAX-style large-format concept, 22 × 12 m modeled screen.
- Hall 2: Dolby-style immersive concept, 22 × 9 m modeled screen, overhead arrays.
- Halls 3–5: 22 × 8 m screens in the same structural bays.

These are original game concepts, **not certified IMAX or Dolby installations**.
Official descriptions informed the distinction between custom auditorium
geometry, large-format presentation and immersive speaker placement:
[IMAX experience](https://www.imax.com/the-imax-experience),
[Dolby cinema systems](https://professional.dolby.com/cinema/).
The modeled screen art is an original test pattern; no licensed movie playback
is provided. Acoustic simulation, operational projection, evacuation-code
approval and professional engineering certification are outside this prototype.

## Arcade and retail

The arcade contains 24 physically placed cabinets across eight types: four
coin pushers, six varied claw cabinets, four racing cockpits, two motorcycles,
two twin-gun cabinets, three basketball cages, one large fishing screen and
two rotary prize-fishing stations. Geometry includes steering wheels, pedals,
plush toys, coins, hoops, controls and display enclosures. Machine gameplay,
prize inventory and payments are **not connected**.

The retail update adds concept gold-jewelry stores named Lukfook Jewellery and
Chow Tai Fook, plus a steakhouse, premium Cantonese dim-sum/tea restaurant and
seafood restaurant. Names are illustrative, not confirmed tenants or licensed
brand partnerships. Existing luxury stores are retained.

## Back-of-house circulation

Detailed restaurants have a customer-side kitchen access gap and a 2.6 m rear
staff door. Existing generic dining rooms also receive a kitchen work zone and
a real rear doorway. The rear ring and east-side route connect to the freight
bridge. The 6.8 × 8.8 m freight cab travels continuously between eleven levels;
its landing doors close before movement. Basement rear connections are real
floors, walls and openings. Public elevators use transparent glass doors and
cab sides. Roof air-handling units reserve equipment space.

This is a circulation prototype, not an operational logistics simulator:
staff scheduling, cargo handling, food production, fire compartments, emergency
stair cores, complete MEP distribution and access permissions remain future work.

## Assets and checks

- `mall-blender-primitives.py`: shared metric geometry/material helpers.
- `build-mall-campus.mjs`: structural shell and walkable slabs.
- `build-mall-fitout.py`: brand/dining/restroom interiors.
- `build-mall-entertainment.py`: independent leisure/shaft/landscape asset.
- `build-mall-garage-v2.mjs`: lower garage plus full B1 commercial extensions.
- `check-mall-expansion.mjs`: footprint, floor support, hall routes, kitchen
  exits, freight approaches, destination discovery and asset-size checks.

Local browser verification supplements geometry tests; neither guarantees
whole-city performance or production-ready safety. Reserved areas deliberately
remain available for later tenants rather than being filled with fake shops.
