export const RESIDENTIAL_TIERS = [
  'VALUE',
  'MID_MARKET',
  'MOVE_UP',
  'PREMIUM',
  'TROPHY',
] as const;

export type ResidentialTier = (typeof RESIDENTIAL_TIERS)[number];

export const RESIDENTIAL_TYPOLOGIES = [
  'STUDIO_TOWER',
  'MID_RISE_APARTMENT',
  'HIGH_RISE_APARTMENT',
  'SKY_DUPLEX_TOWER',
  'TOWNHOUSE',
  'SEMI_DETACHED',
  'DETACHED_VILLA',
] as const;

export type ResidentialTypology = (typeof RESIDENTIAL_TYPOLOGIES)[number];

export const NEIGHBORHOOD_DISTRICTS = [
  'CIVIC_EXCHANGE_CBD',
  'CANOPY_MARKET',
  'NORTH_RIVER',
  'SOUTH_RIVER',
  'AZURE_WATERFRONT',
  'WEST_HARBOR',
  'MILLIONAIRE_RIDGE',
  'EAST_GARDEN_SUBURBS',
  'SOUTH_ARCOLOGY',
  'MERIDIAN_CIVIC',
  'NORTH_HIGHLANDS',
] as const;

export type NeighborhoodDistrict = (typeof NEIGHBORHOOD_DISTRICTS)[number];
export type NeighborhoodStatus = 'PLAYABLE' | 'SHELL' | 'PLANNED';
export type AtlasNeighborhoodPoint = readonly [x: number, y: number];

export type WorldNeighborhood = {
  id: string;
  name: string;
  tier: ResidentialTier;
  typology: ResidentialTypology;
  district: NeighborhoodDistrict;
  /** Normalized position on the 20 × 30 regional atlas. */
  coordinates: AtlasNeighborhoodPoint;
  households: number;
  heightMeters: number;
  floors: number;
  commercialAnchor: string;
  metroStation: string;
  /** Real-world references are design vocabulary only, never in-world names. */
  inspiration: string;
  status: NeighborhoodStatus;
  shortDescription: string;
};

/**
 * Residential fabric for AmpliWorld's compressed regional atlas.
 * Names are original to the game; real places appear only as design references.
 */
