/**
 * Canonical operating standard for the first 30,000-resident AmpliWorld city.
 *
 * This is a scenario specification, not a claim that one real city has an
 * ideal service ratio.  It keeps establishment counts, staffing, specialist
 * departments and the synthetic labour force internally consistent.  Scale
 * with population only after applying catchment, floor-area and utilisation
 * constraints; a hospital, airport or power plant must not be multiplied like
 * a convenience store.
 */

export const CITY_STANDARD_POPULATION = 30_000;
export const CITY_STANDARD_EMPLOYED_RESIDENTS = 19_512;

export type CountPlan = Readonly<{
  id: string;
  label: string;
  count: number;
}>;

export const RESTAURANT_TIER_PLAN: readonly CountPlan[] = [
  {id:'signature',label:'Chef-led tasting / destination dining',count:2},
  {id:'premium',label:'Premium dining and skyline restaurants',count:9},
  {id:'upper',label:'Upper-mid full-service restaurants',count:14},
  {id:'mid',label:'Mid-price full-service restaurants',count:30},
  {id:'value',label:'Value restaurants and family dining',count:55},
  {id:'neighborhood',label:'Neighborhood kitchens and quick-service shops',count:86},
  {id:'food-truck',label:'Licensed food trucks',count:4},
] as const;

/** One primary cuisine is assigned to every restaurant licence. */
export const RESTAURANT_CUISINE_PLAN: readonly CountPlan[] = [
  {id:'chinese-regional',label:'Chinese regional and banquet cuisine',count:52},
  {id:'chinese-quick',label:'Chinese noodles, dumplings, rice and breakfast',count:26},
  {id:'japanese',label:'Japanese',count:18},
  {id:'korean',label:'Korean',count:9},
  {id:'thai-vietnamese',label:'Thai and Vietnamese',count:9},
  {id:'american',label:'American grill, burger and fast casual',count:16},
  {id:'italian',label:'Italian',count:10},
  {id:'french-european',label:'French and other European',count:8},
  {id:'mediterranean-middle-east',label:'Mediterranean and Middle Eastern',count:10},
  {id:'south-asian',label:'South Asian',count:8},
  {id:'latin-american',label:'Latin American',count:8},
  {id:'seafood',label:'Seafood',count:7},
  {id:'steakhouse',label:'Steakhouse',count:5},
  {id:'vegetarian-health',label:'Vegetarian and health-focused',count:7},
  {id:'bakery-brunch',label:'Bakery restaurant and brunch',count:5},
  {id:'african-caribbean',label:'African and Caribbean',count:2},
] as const;

export const HOSPITAL_DEPARTMENT_PLAN: readonly CountPlan[] = [
  {id:'administration',label:'Administration, records and patient access',count:55},
  {id:'emergency',label:'Emergency department and trauma',count:90},
  {id:'internal-medicine',label:'Internal medicine and inpatient medical wards',count:100},
  {id:'surgery-anesthesia',label:'Surgery, operating rooms and anesthesia',count:95},
  {id:'critical-care',label:'Critical care and intensive care',count:70},
  {id:'cardiology',label:'Cardiology',count:55},
  {id:'neurology',label:'Neurology',count:38},
  {id:'orthopedics',label:'Orthopedics and sports medicine',count:48},
  {id:'obstetrics',label:'Obstetrics, gynecology and maternity',count:70},
  {id:'pediatrics',label:'Pediatrics and neonatal care',count:65},
  {id:'mental-health',label:'Psychiatry, psychology and social work',count:42},
  {id:'oncology',label:'Oncology and infusion',count:38},
  {id:'infectious-disease',label:'Infectious disease and infection control',count:22},
  {id:'ambulatory-specialties',label:'ENT, ophthalmology and dermatology',count:42},
  {id:'imaging',label:'Radiology and medical imaging',count:55},
  {id:'laboratory',label:'Laboratory medicine and pathology',count:65},
  {id:'pharmacy',label:'Hospital pharmacy',count:32},
  {id:'rehabilitation',label:'Physical, occupational and speech rehabilitation',count:48},
  {id:'nursing-float',label:'Inpatient nursing float and patient support',count:160},
  {id:'facilities',label:'Dietary, sterile supply, security and facilities',count:60},
] as const;

export type FacilityStandard = Readonly<{
  id: string;
  sector: string;
  label: string;
  sites: number;
  typicalStaff: readonly [number, number];
  roles: readonly string[];
  notes?: string;
}>;

