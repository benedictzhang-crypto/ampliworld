# AmpliWorld 30,000-person city capacity and occupation standard

Status: operating baseline for the first city. This document defines what the
city must contain and staff; it does not claim that every listed site already
has finished architecture, interiors, queues, inventory or calibrated demand.
The machine-readable source of truth is
`app/life-sim/city-capacity-standard.ts` and is checked by
`npm run check:city-capacity`.

## 1. Population and labour frame

The baseline population is 30,000 residents. The current opening world assigns
19,512 residents to employment and retains children, students, retired people,
caregivers and job seekers as non-employed residents. Employment is divided as
follows; the total must remain exactly 19,512.

| Sector | Target workers |
|---|---:|
| Food and hospitality | 2,600 |
| Retail and personal services | 2,200 |
| Health and care | 2,100 |
| Education and childcare | 1,500 |
| Professional, finance and technology | 2,700 |
| Transport and logistics | 3,200 |
| Government, public safety and justice | 1,500 |
| Utilities, environment and maintenance | 1,200 |
| Construction and real estate | 850 |
| Culture, recreation and tourism | 650 |
| Independent, gig and household work | 1,012 |

The target is an auditable scenario distribution, not a copied census. A job
must have an employer, physical or registered workplace, wage, shift window and
service output. A title without those links is not counted as an operating job.

## 2. Restaurant programme

The city target is **200 operating restaurant licences**, approximately one
per 150 residents. Coffee shops, tea shops, bakeries, bars and institutional
canteens are tracked separately. This replaces the earlier unsupported claim
that 168 restaurants represented a complete high-density provision.

### Service level

| Level | Sites | Typical function |
|---|---:|---|
| Chef-led tasting / destination dining | 2 | Reservation-led tasting menus and special occasions |
| Premium and skyline dining | 9 | Luxury hotel, tower and waterfront dining |
| Upper-mid full service | 14 | Business dining and high-quality neighborhood destinations |
| Mid-price full service | 30 | Table-service family and social dining |
| Value and family dining | 55 | Affordable sit-down and counter service |
| Neighborhood kitchens / quick service | 86 | Noodles, dumplings, rice, sandwiches, takeaway and delivery |
| Licensed food trucks | 4 | School, CBD and event demand |
| **Total** | **200** | |

### Primary cuisine

| Cuisine | Sites | Cuisine | Sites |
|---|---:|---|---:|
| Chinese regional and banquet | 52 | Chinese noodles, dumplings, rice and breakfast | 26 |
| Japanese | 18 | Korean | 9 |
| Thai and Vietnamese | 9 | American grill, burger and fast casual | 16 |
| Italian | 10 | French and other European | 8 |
| Mediterranean and Middle Eastern | 10 | South Asian | 8 |
| Latin American | 8 | Seafood | 7 |
| Steakhouse | 5 | Vegetarian and health-focused | 7 |
| Bakery restaurant and brunch | 5 | African and Caribbean | 2 |
| **Total** | **200** | | |

Each restaurant record must eventually carry: primary cuisine, service level,
seat count, kitchen capacity, opening periods, menu price distribution,
takeaway/delivery support, inventory, supplier, employees, owner, rent and
daily demand. Core roles are operator, manager, chef, line cook, prep cook,
server, host, dishwasher, cleaner and delivery packer. Large or premium venues
also require pastry, sommelier/beverage, reservation and purchasing roles.

## 3. Complete facility inventory

### Food, accommodation and nightlife

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Restaurants | 200 | 3–28 |
| Coffee shops | 18 | 5–10 |
| Tea and milk-tea shops | 12 | 4–8 |
| Bakeries and dessert shops | 20 | 4–9 |
| Bars and pubs | 14 | 6–12 |
| Nightclubs and late venues | 3 | 18–28 |
| Full-service hotels | 6 | 28–70 |
| Limited-service hotels | 8 | 8–16 |

Hotels must include front desk, housekeeping, engineering, security and sales;
full-service hotels add concierge, kitchens, restaurants, events and spa or
fitness staff. Night businesses require late shifts, security and transport
demand rather than behaving like daytime retail.