export const WORLD_NEIGHBORHOODS = [
  {
    id: 'N-CBD-01',
    name: 'Aurelian Park Duplexes',
    tier: 'TROPHY',
    typology: 'SKY_DUPLEX_TOWER',
    district: 'CIVIC_EXCHANGE_CBD',
    coordinates: [10.55, 13.25],
    households: 96,
    heightMeters: 326,
    floors: 68,
    commercialAnchor: 'Grand Exchange & Aurelian Galleria',
    metroStation: 'MTR-C01 · Exchange Grand Avenue',
    inspiration:
      'Design vocabulary only: the one-residence-per-floor privacy, double-height living rooms, and duplex scale of Central Park towers in Manhattan.',
    status: 'PLAYABLE',
    shortDescription:
      'Four slender towers place one two-level home behind each private lift lobby, facing the central park axis.',
  },
  {
    id: 'N-CBD-02',
    name: 'Exchange Crown Residences',
    tier: 'TROPHY',
    typology: 'SKY_DUPLEX_TOWER',
    district: 'CIVIC_EXCHANGE_CBD',
    coordinates: [9.72, 12.55],
    households: 72,
    heightMeters: 284,
    floors: 60,
    commercialAnchor: 'Rotunda Luxury Arcade',
    metroStation: 'MTR-C02 · Rotunda South',
    inspiration:
      'Design vocabulary only: supertall homes along Central Park South, the Shanghai Lujiazui skyline, and private residents’ clubs.',
    status: 'PLAYABLE',
    shortDescription:
      'A quiet duplex-only tower above the exchange quarter, with winter gardens and a residents-only arrival court.',
  },
  {
    id: 'N-CBD-03',
    name: 'Forum Sky Gardens',
    tier: 'PREMIUM',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'CIVIC_EXCHANGE_CBD',
    coordinates: [11.25, 14.15],
    households: 540,
    heightMeters: 198,
    floors: 48,
    commercialAnchor: 'Forum Offices & Theatre Row',
    metroStation: 'MTR-C01 · Exchange Grand Avenue',
    inspiration:
      'Design vocabulary only: New York tower density, expansive landscaped grounds in central Beijing, and Shanghai-style high-rise club residences.',
    status: 'SHELL',
    shortDescription:
      'Three residential towers share an elevated garden while retaining separate lobbies and service circulation.',
  },
  {
    id: 'N-CBD-04',
    name: 'Ledger House',
    tier: 'MOVE_UP',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'CIVIC_EXCHANGE_CBD',
    coordinates: [8.92, 14.42],
    households: 680,
    heightMeters: 151,
    floors: 39,
    commercialAnchor: 'Ledger Street Offices',
    metroStation: 'MTR-C01 · Exchange Grand Avenue',
    inspiration:
      'Design vocabulary only: mixed-use districts at the edges of Beijing and New York business centers, organized around walkable commutes.',
    status: 'PLANNED',
    shortDescription:
      'Efficient family apartments place schools, offices and late-night retail within a ten-minute walk.',
  },
  {
    id: 'N-CAN-01',
    name: 'Canopy Courtyard',
    tier: 'MID_MARKET',
    typology: 'MID_RISE_APARTMENT',
    district: 'CANOPY_MARKET',
    coordinates: [7.92, 17.18],
    households: 860,
    heightMeters: 29,
    floors: 8,
    commercialAnchor: 'Canopy Market Hall',
    metroStation: 'MTR-F01 · Canopy Market',
    inspiration:
      'Design vocabulary only: mature Beijing neighborhood retail, shaded courtyards, and fresh-food markets forming one everyday life circle.',
    status: 'PLAYABLE',
    shortDescription:
      'Eight-storey courtyard blocks wrap groceries, childcare and shaded community gardens.',
  },
  {
    id: 'N-CAN-02',
    name: 'Lantern Lane Homes',
    tier: 'VALUE',
    typology: 'MID_RISE_APARTMENT',
    district: 'CANOPY_MARKET',
    coordinates: [7.05, 18.08],
    households: 1_320,
    heightMeters: 36,
    floors: 11,
    commercialAnchor: 'Lantern Food Street',
    metroStation: 'MTR-F01 · Canopy Market',
    inspiration:
      'Design vocabulary only: compact homes around Beijing metro stations, animated by high-frequency dining and neighborhood retail.',
    status: 'SHELL',
    shortDescription:
      'Compact homes above a dense food street give service workers a direct metro commute.',
  },
  {
    id: 'N-CAN-03',
    name: 'Verdant Pool Residences',
    tier: 'MOVE_UP',
    typology: 'MID_RISE_APARTMENT',
    district: 'CANOPY_MARKET',
    coordinates: [8.85, 18.45],
    households: 620,
    heightMeters: 24,
    floors: 6,
    commercialAnchor: 'Verdant Grocer & Wellness Square',
    metroStation: 'MTR-F01 · Canopy Market',
    inspiration:
      'Design vocabulary only: the grand landscapes, waterside clubhouse, and large upgrade homes associated with Chateau Star River, Beijing.',
    status: 'PLAYABLE',
    shortDescription:
      'Six-storey family buildings ring a generous pool garden beside fresh-food retail and fitness facilities.',
  },
  {
    id: 'N-RIV-01',
    name: 'Northbank Glassworks',
    tier: 'MID_MARKET',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'NORTH_RIVER',
    coordinates: [12.35, 17.1],
    households: 1_180,
    heightMeters: 112,
    floors: 31,
    commercialAnchor: 'Glassworks Creative Quarter',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: Chicago riverfront regeneration, Boston waterfront walks, and industrial renewal along Shanghai’s Suzhou Creek.',
    status: 'SHELL',
    shortDescription:
      'Brick podiums and glass residential towers open onto a continuous cycling and dining promenade.',
  },
  {
    id: 'N-RIV-02',
    name: 'Willow Bend Gardens',
    tier: 'MOVE_UP',
    typology: 'MID_RISE_APARTMENT',
    district: 'NORTH_RIVER',
    coordinates: [13.28, 18.02],
    households: 510,
    heightMeters: 32,
    floors: 9,
    commercialAnchor: 'Willow Bend Family Plaza',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: the pedestrian scale of Shanghai river-bend communities, layered gardens in Beijing upgrade housing, and waterside terraces.',
    status: 'PLANNED',
    shortDescription:
      'Family apartments step down toward wetlands, playgrounds and a neighborhood-scale shopping plaza.',
  },
  {
    id: 'N-RIV-03',
    name: 'Quayside Foundry Lofts',
    tier: 'VALUE',
    typology: 'STUDIO_TOWER',
    district: 'SOUTH_RIVER',
    coordinates: [11.75, 15.72],
    households: 2_400,
    heightMeters: 126,
    floors: 42,
    commercialAnchor: 'South Quay Night Market',
    metroStation: 'MTR-C01 · Exchange Grand Avenue',
    inspiration:
      'Design vocabulary only: Chicago warehouse riverfronts, Shanghai Suzhou Creek creative districts, and high-density apartments for young residents.',
    status: 'PLANNED',
    shortDescription:
      'Small lofts share kitchens, work rooms and rooftop courts above an adaptive-reuse market district.',
  },
  {
    id: 'N-RIV-04',
    name: 'Embankment House',
    tier: 'PREMIUM',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'SOUTH_RIVER',
    coordinates: [10.45, 16.1],
    households: 360,
    heightMeters: 174,
    floors: 44,
    commercialAnchor: 'Embankment Arts Centre',
    metroStation: 'MTR-C01 · Exchange Grand Avenue',
    inspiration:
      'Design vocabulary only: Charles River-facing homes in Boston, large-format Shanghai waterfront apartments, and New York tower proportions.',
    status: 'SHELL',
    shortDescription:
      'Broad river-facing homes sit above galleries and a floodable civic terrace.',
  },
  {
    id: 'N-AZU-01',
    name: 'Azure Crescent',
    tier: 'PREMIUM',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'AZURE_WATERFRONT',
    coordinates: [4.28, 8.3],
    households: 480,
    heightMeters: 137,
    floors: 35,
    commercialAnchor: 'Azure Yacht Hotel & Promenade',
    metroStation: 'MTR-W01 · Azure Waterfront',
    inspiration:
      'Design vocabulary only: the resort hotels, yacht marinas, and coastal residential sequences of Yalong Bay and Haitang Bay in Sanya.',
    status: 'PLAYABLE',
    shortDescription:
      'Curved sea-view towers share resort pools, a yacht hotel and a public waterfront boardwalk.',
  },
  {
    id: 'N-AZU-02',
    name: 'Tidecourt Terraces',
    tier: 'MOVE_UP',
    typology: 'TOWNHOUSE',
    district: 'AZURE_WATERFRONT',
    coordinates: [3.5, 9.42],
    households: 168,
    heightMeters: 14,
    floors: 4,
    commercialAnchor: 'Tidecourt Marina Village',
    metroStation: 'MTR-W01 · Azure Waterfront',
    inspiration:
      'Design vocabulary only: Sanya Bay waterfront retail, low-rise vacation homes, and walkable small-craft docks.',
    status: 'SHELL',
    shortDescription:
      'Four-storey townhomes place family terraces between the marina village and a sheltered swimming cove.',
  },
  {
    id: 'N-AZU-03',
    name: 'Pearl Cape Reserve',
    tier: 'TROPHY',
    typology: 'DETACHED_VILLA',
    district: 'AZURE_WATERFRONT',
    coordinates: [2.45, 7.2],
    households: 38,
    heightMeters: 18,
    floors: 3,
    commercialAnchor: 'Pearl Cape Yacht Club',
    metroStation: 'MTR-W01 · Azure Waterfront',
    inspiration:
      'Design vocabulary only: detached resort homes, private berths, and tropical gardens in Sanya’s high-end coves.',
    status: 'PLANNED',
    shortDescription:
      'Large detached homes occupy a guarded cape, each with layered gardens and optional private berth access.',
  },
  {
    id: 'N-HBR-01',
    name: 'Harborworkers Court',
    tier: 'VALUE',
    typology: 'MID_RISE_APARTMENT',
    district: 'WEST_HARBOR',
    coordinates: [5.15, 11.65],
    households: 1_460,
    heightMeters: 40,
    floors: 12,
    commercialAnchor: 'West Harbor Provision Market',
    metroStation: 'MTR-W01 · Azure Waterfront',
    inspiration:
      'Design vocabulary only: affordable workforce housing around major ports and Beijing neighborhoods built around rail connections.',
    status: 'PLANNED',
    shortDescription:
      'Durable courtyard blocks house port, hotel and ferry workers beside schools and daily retail.',
  },
  {
    id: 'N-HBR-02',
    name: 'Breakwater Studios',
    tier: 'MID_MARKET',
    typology: 'STUDIO_TOWER',
    district: 'WEST_HARBOR',
    coordinates: [4.72, 10.55],
    households: 1_760,
    heightMeters: 104,
    floors: 34,
    commercialAnchor: 'Breakwater Ferry Terminal',
    metroStation: 'MTR-W01 · Azure Waterfront',
    inspiration:
      'Design vocabulary only: the jobs-housing pattern of the Port of Los Angeles, Sanya Bay hospitality, and compact homes for young workers.',
    status: 'PLANNED',
    shortDescription:
      'Transit-oriented studios rise over a ferry concourse, food court and round-the-clock services.',
  },
  {
    id: 'N-RDG-01',
    name: 'Cedar Gate Rows',
    tier: 'MOVE_UP',
    typology: 'TOWNHOUSE',
    district: 'MILLIONAIRE_RIDGE',
    coordinates: [15.25, 13.4],
    households: 226,
    heightMeters: 13,
    floors: 3,
    commercialAnchor: 'Ridge Gate Club Street',
    metroStation: 'MTR-H01 · Ridge Gate',
    inspiration:
      'Design vocabulary only: the low-density courtyards, townhouse scale, and ceremonial arrival sequence of Beijing Runyuan and Maoyuan Yunji.',
    status: 'PLAYABLE',
    shortDescription:
      'Terraced rows climb a wooded slope, giving every home a small courtyard and distant skyline view.',
  },
  {
    id: 'N-RDG-02',
    name: 'Twin Oak Commons',
    tier: 'PREMIUM',
    typology: 'SEMI_DETACHED',
    district: 'MILLIONAIRE_RIDGE',
    coordinates: [16.18, 14.65],
    households: 112,
    heightMeters: 15,
    floors: 3,
    commercialAnchor: 'Twin Oak Village Centre',
    metroStation: 'MTR-H01 · Ridge Gate',
    inspiration:
      'Design vocabulary only: the semi-detached homes, tree-lined roads, and neighborhood clubhouse language of Beijing Beichen Red Oak Villa.',
    status: 'SHELL',
    shortDescription:
      'Paired villas share deep landscaped setbacks while preserving private entries and garden rooms.',
  },
  {
    id: 'N-RDG-03',
    name: 'Observatory Grove',
    tier: 'TROPHY',
    typology: 'DETACHED_VILLA',
    district: 'MILLIONAIRE_RIDGE',
    coordinates: [17.05, 16.05],
    households: 64,
    heightMeters: 17,
    floors: 3,
    commercialAnchor: 'Observatory Ridge Club',
    metroStation: 'MTR-H01 · Ridge Gate',
    inspiration:
      'Design vocabulary only: the detached-only planning, mature landscaping, and low site coverage of Beijing Purple Jade Villas and Runze Yufu.',
    status: 'PLAYABLE',
    shortDescription:
      'Detached residences sit on large forested plots behind a landscaped ridge drive and resident gatehouse.',
  },
  {
    id: 'N-RDG-04',
    name: 'Cloudpine Estate',
    tier: 'PREMIUM',
    typology: 'DETACHED_VILLA',
    district: 'MILLIONAIRE_RIDGE',
    coordinates: [16.35, 17.35],
    households: 88,
    heightMeters: 16,
    floors: 3,
    commercialAnchor: 'Cloudpine Trail Lodge',
    metroStation: 'MTR-H01 · Ridge Gate',
    inspiration:
      'Design vocabulary only: Los Angeles hillside residential roads, Beijing low-density villa landscapes, and sightline control on natural slopes.',
    status: 'PLANNED',
    shortDescription:
      'Contemporary villas follow the contours instead of flattening them, linked by trails to a small village lodge.',
  },
  {
    id: 'N-EAS-01',
    name: 'Eastgarden Family Park',
    tier: 'MID_MARKET',
    typology: 'MID_RISE_APARTMENT',
    district: 'EAST_GARDEN_SUBURBS',
    coordinates: [15.5, 20.1],
    households: 1_260,
    heightMeters: 53,
    floors: 16,
    commercialAnchor: 'Eastgarden Regional Mall',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: large Beijing residential compounds organized around regional malls, schools, and rail stations.',
    status: 'PLANNED',
    shortDescription:
      'Family towers and mid-rises form four school-centered blocks around a regional shopping mall.',
  },
  {
    id: 'N-EAS-02',
    name: 'Juniper Courts',
    tier: 'VALUE',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'EAST_GARDEN_SUBURBS',
    coordinates: [16.6, 21.22],
    households: 2_880,
    heightMeters: 88,
    floors: 29,
    commercialAnchor: 'Juniper Community Centre',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: Beijing suburban high-density housing, convenience retail, and 15-minute life circles integrated with bus and metro interchange.',
    status: 'PLANNED',
    shortDescription:
      'Affordable high-rises share sports courts, daycare and an all-weather transit concourse.',
  },
  {
    id: 'N-EAS-03',
    name: 'Magnolia Park Residences',
    tier: 'MOVE_UP',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'EAST_GARDEN_SUBURBS',
    coordinates: [14.28, 21.45],
    households: 930,
    heightMeters: 103,
    floors: 27,
    commercialAnchor: 'Magnolia Lifestyle Centre',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: the landscaped axis, clubhouse, pool, and wide-frontage upgrade homes associated with Chateau Star River, Beijing.',
    status: 'SHELL',
    shortDescription:
      'Large family homes face a layered water garden, with education and lifestyle retail at the neighborhood edge.',
  },
  {
    id: 'N-SOU-01',
    name: 'Southline Starter Towers',
    tier: 'VALUE',
    typology: 'STUDIO_TOWER',
    district: 'SOUTH_ARCOLOGY',
    coordinates: [9.65, 24.55],
    households: 10_000,
    heightMeters: 172,
    floors: 50,
    commercialAnchor: 'Outer Ring Employment Hall',
    metroStation: 'MTR-S01 · Outer Ring Central',
    inspiration:
      'Design vocabulary only: Beijing outer-suburban rail new towns, high-density affordable housing, and major employment interchange nodes.',
    status: 'PLAYABLE',
    shortDescription:
      'The high-density starting district concentrates compact studios above essential services and transit.',
  },
  {
    id: 'N-SOU-02',
    name: 'Metro Orchard Homes',
    tier: 'MID_MARKET',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'SOUTH_ARCOLOGY',
    coordinates: [10.85, 25.25],
    households: 2_160,
    heightMeters: 94,
    floors: 30,
    commercialAnchor: 'Orchard Transit Mall',
    metroStation: 'MTR-S01 · Outer Ring Central',
    inspiration:
      'Design vocabulary only: Beijing metro entrances, sunken plazas, interchange malls, and residential clusters planned as one system.',
    status: 'SHELL',
    shortDescription:
      'Transit-linked family towers sit above a practical mall, community clinic and public sports deck.',
  },
  {
    id: 'N-SOU-03',
    name: 'Fieldstone Mews',
    tier: 'MID_MARKET',
    typology: 'TOWNHOUSE',
    district: 'SOUTH_ARCOLOGY',
    coordinates: [12.05, 25.9],
    households: 310,
    heightMeters: 12,
    floors: 3,
    commercialAnchor: 'Fieldstone Outlet Village',
    metroStation: 'MTR-S01 · Outer Ring Central',
    inspiration:
      'Design vocabulary only: a compressed hybrid of Los Angeles low-density suburban streets and Beijing rail-new-town commercial amenities.',
    status: 'PLANNED',
    shortDescription:
      'Attainable townhomes cluster around playing fields, an outlet street and an express bus loop.',
  },
  {
    id: 'N-MER-01',
    name: 'Meridian Resident Quarter',
    tier: 'MID_MARKET',
    typology: 'HIGH_RISE_APARTMENT',
    district: 'MERIDIAN_CIVIC',
    coordinates: [13.05, 20.5],
    households: 1_440,
    heightMeters: 109,
    floors: 34,
    commercialAnchor: 'Meridian Health Campus',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: healthcare-worker homes, neighborhood retail, and transit networks around large Beijing hospital campuses.',
    status: 'SHELL',
    shortDescription:
      'Homes for medical and civic workers share direct walking routes to the hospital, academy and metro.',
  },
  {
    id: 'N-MER-02',
    name: 'Academy Grove',
    tier: 'MOVE_UP',
    typology: 'MID_RISE_APARTMENT',
    district: 'MERIDIAN_CIVIC',
    coordinates: [12.2, 21.45],
    households: 520,
    heightMeters: 27,
    floors: 7,
    commercialAnchor: 'Meridian Academy Walk',
    metroStation: 'MTR-M01 · Meridian Medical',
    inspiration:
      'Design vocabulary only: low- and mid-rise homes, quiet tree-lined streets, and family amenities in Beijing academic districts.',
    status: 'PLANNED',
    shortDescription:
      'Calm brick-and-timber buildings frame an academic green with libraries, cafés and after-school facilities.',
  },
  {
    id: 'N-NOR-01',
    name: 'Reservoir View Commons',
    tier: 'VALUE',
    typology: 'MID_RISE_APARTMENT',
    district: 'NORTH_HIGHLANDS',
    coordinates: [7.25, 25.2],
    households: 1_080,
    heightMeters: 44,
    floors: 13,
    commercialAnchor: 'North Grid Service Centre',
    metroStation: 'MTR-E01 · North Grid Research',
    inspiration:
      'Design vocabulary only: staff communities around northern Beijing industrial parks, landscaped buffers, and regional rail connections.',
    status: 'PLANNED',
    shortDescription:
      'Practical apartments support energy-campus workers while preserving a green buffer around the reservoir.',
  },
  {
    id: 'N-NOR-02',
    name: 'Highland Twin Villas',
    tier: 'MOVE_UP',
    typology: 'SEMI_DETACHED',
    district: 'NORTH_HIGHLANDS',
    coordinates: [6.25, 26.45],
    households: 144,
    heightMeters: 14,
    floors: 3,
    commercialAnchor: 'Highland Village Market',
    metroStation: 'MTR-E01 · North Grid Research',
    inspiration:
      'Design vocabulary only: northern Beijing semi-detached communities, Los Angeles foothill streets, and regional town centers.',
    status: 'PLANNED',
    shortDescription:
      'Paired hillside homes form a quieter transition between the research campus and open highland trails.',
  },
  {
    id: 'N-NOR-03',
    name: 'Silverfir Sanctuary',
    tier: 'PREMIUM',
    typology: 'DETACHED_VILLA',
    district: 'NORTH_HIGHLANDS',
    coordinates: [5.22, 27.52],
    households: 52,
    heightMeters: 15,
    floors: 3,
    commercialAnchor: 'Silverfir Country Lodge',
    metroStation: 'MTR-E01 · North Grid Research',
    inspiration:
      'Design vocabulary only: the detached-only landscape density of Beijing Runze Yufu and the open views of Los Angeles hillside homes.',
    status: 'PLANNED',
    shortDescription:
      'A low-density forest community uses long setbacks and shared conservation land to protect privacy and views.',
  },
] as const satisfies readonly WorldNeighborhood[];

