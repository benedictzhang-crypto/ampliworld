# 30,000-resident city operations audit

This audit separates a plausible service network from an attractive collection
of props. Counts are scenario controls, not claims that one real city supplies
the uniquely correct ratio.

## External calibration

- New York City's active restaurant-inspection dataset contained 31,335 unique
  establishment identifiers when queried on 24 September 2026. The source is
  the NYC Department of Health and Mental Hygiene open dataset; one restaurant
  can have many inspection rows, so the audit counts distinct `CAMIS` values.
  <https://data.cityofnewyork.us/resource/43nn-pn8j.json>
- Hong Kong's official business table reports 17,531 food-and-beverage-service
  establishments. Its 2025 licence table separately reports 12,474 general and
  4,397 light-refreshment restaurant licences. These definitions are not
  interchangeable with the New York inspection universe.
  <https://www.censtatd.gov.hk/en/web_table.html?id=215-16003>
- Beijing's fifth economic census reports 51,179 accommodation and catering
  corporate entities in 2023, 86.1% of them catering entities. This omits some
  outlet-level distinctions and must not be treated as a storefront count.
  <https://tjj.beijing.gov.cn/tjsj_31433/tjgb_31445/jpgb_31447/202505/t20250516_4090496.html>
- Boston, Miami, Shanghai, New York, Beijing and Hong Kong also represent
  different urban forms. Boston/New York cores favor curb and structured
  parking; Miami is more vehicle-oriented; Beijing/Shanghai combine compounds,
  mall basements and neighborhood frontage; Hong Kong is strongly transit- and
  podium-oriented. The audit uses these as topology references, not as a false
  six-city average.

## AmpliWorld decision

| System | Current 30k scenario | Decision |
| --- | ---: | --- |
| Restaurants | 168 | High relative to the official-city range; freeze count |
| Cafe, milk tea and bakery | 40 | Keep; already covers light-refreshment demand |
| Fresh food and major grocery | 24 fresh markets + 12 grocery-format campuses | Keep |
| Convenience stores | 30 | Keep |
| Fuel stations | 12 | High for a dense transit city; freeze count |
| EV charging hubs | 12 | Keep as future-fleet capacity |
| Automotive repair | 10 | Keep |
| Automatic car washes | 6 two-bay sites | Add |
| Public neighborhood garages | 8 × 180 spaces | Add |
| Mall garage | 800 spaces | Retain |
| Marked service forecourts | Four bays at each eligible street service | Add as visible capacity |
| Marina | 150 berths, 100 static occupied berths | Retain physical fleet |
| Waterfront operation | Two rentals + one sightseeing cruise | Add staff, prices and demand |
| Power, water and wastewater | One staffed regional facility each | Keep; regional capacity assumption |
| Landscape maintenance | Community, stadium and city-maintenance roles | Keep |

## What now operates

Parking, car-wash, boat-rental and sightseeing-cruise businesses have named
staff roles, hours, prices, visit counters, revenue and cash balances. At each
day boundary, deterministic residents generate demand and transfer money to
the selected operator. The demand model is deliberately inspectable. Employed
residents are currently used as a vehicle-commuting proxy because personal car
ownership is not yet represented; that limitation must be removed before using
parking behavior as research evidence.

Physical work in this pass includes six open-ended automatic-wash tunnels,
eight five-deck parking structures, 1,440 declared public-garage spaces and
instanced four-bay markings/wheel stops at eligible service forecourts. The
marina operators occupy counters in the existing yacht-hotel arrival court;
they do not duplicate the harbor building.

## Remaining operational gaps

- Assign actual vehicles to households and companies before calibrating parking
  or wash demand.
- Add occupancy state to every individual parking bay outside the mall garage.
- Make selected rental boats and sightseeing vessels move on reviewed water
  routes; present yachts remain static.
- Model utility capacity, outages, water demand and maintenance dispatch instead
  of assuming one regional plant can always serve the city.
- Replace the simple daily demand schedule with measured arrival distributions,
  weather sensitivity and price elasticity.
