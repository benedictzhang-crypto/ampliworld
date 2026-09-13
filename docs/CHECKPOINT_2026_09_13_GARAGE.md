# Driving view and B1 parking checkpoint

## Delivered

- Fixed the driving-mode input gap: active car registers mouse/trackpad/R/F look input, retaining independent view yaw and pitch. Looking does not steer the car.
- Added GC-MALL-GARAGE-001, placed at mall origin (0, -188): B1 floor -4.2 m, ceiling underside -0.45 m, 176 bays, 24 original parked vehicles across four body classes; 152 bays empty.
- Existing east ramp stays open. The west vestibule wall opens into a 3D garage, preserving the separate pedestrian concourse. Follow the ramp north then turn left before the narrow pedestrian portal.
- Car state now retains elevation, uses oriented 2.1 × 5 m collision footprint, and explicitly allows registered ramp/garage floors while rejecting underwater/unregistered negative terrain.
- Camera obstacle ray and lower underground boom; garage overview permits a horizontal eye below the ceiling. Boarding checks vertical proximity so a car under the mall cannot be boarded from the store above.
- Parking indicator appears only for a slow/stopped, aligned car fully inside an empty bay. E exits beside the vehicle where clear.

## Verification

`check-garage.mjs` samples the real floor/collision functions along the ramp, west turn, empty-bay approach and ascent. It checks above/below floor separation, parking orientation, parked-car blocking and negative-terrain rejection. This is route-level algorithm coverage, not an exhaustive physical driving playthrough.

Headless browser driving checks passed: enter car, trackpad pitch/yaw, unchanged steering heading, actual upward camera direction, F down-look, acceleration and exit. Landmark-view checks and visual garage inspection passed after correcting the overview polar-angle limit. Existing civic/CBD tests and production build passed.

## Remaining polish

Parked vehicles are original simplified static models, not additional driveable actors. No automated valet, car ownership, payment or persistent parking storage. Expanded manual driving playtests, further material/lighting refinement, ceiling fixture collision detail and shared movement/look input extraction remain next steps.