export type WorldNeighborhoodId = (typeof WORLD_NEIGHBORHOODS)[number]['id'];

function summarizeBy<K extends string>(
  keys: readonly K[],
  select: (neighborhood: WorldNeighborhood) => K,
): Readonly<Record<K, number>> {
  const summary = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    K,
    number
  >;

  for (const neighborhood of WORLD_NEIGHBORHOODS) {
    summary[select(neighborhood)] += 1;
  }

  return Object.freeze(summary);
}

const totalHouseholds = WORLD_NEIGHBORHOODS.reduce(
  (total, neighborhood) => total + neighborhood.households,
  0,
);

export const WORLD_NEIGHBORHOOD_STATS = Object.freeze({
  totalNeighborhoods: WORLD_NEIGHBORHOODS.length,
  totalHouseholds,
  averageHeightMeters: Math.round(
    WORLD_NEIGHBORHOODS.reduce(
      (total, neighborhood) => total + neighborhood.heightMeters,
      0,
    ) / WORLD_NEIGHBORHOODS.length,
  ),
  averageFloors: Math.round(
    WORLD_NEIGHBORHOODS.reduce(
      (total, neighborhood) => total + neighborhood.floors,
      0,
    ) / WORLD_NEIGHBORHOODS.length,
  ),
  byTier: summarizeBy(RESIDENTIAL_TIERS, (neighborhood) => neighborhood.tier),
  byTypology: summarizeBy(
    RESIDENTIAL_TYPOLOGIES,
    (neighborhood) => neighborhood.typology,
  ),
  byDistrict: summarizeBy(
    NEIGHBORHOOD_DISTRICTS,
    (neighborhood) => neighborhood.district,
  ),
  byStatus: summarizeBy(
    ['PLAYABLE', 'SHELL', 'PLANNED'] as const,
    (neighborhood) => neighborhood.status,
  ),
});