### Retail and personal services

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Convenience stores | 30 | 5–9 |
| Community pharmacies | 12 | 8–14 |
| Fresh-food markets | 24 | 8–14 |
| Large grocery/general retail campuses | 17 | 38–72 |
| Individually operated mall shops | 108 | 2–6 |
| Hair, nail and personal-care shops | 24 | 4–9 |
| Florists | 8 | 3–5 |
| Dry cleaners and laundromats | 18 | 2–7 |
| Electronics sales and repair | 14 | 5–18 |
| Car, EV and motorcycle dealers | 9 | 14–48 |

Large retail includes six premium grocers, four Target-format stores, two
hypermarkets, one warehouse club, three Asian grocers and one home-improvement
campus. It must model departments, receiving, stock, checkout, online picking,
loss prevention, cleaning and management rather than one generic “shop worker.”

### Health, medicine and care

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Regional general hospital | 1 | 1,250 |
| Primary-care and urgent clinics | 12 | 14–22 |
| Dental clinics | 10 | 7–11 |
| Community mental-health clinics | 3 | 12–20 |
| Eldercare / assisted-living services | 6 | 18–42 |
| Veterinary, pet-care and shelter sites | 8 | 6–12 |
| Public-health and prevention center | 1 | 45–70 |

The hospital cannot be one generic workplace. Its 1,250 positions are allocated
to 20 operating departments:

| Department | Staff | Department | Staff |
|---|---:|---|---:|
| Administration, records, patient access | 55 | Emergency and trauma | 90 |
| Internal medicine / inpatient wards | 100 | Surgery and anesthesia | 95 |
| Critical care / ICU | 70 | Cardiology | 55 |
| Neurology | 38 | Orthopedics and sports medicine | 48 |
| Obstetrics, gynecology and maternity | 70 | Pediatrics and neonatal care | 65 |
| Psychiatry, psychology and social work | 42 | Oncology and infusion | 38 |
| Infectious disease / infection control | 22 | ENT, ophthalmology and dermatology | 42 |
| Radiology and imaging | 55 | Laboratory medicine and pathology | 65 |
| Hospital pharmacy | 32 | Rehabilitation | 48 |
| Nursing float and patient support | 160 | Dietary, sterile supply, security, facilities | 60 |
| **Total** | **1,250** | | |

Hospital occupations include physicians by specialty, surgeons,
anesthesiologists, registered and practical nurses, nurse practitioners,
pharmacists, laboratory and radiology technologists, therapists, psychologists,
social workers, dietitians, paramedics, medical coders, schedulers, sterile-
supply technicians, cooks, cleaners, security and facilities engineers.

### Education and childhood

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Daycare centers | 10 | 12–16 |
| Primary schools | 5 | 48–75 |
| Middle schools | 3 | 55–85 |
| High schools | 2 | 70–110 |
| Special education and vocational campuses | 2 | 45–90 |
| Tutoring, art, music and dance centers | 44 | 8–12 |
| Community college and research campus | 1 | 300–550 |

Required roles cover principals, general and subject teachers, early-childhood
teachers, special-education teachers, teaching assistants, counselors,
psychologists, nurses, librarians, laboratory technicians, coaches, arts and
music teachers, cafeteria workers, administrators, custodians and security.

### Government, justice and emergency services

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Police precincts | 4 | 36–52 |
| Fire and rescue stations | 6 | 28–34 |
| Emergency medical and dispatch center | 1 | 125 |
| Court, detention and correctional sites | 3 | 50–190 |
| City hall, tax and regulatory offices | 4 | 120–260 |
| Family, disability, housing and food-support centers | 4 | 18–36 |

Required functions include patrol, traffic enforcement, investigation,
dispatch, records, crime analysis, community liaison, firefighting, rescue,
inspection, ambulance response, judges, prosecutors, public defenders, clerks,
bailiffs, corrections, planning, permitting, taxation, procurement, civil
records, building inspection and public counters.

### Transport and logistics

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Metro stations | 14 | 24–60 |
| Bus depots / route operations | 3 | 80–180 |
| Taxi and ride-hail fleet bases | 6 | 12–36 |
| Airport and high-speed rail terminals | 3 | 280–1,800 |
| Logistics and light-industry parks | 8 | 180–250 |
| Post and parcel centers | 6 | 8–12 |
| Marina, charter and cruise operators | 3 | 10–24 |
| Food wholesale and cold-chain centers | 3 | 45–90 |

