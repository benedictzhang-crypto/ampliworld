# Completion pass: connected interiors and safety

## Completed

- Aureline GC-AUTO-001: 24 solid stair treads, continuous side guards, protected upper-gallery edges and active height-tagged support surfaces. Original footprint unchanged. Ground visitors retain floor 0.18 m; the gallery is 5.4 m.
- Garage: discrete collision volumes for wheel stops, light housings, signs, transverse pipes, ventilation ducts and portal lintel. Physical service clearance corrected to 2.72 m; portal lintel clearance 3.26 m. Entrance lettering now stays inside its wall region.
- Low wheel stops are checked against four tyre contact regions; bumper overhang can extend above a stop without premature collision.
- Car exits choose a nearby safe side destination and sample the full path. Floors must stay within 0.29 m of the car floor, avoiding the reported below-grade wall/upstairs teleport. Parked-car pedestrian bounds now use its oriented footprint's enclosure instead of a fixed 5.2 m square.
- Car camera collision is rechecked after interpolation and control updates, closing the gap between a safe target eye and an unsafe intermediate eye.

## Checked

`check-civic-assets.mjs`: stair risers, clear ascent to gallery, stacked floor separation, restaurant/showroom entry and existing road paths. `check-garage.mjs`: existing descent/ascent routes, approach from the open end of a bay, tyre-stop contact, aligned parking, wall-side exit at (-101,-188,-4.2), ordinary basement exit and camera clipping beneath the garage roof. Existing CBD checks passed.

Headless driving and landmark-view regression checks passed. Browser tests cover input and view transitions; the complete kilometre-long drive and stair ascent have route-level tests rather than an exhaustive user playthrough. No Safari window was opened.

## Still unfinished

Additional parked cars are not selectable/driveable actors. Complete mall upper floors, lifts, dealership services, broader material/lighting refinement and shared look-input extraction remain future work. This pass does not claim that all historical requests are complete.