export function getNeighborhoodById(id: string) {
  return WORLD_NEIGHBORHOODS.find((neighborhood) => neighborhood.id === id);
}

export function getNeighborhoodsByTier(tier: ResidentialTier) {
  return WORLD_NEIGHBORHOODS.filter(
    (neighborhood) => neighborhood.tier === tier,
  );
}

export function getNeighborhoodsByTypology(typology: ResidentialTypology) {
  return WORLD_NEIGHBORHOODS.filter(
    (neighborhood) => neighborhood.typology === typology,
  );
}

export function getNeighborhoodsByDistrict(district: NeighborhoodDistrict) {
  return WORLD_NEIGHBORHOODS.filter(
    (neighborhood) => neighborhood.district === district,
  );
}

export function getNeighborhoodsByStatus(status: NeighborhoodStatus) {
  return WORLD_NEIGHBORHOODS.filter(
    (neighborhood) => neighborhood.status === status,
  );
}

export function getNeighborhoodsByMetroStation(metroStation: string) {
  return WORLD_NEIGHBORHOODS.filter(
    (neighborhood) => neighborhood.metroStation === metroStation,
  );
}

export function getNeighborhoodsNearAtlasPoint(
  [x, y]: AtlasNeighborhoodPoint,
  radius: number,
) {
  const safeRadius = Math.max(0, radius);

  return WORLD_NEIGHBORHOODS.map((neighborhood) => ({
    neighborhood,
    distance: Math.hypot(
      neighborhood.coordinates[0] - x,
      neighborhood.coordinates[1] - y,
    ),
  }))
    .filter(({ distance }) => distance <= safeRadius)
    .sort((a, b) => a.distance - b.distance);
}

export function getNearestNeighborhood(point: AtlasNeighborhoodPoint) {
  return getNeighborhoodsNearAtlasPoint(point, Math.hypot(20, 30))[0]
    ?.neighborhood;
}

export function getHouseholdCapacityByDistrict(district: NeighborhoodDistrict) {
  return getNeighborhoodsByDistrict(district).reduce(
    (total, neighborhood) => total + neighborhood.households,
    0,
  );
}