/**
 * Establishments that a 30,000-person city must be able to place, staff and
 * operate.  Retail shops inside the main mall are counted as individual
 * businesses.  Parks, courts and roads are public assets rather than shops.
 */
export const CITY_FACILITY_STANDARD: readonly FacilityStandard[] = [
  {id:'restaurant',sector:'Food and hospitality',label:'Restaurants',sites:200,typicalStaff:[3,28],roles:['owner/operator','general manager','chef','line cook','prep cook','server','host','dishwasher','cleaner','delivery packer']},
  {id:'cafe',sector:'Food and hospitality',label:'Coffee shops',sites:18,typicalStaff:[5,10],roles:['cafe manager','barista','baker','cashier','cleaner']},
  {id:'tea',sector:'Food and hospitality',label:'Tea and milk-tea shops',sites:12,typicalStaff:[4,8],roles:['shop manager','drink maker','cashier','delivery packer']},
  {id:'bakery',sector:'Food and hospitality',label:'Bakeries and dessert shops',sites:20,typicalStaff:[4,9],roles:['bakery manager','baker','pastry cook','counter staff','cleaner']},
  {id:'bar',sector:'Food and hospitality',label:'Bars and pubs',sites:14,typicalStaff:[6,12],roles:['bar manager','bartender','server','door security','glass washer','cleaner']},
  {id:'nightclub',sector:'Food and hospitality',label:'Nightclubs and late venues',sites:3,typicalStaff:[18,28],roles:['venue manager','DJ','bartender','server','security','sound technician','cleaner']},
  {id:'hotel-full',sector:'Food and hospitality',label:'Full-service hotels',sites:6,typicalStaff:[28,70],roles:['general manager','front desk agent','concierge','housekeeper','engineer','security','restaurant staff','sales manager']},
  {id:'hotel-limited',sector:'Food and hospitality',label:'Limited-service hotels',sites:8,typicalStaff:[8,16],roles:['hotel manager','front desk agent','housekeeper','maintenance worker']},

  {id:'convenience',sector:'Retail and personal services',label:'Convenience stores',sites:30,typicalStaff:[5,9],roles:['store manager','sales associate','cashier','stock clerk']},
  {id:'pharmacy',sector:'Retail and personal services',label:'Community pharmacies',sites:12,typicalStaff:[8,14],roles:['pharmacist','pharmacy technician','store manager','stock clerk','cashier']},
  {id:'fresh-market',sector:'Retail and personal services',label:'Fresh-food markets',sites:24,typicalStaff:[8,14],roles:['market manager','produce clerk','butcher','fishmonger','cashier','receiver','cleaner']},
  {id:'large-grocery',sector:'Retail and personal services',label:'Large grocery and general retail campuses',sites:17,typicalStaff:[38,72],roles:['store manager','department manager','stock clerk','cashier','online-order picker','receiver','loss-prevention officer','cleaner']},
  {id:'mall-shop',sector:'Retail and personal services',label:'Mall retail shops',sites:108,typicalStaff:[2,6],roles:['shop manager','sales adviser','cashier','visual merchandiser']},
  {id:'salon',sector:'Retail and personal services',label:'Hair, nail and personal-care shops',sites:24,typicalStaff:[4,9],roles:['salon manager','hair stylist','nail technician','esthetician','receptionist','cleaner']},
  {id:'florist',sector:'Retail and personal services',label:'Florists',sites:8,typicalStaff:[3,5],roles:['owner','floral designer','sales associate','delivery driver']},
  {id:'laundry',sector:'Retail and personal services',label:'Dry cleaners and laundromats',sites:18,typicalStaff:[2,7],roles:['manager','dry-cleaning technician','pressing specialist','repair tailor','attendant','equipment technician']},
  {id:'electronics',sector:'Retail and personal services',label:'Electronics sales and repair shops',sites:14,typicalStaff:[5,18],roles:['store manager','sales adviser','technical adviser','repair technician','inventory specialist']},
  {id:'vehicle-retail',sector:'Retail and personal services',label:'Car, EV and motorcycle dealers',sites:9,typicalStaff:[14,48],roles:['general manager','sales adviser','finance manager','service adviser','mechanic','parts specialist','detailer']},

  {id:'hospital',sector:'Health and care',label:'Regional general hospital',sites:1,typicalStaff:[1250,1250],roles:['physician','surgeon','anesthesiologist','nurse','pharmacist','laboratory technologist','radiologic technologist','therapist','social worker','dietitian','paramedic','administrator','security','facilities worker'],notes:'Twenty operating departments are defined separately.'},
  {id:'clinic',sector:'Health and care',label:'Primary-care and urgent clinics',sites:12,typicalStaff:[14,22],roles:['family physician','nurse practitioner','nurse','medical assistant','laboratory technician','pharmacist','receptionist','cleaner']},
  {id:'dentist',sector:'Health and care',label:'Dental clinics',sites:10,typicalStaff:[7,11],roles:['dentist','dental hygienist','dental assistant','receptionist']},
  {id:'mental-health-clinic',sector:'Health and care',label:'Community mental-health clinics',sites:3,typicalStaff:[12,20],roles:['psychiatrist','psychologist','therapist','social worker','case manager','receptionist']},
  {id:'eldercare',sector:'Health and care',label:'Eldercare and assisted-living services',sites:6,typicalStaff:[18,42],roles:['care manager','registered nurse','care aide','activities coordinator','cook','cleaner','driver']},
  {id:'veterinary',sector:'Health and care',label:'Veterinary, pet-care and shelter sites',sites:8,typicalStaff:[6,12],roles:['veterinarian','veterinary technician','animal-care attendant','groomer','receptionist','adoption coordinator']},
  {id:'public-health',sector:'Health and care',label:'Public-health and prevention center',sites:1,typicalStaff:[45,70],roles:['public-health physician','epidemiologist','public-health nurse','environmental-health inspector','health educator','data analyst','administrator']},

  {id:'daycare',sector:'Education',label:'Daycare centers',sites:10,typicalStaff:[12,16],roles:['director','early-childhood teacher','care aide','cook','administrator','cleaner']},
  {id:'primary-school',sector:'Education',label:'Primary schools',sites:5,typicalStaff:[48,75],roles:['principal','teacher','teaching assistant','counselor','librarian','nurse','administrator','cafeteria worker','custodian','security']},
  {id:'middle-school',sector:'Education',label:'Middle schools',sites:3,typicalStaff:[55,85],roles:['principal','subject teacher','laboratory technician','counselor','librarian','coach','administrator','cafeteria worker','custodian','security']},
  {id:'high-school',sector:'Education',label:'High schools',sites:2,typicalStaff:[70,110],roles:['principal','subject teacher','laboratory technician','counselor','librarian','coach','administrator','cafeteria worker','custodian','security']},
  {id:'special-vocational',sector:'Education',label:'Special education and vocational campuses',sites:2,typicalStaff:[45,90],roles:['school director','special-education teacher','vocational instructor','therapist','counselor','teaching assistant','administrator','custodian']},
  {id:'after-school',sector:'Education',label:'Tutoring, arts, music and dance centers',sites:44,typicalStaff:[8,12],roles:['center director','subject tutor','art teacher','music teacher','dance teacher','course adviser','receptionist']},
  {id:'college-research',sector:'Education',label:'Community college and research campus',sites:1,typicalStaff:[300,550],roles:['president','professor','lecturer','research scientist','laboratory technician','librarian','student adviser','registrar','IT specialist','administrator','custodian','security']},

  {id:'police',sector:'Government and public safety',label:'Police precincts',sites:4,typicalStaff:[36,52],roles:['precinct commander','patrol officer','traffic officer','detective','dispatcher','records clerk','crime analyst','community liaison','custodian']},
  {id:'fire',sector:'Government and public safety',label:'Fire and rescue stations',sites:6,typicalStaff:[28,34],roles:['station commander','firefighter','driver/operator','fire inspector','paramedic','equipment technician']},
  {id:'ems',sector:'Government and public safety',label:'Emergency medical and dispatch center',sites:1,typicalStaff:[125,125],roles:['medical director','dispatcher','paramedic','EMT','ambulance driver','fleet technician','administrator']},
  {id:'justice',sector:'Government and public safety',label:'Court, detention and correctional sites',sites:3,typicalStaff:[50,190],roles:['judge','prosecutor','public defender','court clerk','bailiff','corrections officer','intake officer','medical worker','educator','administrator','facilities worker']},
  {id:'government',sector:'Government and public safety',label:'City hall, tax and regulatory offices',sites:4,typicalStaff:[120,260],roles:['city administrator','planner','permit examiner','tax auditor','accountant','procurement specialist','records officer','public-service representative','building inspector']},
  {id:'social-support',sector:'Government and public safety',label:'Family, disability, housing and food-support centers',sites:4,typicalStaff:[18,36],roles:['social-work supervisor','social worker','benefits specialist','housing case manager','disability-support worker','food-bank coordinator','counselor','administrator']},

  {id:'metro',sector:'Transport and logistics',label:'Metro network stations',sites:14,typicalStaff:[24,60],roles:['operations controller','train operator','station agent','security screener','fare inspector','signal technician','track worker','cleaner']},
  {id:'bus',sector:'Transport and logistics',label:'Bus depots and route operations',sites:3,typicalStaff:[80,180],roles:['bus driver','dispatcher','route supervisor','mechanic','cleaner','depot security']},
  {id:'taxi-ridehail',sector:'Transport and logistics',label:'Taxi and ride-hail fleets',sites:6,typicalStaff:[12,36],roles:['taxi driver','ride-hail driver','fleet dispatcher','mechanic','vehicle cleaner','customer-support agent']},
  {id:'rail-air',sector:'Transport and logistics',label:'Airport and high-speed rail terminals',sites:3,typicalStaff:[280,1800],roles:['operations controller','security screener','ground agent','baggage handler','station agent','maintenance technician','cleaner','retail worker']},
  {id:'logistics',sector:'Transport and logistics',label:'Logistics and light-industry parks',sites:8,typicalStaff:[180,250],roles:['operations manager','truck driver','warehouse associate','forklift operator','picker/packer','dispatcher','inventory controller','mechanic','security']},
  {id:'post',sector:'Transport and logistics',label:'Post and parcel centers',sites:6,typicalStaff:[8,12],roles:['branch supervisor','postal clerk','sorter','mail carrier','delivery driver']},
  {id:'marina',sector:'Transport and logistics',label:'Marina, charter and river-cruise operators',sites:3,typicalStaff:[10,24],roles:['marina manager','captain','deckhand','dock attendant','ticket agent','marine mechanic','guest-service attendant']},
  {id:'food-wholesale',sector:'Transport and logistics',label:'Food wholesale and cold-chain distribution centers',sites:3,typicalStaff:[45,90],roles:['warehouse manager','buyer','food-safety inspector','cold-store operator','picker','forklift operator','truck driver','inventory controller','refrigeration technician']},

  {id:'utilities',sector:'Utilities and environment',label:'Power, water and wastewater plants',sites:3,typicalStaff:[120,165],roles:['plant manager','control-room operator','engineer','laboratory analyst','network technician','maintenance mechanic','electrician','safety officer']},
  {id:'waste',sector:'Utilities and environment',label:'Waste, recycling and transfer facilities',sites:3,typicalStaff:[60,140],roles:['operations manager','collection driver','sanitation worker','sorter','incinerator operator','environmental technician','mechanic']},
  {id:'road-maintenance',sector:'Utilities and environment',label:'Road, bridge and streetscape depots',sites:10,typicalStaff:[60,80],roles:['civil engineer','road worker','signal technician','bridge inspector','sweeper driver','sprinkler-truck driver','electrician','landscape worker']},
  {id:'telecom-data',sector:'Utilities and environment',label:'Telecom exchange and municipal data center',sites:2,typicalStaff:[45,90],roles:['network engineer','data-center technician','cybersecurity analyst','field technician','facilities engineer','service-desk agent']},

  {id:'bank',sector:'Finance and professional services',label:'Bank branches',sites:10,typicalStaff:[10,15],roles:['branch manager','teller','personal banker','loan officer','compliance officer','security','cleaner']},
  {id:'professional-office',sector:'Finance and professional services',label:'Professional, technology and corporate offices',sites:24,typicalStaff:[60,300],roles:['executive','administrative assistant','accountant','auditor','lawyer','software engineer','product manager','designer','researcher','analyst','human-resources specialist','sales manager','facilities worker']},
  {id:'insurance-accounting-legal',sector:'Finance and professional services',label:'Neighborhood insurance, accounting and legal offices',sites:18,typicalStaff:[6,22],roles:['office manager','insurance adviser','claims adjuster','accountant','bookkeeper','lawyer','paralegal','receptionist']},
  {id:'media-creative',sector:'Finance and professional services',label:'News, media, advertising and production studios',sites:6,typicalStaff:[12,45],roles:['editor','reporter','producer','camera operator','audio engineer','graphic designer','copywriter','advertising planner','sales executive','studio technician']},

  {id:'property',sector:'Housing, construction and maintenance',label:'Property management, brokerage and development firms',sites:16,typicalStaff:[8,48],roles:['property manager','leasing agent','broker','appraiser','photographer','developer','architect','planner','cost engineer','sales adviser']},
  {id:'construction',sector:'Housing, construction and maintenance',label:'Active construction sites',sites:3,typicalStaff:[90,180],roles:['project manager','architect','civil engineer','safety officer','surveyor','electrician','plumber','carpenter','concrete worker','crane operator','truck driver']},
  {id:'repair',sector:'Housing, construction and maintenance',label:'Household and building repair services',sites:18,typicalStaff:[5,10],roles:['service manager','electrician','plumber','HVAC technician','appliance technician','carpenter','dispatcher']},
  {id:'parking-car-care',sector:'Housing, construction and maintenance',label:'Public garages, fuel, charging, repair and car-wash sites',sites:52,typicalStaff:[3,12],roles:['site manager','parking attendant','fuel attendant','charging technician','mechanic','service adviser','car-wash operator','security']},

  {id:'culture',sector:'Culture, recreation and tourism',label:'Museum, art museum, concert hall and opera house',sites:4,typicalStaff:[48,120],roles:['director','curator','conservator','educator','performer','stage technician','sound engineer','lighting technician','ticket agent','visitor-service agent','security','cleaner']},
  {id:'library',sector:'Culture, recreation and tourism',label:'Public libraries',sites:4,typicalStaff:[12,32],roles:['library director','librarian','archivist','children\'s programmer','digital-services specialist','circulation assistant','security','cleaner']},
  {id:'worship',sector:'Culture, recreation and tourism',label:'Religious and community worship spaces',sites:8,typicalStaff:[3,14],roles:['religious leader','administrator','musician','community-outreach worker','caretaker','security']},
  {id:'funeral',sector:'Culture, recreation and tourism',label:'Funeral, cremation and cemetery services',sites:3,typicalStaff:[10,28],roles:['funeral director','family-services adviser','embalmer','crematory operator','cemetery groundskeeper','driver','administrator']},
  {id:'cinema',sector:'Culture, recreation and tourism',label:'Cinemas',sites:4,typicalStaff:[24,38],roles:['cinema manager','projection technician','ticket agent','concession worker','usher','cleaner']},
  {id:'sports',sector:'Culture, recreation and tourism',label:'Gyms, pools, courts, stadium and recreation halls',sites:18,typicalStaff:[6,80],roles:['facility manager','coach','fitness instructor','lifeguard','groundskeeper','equipment technician','front-desk agent','cleaner']},
  {id:'amusement',sector:'Culture, recreation and tourism',label:'Amusement park and haunted attractions',sites:1,typicalStaff:[180,260],roles:['park manager','ride operator','ride mechanic','performer','game attendant','food-service worker','first-aid worker','security','cleaner','groundskeeper']},
  {id:'parks',sector:'Culture, recreation and tourism',label:'Public parks and riverfront recreation zones',sites:18,typicalStaff:[2,12],roles:['park supervisor','gardener','arborist','groundskeeper','ranger','maintenance worker']},
] as const;