The occupation set includes bus, taxi, ride-hail and truck drivers; train
operators; station agents; security screeners; fare inspectors; signal, track
and vehicle technicians; dispatchers; baggage handlers; warehouse pickers;
forklift operators; couriers; captains; deckhands and marine mechanics. Each
vehicle movement must be connected to a shift or service route, while distant
traffic may use aggregate flow rather than one fully rendered vehicle per job.

### Utilities, environment and digital infrastructure

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Power, water and wastewater plants | 3 | 120–165 |
| Waste, recycling and transfer facilities | 3 | 60–140 |
| Road, bridge and streetscape depots | 10 | 60–80 |
| Telecom exchange and municipal data center | 2 | 45–90 |

Required roles include control-room operators, electrical/water/civil
engineers, water-quality and environmental laboratory staff, pipe and grid
technicians, mechanics, collection drivers, sanitation workers, recycling
sorters, road crews, signal technicians, bridge inspectors, sweepers,
sprinkler-truck drivers, arborists, network engineers, cybersecurity analysts
and data-center technicians.

### Finance, offices, housing and construction

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Bank branches | 10 | 10–15 |
| Professional, technology and corporate offices | 24 | 60–300 |
| Insurance, accounting and legal offices | 18 | 6–22 |
| News, media, advertising and production studios | 6 | 12–45 |
| Property management, brokerage and development firms | 16 | 8–48 |
| Active construction sites | 3 | 90–180 |
| Household/building repair services | 18 | 5–10 |
| Public garages, fuel, charging, repair and car care | 52 | 3–12 |

This sector must distinguish tellers, loan and compliance officers, insurers,
claims adjusters, accountants, auditors, lawyers, paralegals, engineers,
researchers, product and design workers, sales, human resources, property
managers, leasing agents, brokers, appraisers, architects, planners, surveyors,
cost engineers, safety officers and all principal building trades.

### Culture, sport, tourism and public space

| Facility | Sites | Staffing per site |
|---|---:|---:|
| Museum, art museum, concert hall and opera house | 4 | 48–120 |
| Public libraries | 4 | 12–32 |
| Religious and community worship spaces | 8 | 3–14 |
| Funeral, cremation and cemetery services | 3 | 10–28 |
| Cinemas | 4 | 24–38 |
| Gyms, pools, courts, stadium and recreation halls | 18 | 6–80 |
| Amusement park and haunted attractions | 1 | 180–260 |
| Public parks and riverfront recreation zones | 18 | 2–12 |

Required roles include directors, curators, conservators, educators,
performers, musicians, stage/sound/light technicians, projectionists, ticketing,
visitor services, coaches, fitness instructors, lifeguards, groundskeepers,
arborists, rangers, ride operators, ride mechanics, actors, game attendants,
first aid, security and cleaning.

## 4. Operating rules

1. A facility is not “complete” because its name appears in a registry. It must
   have a collision-safe physical parcel or interior unit, an entrance, opening
   periods, employees, capacity and an economic account.
2. Every employee must have one primary employer, wage, shift, commute mode and
   household. Night and 24-hour services require explicit shift coverage.
3. Counts do not scale blindly. Neighborhood stores scale approximately with
   population; airports, hospitals, utilities and cultural landmarks scale by
   catchment and capacity.
4. The client never needs to draw all 30,000 routines simultaneously. The
   server retains every resident's day and the client renders only the nearby
   sample, with distant population and traffic represented as aggregate flow.
5. Real-world calibration remains a separate research task. This standard
   guarantees internal coverage and auditable assumptions, not forecasting
   validity.

## 5. Expansion rule

At the same restaurant density, 300,000 residents imply approximately 2,000
restaurant licences, three million imply approximately 20,000, and six million
imply approximately 40,000. Those are operating records, not a requirement to
render every interior simultaneously. The same distinction applies to every
other repeatable service: registry and economic simulation may be citywide,
while detailed 3D assets stream only around observation points.