export const WORKFORCE_SECTOR_TARGETS: readonly CountPlan[] = [
  {id:'food-hospitality',label:'Food and hospitality',count:2600},
  {id:'retail-personal',label:'Retail and personal services',count:2200},
  {id:'health-care',label:'Health and care',count:2100},
  {id:'education-childcare',label:'Education and childcare',count:1500},
  {id:'professional-finance-tech',label:'Professional, finance and technology',count:2700},
  {id:'transport-logistics',label:'Transport and logistics',count:3200},
  {id:'government-safety-justice',label:'Government, public safety and justice',count:1500},
  {id:'utilities-environment-maintenance',label:'Utilities, environment and maintenance',count:1200},
  {id:'construction-realty',label:'Construction and real estate',count:850},
  {id:'culture-recreation-tourism',label:'Culture, recreation and tourism',count:650},
  {id:'independent-gig-domestic',label:'Independent, gig and household work',count:1012},
] as const;

export function countPlanTotal(plan: readonly CountPlan[]) {
  return plan.reduce((total,item)=>total+item.count,0);
}

/** Convenience scaling only; regional infrastructure requires manual review. */
export function neighborhoodScale(count:number,population:number) {
  if(!Number.isFinite(population)||population<=0)throw new Error('Population must be positive');
  return Math.max(1,Math.round(count*population/CITY_STANDARD_POPULATION));
}
