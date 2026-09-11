export type WorldPoint = readonly [x: number, z: number];

export type WorldSectorId =
  | 'STARTER_OUTER_RING'
  | 'CBD_CORE'
  | 'GRAND_RIVER'
  | 'NORTH_RIVER'
  | 'SOUTH_RIVER'
  | 'WATERFRONT_MARINA'
  | 'AZURE_RESORT_BELT'
  | 'WEST_HARBOR'
  | 'CROWN_RESIDENTIAL'
  | 'MIDSLOPE_VILLAS'
  | 'EAST_GARDEN_CENTRES'
  | 'CIVIC_MEDICAL'
  | 'ENERGY_RESEARCH'
  | 'NORTH_HIGHLANDS'
  | 'FOOD_RETAIL';

export type WorldSectorStatus = 'PLAYABLE' | 'SHELL' | 'PLANNED';

export type WorldSector = {
  id: WorldSectorId;
  name: string;
  center: WorldPoint;
  bounds: readonly [minX: number, maxX: number, minZ: number, maxZ: number];
  streamRadius: number;
  detailRadius: number;
  status: WorldSectorStatus;
  description: string;
  /** Optional planning metadata keeps the original sector contract compatible. */
  role?: 'CORE' | 'RIVER' | 'CENTRE' | 'RESIDENTIAL' | 'EMPLOYMENT' | 'RESORT' | 'INFRASTRUCTURE';
  anchors?: readonly string[];
};

export type MetroEntrancePlan = {
  code: 'A' | 'B' | 'C' | 'D';
  corner: 'NORTHWEST' | 'NORTHEAST' | 'SOUTHEAST' | 'SOUTHWEST';
  form: 'GLASS_CANOPY' | 'STONE_PAVILION' | 'PARK_GATE' | 'INTEGRATED_PODIUM';
  accessible: boolean;
  connectsTo: string;
};

export type MetroHub = {
  id: string;
  name: string;
  sector: WorldSectorId;
  position: WorldPoint;
  lines: readonly string[];
  entrances?: readonly MetroEntrancePlan[];
  catchmentRadiusMeters?: number;
};

export type RoadConnector = {
  id: string;
  name: string;
  class: 'AXIS' | 'RING' | 'TRUNK' | 'ARTERIAL' | 'SCENIC';
  width: number;
  points: readonly WorldPoint[];
  modes?: readonly ('WALK' | 'CYCLE' | 'BUS' | 'CAR')[];
};

export type RiverReach = {
  id: string;
  name: string;
  character: 'GARDEN' | 'CIVIC' | 'WORKING_HARBOR' | 'ESTUARY';
  start: WorldPoint;
  end: WorldPoint;
  publicEdges: readonly ('NORTH' | 'SOUTH' | 'EAST' | 'WEST')[];
};

export type RiverCorridor = {
  id: string;
  name: string;
  centerline: readonly WorldPoint[];
  widthMeters: readonly [minimum: number, maximum: number];
  navigable: boolean;
  flowDirection: 'EAST_TO_SOUTHWEST';
  reaches: readonly RiverReach[];
};

export type RiverBridge = {
  id: string;
  name: string;
  class: 'BOULEVARD' | 'ROAD' | 'METRO' | 'PEDESTRIAN';
  position: WorldPoint;
  rotationDegrees: number;
  width: number;
  lanes: number;
  modes: readonly ('WALK' | 'CYCLE' | 'METRO' | 'BUS' | 'CAR')[];
  status: WorldSectorStatus;
};

export type UrbanCenter = {
  id: string;
  name: string;
  sector: WorldSectorId;
  position: WorldPoint;
  scale: 'METROPOLITAN' | 'SUBCENTER' | 'REGIONAL' | 'DISTRICT' | 'NEIGHBORHOOD';
  catchmentRadiusKm: number;
  anchors: readonly string[];
  housingTiers: readonly ('VALUE' | 'MID_MARKET' | 'MOVE_UP' | 'PREMIUM' | 'TROPHY')[];
};

export type ResortBay = {
  id: string;
  name: string;
  center: WorldPoint;
  coast: readonly WorldPoint[];
  hotelRooms: number;
  publicBerths: number;
  largeYachtBerths: number;
  anchors: readonly string[];
  status: WorldSectorStatus;
};

/**
 * The rendered core is intentionally compressed like a large open-world game.
 * Its 160 × 160 engine units communicate a 6.4 × 6.4 km walkable city core,
 * while the atlas describes a much larger 320 × 240 km regional economy.
 * North is positive z. The coast and river mouth sit to the southwest.
 */
export const PLAYABLE_CORE_KM = 6.4;
export const REPRESENTED_REGION_WIDTH_KM = 320;
export const REPRESENTED_REGION_HEIGHT_KM = 240;
export const REPRESENTED_REGION_KM = REPRESENTED_REGION_WIDTH_KM;
export const WORLD_CORE_UNITS = 160;
export const METERS_PER_WORLD_UNIT = PLAYABLE_CORE_KM * 1000 / WORLD_CORE_UNITS;

export const WORLD_PLANNING_PRINCIPLES = {
  structure: 'TWO_AXES_TWO_RINGS_POLYCENTRIC',
  compression: 'CONTINUOUS_OPEN_WORLD',
  housingRule: 'EVERY_MAJOR_CENTRE_MIXES_MULTIPLE_HOUSING_TIERS',
  waterfrontRule: 'BOTH_RIVERBANKS_REMAIN_PUBLIC_AND_CONTINUOUS',
  transitRule: 'METRO_ENTRANCES_REPLACE_MAP_TELEPORTATION',
} as const;

/**
 * A continuous metropolitan river: an urban canyon through the core, a softer
 * park edge in the east, then a working waterfront and resort estuary toward
 * the southwest coast. The line is deliberately sinuous rather than a canal.
 */
export const GRAND_RIVER_CORRIDOR: RiverCorridor = {
  id: 'RIV-GRAND-01',
  name: 'Grand River',
  centerline: [
    [80, 29],
    [60, 34],
    [34, 40],
    [0, 38],
    [-29, 44],
    [-51, 38],
    [-66, 25],
    [-72, 7],
    [-70, -17],
    [-63, -58],
  ],
  widthMeters: [70, 220],
  navigable: true,
  flowDirection: 'EAST_TO_SOUTHWEST',
  reaches: [
    {
      id: 'RCH-EAST',
      name: 'East Garden Reach',
      character: 'GARDEN',
      start: [80, 29],
      end: [34, 40],
      publicEdges: ['NORTH', 'SOUTH'],
    },
    {
      id: 'RCH-CIVIC',
      name: 'Civic Exchange Reach',
      character: 'CIVIC',
      start: [34, 40],
      end: [-29, 44],
      publicEdges: ['NORTH', 'SOUTH'],
    },
    {
      id: 'RCH-HARBOR',
      name: 'West Harbor Reach',
      character: 'WORKING_HARBOR',
      start: [-29, 44],
      end: [-72, 7],
      publicEdges: ['EAST', 'WEST'],
    },
    {
      id: 'RCH-ESTUARY',
      name: 'Azure Estuary',
      character: 'ESTUARY',
      start: [-72, 7],
      end: [-63, -58],
      publicEdges: ['EAST', 'WEST'],
    },
  ],
};

export const RIVER_BRIDGES: readonly RiverBridge[] = [
  { id: 'BR-W01', name: 'Harbor Gate Bridge', class: 'ROAD', position: [-58, 33], rotationDegrees: -34, width: 10.5, lanes: 4, modes: ['WALK', 'CYCLE', 'BUS', 'CAR'], status: 'SHELL' },
  { id: 'BR-P01', name: 'Foundry Walk', class: 'PEDESTRIAN', position: [-45, 40], rotationDegrees: -18, width: 4.5, lanes: 0, modes: ['WALK', 'CYCLE'], status: 'PLANNED' },
  { id: 'BR-R01', name: 'West Inner Ring Bridge', class: 'ROAD', position: [-29, 44], rotationDegrees: 0, width: 13, lanes: 6, modes: ['WALK', 'CYCLE', 'BUS', 'CAR'], status: 'PLAYABLE' },
  { id: 'BR-M01', name: 'Academy Metro Bridge', class: 'METRO', position: [-16, 42], rotationDegrees: 0, width: 7, lanes: 0, modes: ['METRO'], status: 'SHELL' },
  { id: 'BR-A01', name: 'Grand Axis Bridge', class: 'BOULEVARD', position: [0, 38], rotationDegrees: 0, width: 31, lanes: 10, modes: ['WALK', 'CYCLE', 'BUS', 'CAR'], status: 'PLAYABLE' },
  { id: 'BR-P02', name: 'Exchange Garden Footbridge', class: 'PEDESTRIAN', position: [17, 39], rotationDegrees: 3, width: 5, lanes: 0, modes: ['WALK', 'CYCLE'], status: 'SHELL' },
  { id: 'BR-R02', name: 'East Inner Ring Bridge', class: 'ROAD', position: [29, 40], rotationDegrees: 5, width: 13, lanes: 6, modes: ['WALK', 'CYCLE', 'BUS', 'CAR'], status: 'PLAYABLE' },
  { id: 'BR-M02', name: 'Willow Light Rail Bridge', class: 'METRO', position: [45, 37], rotationDegrees: 11, width: 7, lanes: 0, modes: ['METRO'], status: 'PLANNED' },
  { id: 'BR-E01', name: 'Eastgarden Bridge', class: 'ROAD', position: [59, 34], rotationDegrees: 14, width: 12, lanes: 6, modes: ['WALK', 'CYCLE', 'BUS', 'CAR'], status: 'SHELL' },
  { id: 'BR-P03', name: 'Wetland Ribbon Bridge', class: 'PEDESTRIAN', position: [72, 31], rotationDegrees: 14, width: 4, lanes: 0, modes: ['WALK', 'CYCLE'], status: 'PLANNED' },
] as const;

export const WORLD_SECTORS: readonly WorldSector[] = [
  {
    id: 'CBD_CORE',
    name: 'Civic Exchange Core',
    center: [0, -7],
    bounds: [-43, 43, -58, 48],
    streamRadius: 92,
    detailRadius: 56,
    status: 'PLAYABLE',
    role: 'CORE',
    anchors: ['Grand Exchange', 'Aurelian Park', 'Forum cultural axis', 'duplex skyline'],
    description: 'A New York-scale skyline organized by Beijing-like civic axes, a grand avenue and vertical trophy homes.',
  },
  {
    id: 'GRAND_RIVER',
    name: 'Grand River Corridor',
    center: [-5, 37],
    bounds: [-75, 80, -60, 52],
    streamRadius: 118,
    detailRadius: 54,
    status: 'PLAYABLE',
    role: 'RIVER',
    anchors: ['continuous riverwalk', 'ten bridges', 'ferry landings', 'floodable parks'],
    description: 'A navigable metropolitan river joins garden suburbs, the exchange core, the working harbor and the sea.',
  },
  {
    id: 'NORTH_RIVER',
    name: 'Northbank River Rooms',
    center: [10, 52],
    bounds: [-42, 68, 40, 68],
    streamRadius: 75,
    detailRadius: 42,
    status: 'SHELL',
    role: 'RESIDENTIAL',
    anchors: ['Glassworks quarter', 'Willow Bend', 'cycle promenade', 'family parks'],
    description: 'A chain of mixed-income river neighborhoods, creative reuse blocks and public waterfront rooms.',
  },
  {
    id: 'SOUTH_RIVER',
    name: 'Southbank Exchange',
    center: [2, 28],
    bounds: [-45, 48, 14, 40],
    streamRadius: 72,
    detailRadius: 42,
    status: 'SHELL',
    role: 'RESIDENTIAL',
    anchors: ['Foundry lofts', 'Embankment arts centre', 'night market', 'river terraces'],
    description: 'Dense homes, adaptive reuse, food streets and cultural terraces face the civic reach of the river.',
  },
  {
    id: 'WATERFRONT_MARINA',
    name: 'Azure Waterfront',
    center: [-61, -42],
    bounds: [-80, -42, -76, 4],
    streamRadius: 82,
    detailRadius: 48,
    status: 'PLAYABLE',
    role: 'RESORT',
    anchors: ['public coast', 'yacht marina', 'ferry pier', 'seaside promenade'],
    description: 'The public coast combines daily ferries, fishing craft, sailing boats, yacht hotels and a continuous promenade.',
  },
  {
    id: 'AZURE_RESORT_BELT',
    name: 'Azure Bay Resort Belt',
    center: [-61, -65],
    bounds: [-80, -34, -80, -43],
    streamRadius: 74,
    detailRadius: 45,
    status: 'SHELL',
    role: 'RESORT',
    anchors: ['three resort bays', 'yacht hotels', 'public beaches', 'marine retail'],
    description: 'Three distinct bays layer public beaches, resort hotels, yacht clubs, residences and marine services.',
  },
  {
    id: 'WEST_HARBOR',
    name: 'West Harbor & River Port',
    center: [-66, 22],
    bounds: [-80, -43, -28, 48],
    streamRadius: 78,
    detailRadius: 42,
    status: 'PLANNED',
    role: 'EMPLOYMENT',
    anchors: ['working docks', 'ferry terminal', 'maker halls', 'harborworker homes'],
    description: 'A working river port keeps logistics, ferries, repair yards and attainable housing close together.',
  },
  {
    id: 'CROWN_RESIDENTIAL',
    name: 'Crown Residential',
    center: [38, -45],
    bounds: [18, 61, -78, -20],
    streamRadius: 70,
    detailRadius: 42,
    status: 'PLAYABLE',
    role: 'RESIDENTIAL',
    anchors: ['premium towers', 'sky gardens', 'private lift lobbies', 'local retail'],
    description: 'Premium towers and one-home-per-floor duplexes form the residential edge of the city core.',
  },
  {
    id: 'MIDSLOPE_VILLAS',
    name: 'Millionaire Ridge',
    center: [62, -1],
    bounds: [43, 80, -34, 40],
    streamRadius: 78,
    detailRadius: 46,
    status: 'PLAYABLE',
    role: 'RESIDENTIAL',
    anchors: ['townhouses', 'semi-detached homes', 'detached estates', 'forest drives'],
    description: 'A climbable hillside progresses from townhouses to paired villas and guarded detached estates.',
  },
  {
    id: 'EAST_GARDEN_CENTRES',
    name: 'East Garden Centres',
    center: [61, 55],
    bounds: [37, 80, 29, 80],
    streamRadius: 80,
    detailRadius: 46,
    status: 'SHELL',
    role: 'CENTRE',
    anchors: ['regional mall', 'family housing', 'schools', 'river park', 'metro interchange'],
    description: 'Several transit-served commercial centers mix attainable, family and move-up housing around schools and parks.',
  },
  {
    id: 'CIVIC_MEDICAL',
    name: 'Meridian Civic & Medical Campus',
    center: [45, 46],
    bounds: [20, 70, 27, 68],
    streamRadius: 68,
    detailRadius: 40,
    status: 'SHELL',
    role: 'CENTRE',
    anchors: ['hospital', 'emergency services', 'police', 'schools', 'laboratories'],
    description: 'A complete civic campus with worker housing, public transport, schools, research and emergency services.',
  },
  {
    id: 'ENERGY_RESEARCH',
    name: 'North Grid & Energy Research Campus',
    center: [-48, 58],
    bounds: [-76, -21, 36, 80],
    streamRadius: 72,
    detailRadius: 38,
    status: 'SHELL',
    role: 'INFRASTRUCTURE',
    anchors: ['grid control', 'clean energy research', 'reservoir buffer', 'worker housing'],
    description: 'Grid control, clean generation research and secure utilities sit inside a wide landscaped buffer.',
  },
  {
    id: 'NORTH_HIGHLANDS',
    name: 'North Highlands',
    center: [-62, 72],
    bounds: [-80, -28, 58, 80],
    streamRadius: 68,
    detailRadius: 38,
    status: 'PLANNED',
    role: 'RESIDENTIAL',
    anchors: ['reservoir homes', 'paired villas', 'forest estates', 'country lodge'],
    description: 'Worker apartments step gradually into low-density hillside housing and protected highland landscape.',
  },
  {
    id: 'FOOD_RETAIL',
    name: 'Canopy Food & Retail District',
    center: [-22, 24],
    bounds: [-46, 8, 7, 45],
    streamRadius: 62,
    detailRadius: 40,
    status: 'SHELL',
    role: 'CENTRE',
    anchors: ['market hall', 'grocers', 'restaurants', 'pool residences', 'nightlife'],
    description: 'Daily retail and food streets support value, mid-market and move-up homes in one walkable center.',
  },
  {
    id: 'STARTER_OUTER_RING',
    name: 'Starter Outer Ring',
    center: [0, 76],
    bounds: [-30, 30, 66, 80],
    streamRadius: 65,
    detailRadius: 34,
    status: 'PLAYABLE',
    role: 'RESIDENTIAL',
    anchors: ['starter towers', 'employment hall', 'transit mall', 'sports deck'],
    description: 'High-density starter housing and attainable townhomes connect to the city by metro, buses and the grand axis.',
  },
] as const;

export const URBAN_CENTERS: readonly UrbanCenter[] = [
  { id: 'CTR-CBD', name: 'Civic Exchange', sector: 'CBD_CORE', position: [0, -10], scale: 'METROPOLITAN', catchmentRadiusKm: 18, anchors: ['exchange', 'offices', 'culture', 'luxury retail', 'central park'], housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'] },
  { id: 'CTR-CANOPY', name: 'Canopy Market Centre', sector: 'FOOD_RETAIL', position: [-22, 24], scale: 'DISTRICT', catchmentRadiusKm: 4.5, anchors: ['market hall', 'groceries', 'restaurants', 'community services'], housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'] },
  { id: 'CTR-MERIDIAN', name: 'Meridian Civic Centre', sector: 'CIVIC_MEDICAL', position: [45, 46], scale: 'SUBCENTER', catchmentRadiusKm: 9, anchors: ['hospital', 'university', 'government', 'research', 'regional park'], housingTiers: ['MID_MARKET', 'MOVE_UP'] },
  { id: 'CTR-EASTGARDEN', name: 'Eastgarden Regional Centre', sector: 'EAST_GARDEN_CENTRES', position: [64, 57], scale: 'REGIONAL', catchmentRadiusKm: 8, anchors: ['regional mall', 'schools', 'sports', 'river park', 'interchange'], housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'] },
  { id: 'CTR-AZURE', name: 'Azure Bay Marina Village', sector: 'AZURE_RESORT_BELT', position: [-61, -61], scale: 'REGIONAL', catchmentRadiusKm: 7, anchors: ['yacht hotels', 'marina', 'public beach', 'dining', 'marine retail'], housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'] },
  { id: 'CTR-HARBOR', name: 'West Harbor Centre', sector: 'WEST_HARBOR', position: [-66, 22], scale: 'DISTRICT', catchmentRadiusKm: 6, anchors: ['ferry terminal', 'working port', 'repair', 'food market'], housingTiers: ['VALUE', 'MID_MARKET'] },
  { id: 'CTR-STARTER', name: 'Outer Ring Transit Centre', sector: 'STARTER_OUTER_RING', position: [0, 73], scale: 'REGIONAL', catchmentRadiusKm: 7, anchors: ['employment hall', 'transit mall', 'community clinic', 'sports deck'], housingTiers: ['VALUE', 'MID_MARKET'] },
  { id: 'CTR-GRID', name: 'North Grid Innovation Centre', sector: 'ENERGY_RESEARCH', position: [-48, 58], scale: 'DISTRICT', catchmentRadiusKm: 5.5, anchors: ['research campus', 'grid control', 'reservoir park', 'worker services'], housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'] },
  { id: 'CTR-RIDGE', name: 'Ridge Gate Village', sector: 'MIDSLOPE_VILLAS', position: [50, 5], scale: 'NEIGHBORHOOD', catchmentRadiusKm: 3, anchors: ['club street', 'grocer', 'trailhead', 'metro gate'], housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'] },
] as const;

export const RESORT_BAYS: readonly ResortBay[] = [
  {
    id: 'BAY-AZURE',
    name: 'Azure Crescent Bay',
    center: [-61, -55],
    coast: [[-77, -43], [-69, -51], [-61, -57], [-50, -55], [-42, -48]],
    hotelRooms: 1_320,
    publicBerths: 220,
    largeYachtBerths: 28,
    anchors: ['yacht hotel', 'public promenade', 'ferry pier', 'sailing school'],
    status: 'PLAYABLE',
  },
  {
    id: 'BAY-PEARL',
    name: 'Pearl Cape Bay',
    center: [-75, -69],
    coast: [[-80, -58], [-76, -66], [-72, -73], [-65, -77]],
    hotelRooms: 420,
    publicBerths: 82,
    largeYachtBerths: 34,
    anchors: ['cape villas', 'private marina', 'cliff hotel', 'marine sanctuary'],
    status: 'PLANNED',
  },
  {
    id: 'BAY-CORAL',
    name: 'Coral Lantern Bay',
    center: [-43, -69],
    coast: [[-58, -73], [-49, -67], [-40, -65], [-33, -72]],
    hotelRooms: 860,
    publicBerths: 146,
    largeYachtBerths: 12,
    anchors: ['family resort', 'public beach', 'fishing harbor', 'night market'],
    status: 'SHELL',
  },
] as const;

/** Beijing-inspired entrances occupy multiple street corners rather than one isolated portal. */
function fourCornerEntrances(
  connections: readonly [string, string, string, string],
): readonly MetroEntrancePlan[] {
  return [
    { code: 'A', corner: 'NORTHWEST', form: 'GLASS_CANOPY', accessible: true, connectsTo: connections[0] },
    { code: 'B', corner: 'NORTHEAST', form: 'INTEGRATED_PODIUM', accessible: false, connectsTo: connections[1] },
    { code: 'C', corner: 'SOUTHEAST', form: 'STONE_PAVILION', accessible: true, connectsTo: connections[2] },
    { code: 'D', corner: 'SOUTHWEST', form: 'PARK_GATE', accessible: false, connectsTo: connections[3] },
  ];
}

export const METRO_ENTRANCE_DESIGN_STANDARD = {
  defaultEntranceCodes: ['A', 'B', 'C', 'D'],
  minimumAccessibleEntrances: 2,
  placement: 'OPPOSITE_STREET_CORNERS',
  commonElements: ['weather canopy', 'bilingual line signage', 'lift', 'cycle parking', 'bus transfer', 'flood threshold'],
} as const;

export const METRO_HUBS: readonly MetroHub[] = [
  {
    id: 'MTR-S01',
    name: 'Outer Ring Central',
    sector: 'STARTER_OUTER_RING',
    position: [0, 71],
    lines: ['M1', 'M4'],
    catchmentRadiusMeters: 1_100,
    entrances: fourCornerEntrances(['Starter Towers', 'Employment Hall', 'Orchard Mall', 'Sports Deck']),
  },
  {
    id: 'MTR-C01',
    name: 'Exchange Grand Avenue',
    sector: 'CBD_CORE',
    position: [0, 25],
    lines: ['M1', 'M2', 'M3'],
    catchmentRadiusMeters: 900,
    entrances: fourCornerEntrances(['Grand Exchange', 'Aurelian Park', 'Forum Offices', 'Canopy Market']),
  },
  {
    id: 'MTR-C02',
    name: 'Rotunda South',
    sector: 'CBD_CORE',
    position: [0, -39],
    lines: ['M1', 'M3'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances(['Rotunda', 'Crown Residences', 'Theatre Row', 'South Boulevard']),
  },
  {
    id: 'MTR-G01',
    name: 'Grand River Northbank',
    sector: 'NORTH_RIVER',
    position: [13, 48],
    lines: ['M2', 'M6'],
    catchmentRadiusMeters: 950,
    entrances: fourCornerEntrances(['Glassworks', 'Willow Bend', 'North Riverwalk', 'Civic Bridge']),
  },
  {
    id: 'MTR-G02',
    name: 'Grand River Southbank',
    sector: 'SOUTH_RIVER',
    position: [-12, 31],
    lines: ['M2', 'M6'],
    catchmentRadiusMeters: 950,
    entrances: fourCornerEntrances(['Foundry Lofts', 'Embankment Arts', 'South Riverwalk', 'Night Market']),
  },
  {
    id: 'MTR-W01',
    name: 'Azure Waterfront',
    sector: 'WATERFRONT_MARINA',
    position: [-53, -27],
    lines: ['M2'],
    catchmentRadiusMeters: 1_050,
    entrances: fourCornerEntrances(['Public Marina', 'Yacht Hotel', 'Ferry Pier', 'Azure Crescent']),
  },
  {
    id: 'MTR-B01',
    name: 'Azure Bay Hotels',
    sector: 'AZURE_RESORT_BELT',
    position: [-61, -61],
    lines: ['M2', 'M7'],
    catchmentRadiusMeters: 1_300,
    entrances: fourCornerEntrances(['Resort Promenade', 'Yacht Club', 'Public Beach', 'Convention Hotel']),
  },
  {
    id: 'MTR-W02',
    name: 'West Harbor Exchange',
    sector: 'WEST_HARBOR',
    position: [-65, 20],
    lines: ['M6'],
    catchmentRadiusMeters: 1_200,
    entrances: fourCornerEntrances(['Ferry Terminal', 'Provision Market', 'Repair Yards', 'Harborworkers Court']),
  },
  {
    id: 'MTR-R01',
    name: 'Crown Towers',
    sector: 'CROWN_RESIDENTIAL',
    position: [34, -33],
    lines: ['M3'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances(['Crown Towers', 'Sky Garden', 'Local Retail', 'River Road']),
  },
  {
    id: 'MTR-H01',
    name: 'Ridge Gate',
    sector: 'MIDSLOPE_VILLAS',
    position: [48, 5],
    lines: ['M3', 'M5'],
    catchmentRadiusMeters: 1_250,
    entrances: fourCornerEntrances(['Townhouse Gate', 'Village Centre', 'Forest Trail', 'Villa Shuttle']),
  },
  {
    id: 'MTR-M01',
    name: 'Meridian Medical',
    sector: 'CIVIC_MEDICAL',
    position: [34, 43],
    lines: ['M1', 'M5'],
    catchmentRadiusMeters: 1_100,
    entrances: fourCornerEntrances(['Hospital', 'Academy', 'Civic Park', 'Resident Quarter']),
  },
  {
    id: 'MTR-E02',
    name: 'Eastgarden Central',
    sector: 'EAST_GARDEN_CENTRES',
    position: [62, 56],
    lines: ['M5', 'M6'],
    catchmentRadiusMeters: 1_250,
    entrances: fourCornerEntrances(['Regional Mall', 'Family Park', 'Schools', 'River Wetlands']),
  },
  {
    id: 'MTR-E01',
    name: 'North Grid Research',
    sector: 'ENERGY_RESEARCH',
    position: [-36, 54],
    lines: ['M4'],
    catchmentRadiusMeters: 1_200,
    entrances: fourCornerEntrances(['Research Campus', 'Grid Control', 'Reservoir Park', 'Worker Housing']),
  },
  {
    id: 'MTR-F01',
    name: 'Canopy Market',
    sector: 'FOOD_RETAIL',
    position: [-18, 23],
    lines: ['M2', 'M4'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances(['Market Hall', 'Food Street', 'Canopy Courtyard', 'Verdant Pool']),
  },
] as const;

export const METROPOLITAN_AXES: readonly RoadConnector[] = [
  {
    id: 'RD-A01',
    name: 'Grand Market Avenue',
    class: 'AXIS',
    width: 31,
    points: [[0, 80], [0, 60], [0, 38], [0, 25], [0, 2], [0, -39], [0, -78]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A12',
    name: 'Forum Cultural Axis',
    class: 'AXIS',
    width: 18,
    points: [[-80, -8], [-55, -8], [-28, -8], [0, -8], [32, -8], [58, -8], [80, -8]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
] as const;

export const RING_ROADS: readonly RoadConnector[] = [
  {
    id: 'RD-R01',
    name: 'Inner Capital Ring',
    class: 'RING',
    width: 13,
    points: [[-43, -52], [43, -52], [55, -10], [48, 33], [29, 40], [-29, 44], [-50, 28], [-55, -10], [-43, -52]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-R02',
    name: 'Metropolitan Middle Ring',
    class: 'RING',
    width: 16,
    points: [[-74, -67], [48, -71], [76, -40], [75, 42], [48, 72], [-45, 76], [-76, 48], [-77, -25], [-74, -67]],
    modes: ['BUS', 'CAR'],
  },
] as const;

export const ROAD_CONNECTORS: readonly RoadConnector[] = [
  ...METROPOLITAN_AXES,
  ...RING_ROADS,
  {
    id: 'RD-A02',
    name: 'Harbor Crescent',
    class: 'ARTERIAL',
    width: 10.5,
    points: [[0, -22], [-22, -26], [-45, -35], [-61, -52]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A03',
    name: 'Civic Parkway',
    class: 'ARTERIAL',
    width: 11.5,
    points: [[0, 25], [23, 32], [45, 46], [64, 57]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A04',
    name: 'Ridge Scenic Drive',
    class: 'SCENIC',
    width: 8,
    points: [[18, -18], [36, -11], [48, 5], [59, 23], [70, 38]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A05',
    name: 'North Utility Boulevard',
    class: 'ARTERIAL',
    width: 10,
    points: [[0, 45], [-24, 49], [-48, 58], [-64, 71]],
    modes: ['CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A06',
    name: 'North River Parkway',
    class: 'SCENIC',
    width: 9,
    points: [[-63, 30], [-49, 43], [-29, 50], [0, 45], [31, 47], [60, 40], [80, 35]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A07',
    name: 'Southbank Avenue',
    class: 'ARTERIAL',
    width: 12,
    points: [[-69, 21], [-53, 33], [-30, 37], [0, 31], [29, 33], [58, 28], [80, 23]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A08',
    name: 'Eastgarden Centre Boulevard',
    class: 'TRUNK',
    width: 14,
    points: [[32, 17], [46, 31], [59, 34], [64, 57], [55, 78]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A09',
    name: 'Azure Resort Parkway',
    class: 'SCENIC',
    width: 10,
    points: [[-44, -32], [-51, -46], [-61, -55], [-72, -67], [-45, -72], [-34, -63]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A10',
    name: 'West Harbor Logistics Way',
    class: 'TRUNK',
    width: 14,
    points: [[-77, 44], [-68, 24], [-72, 7], [-70, -17], [-61, -39]],
    modes: ['BUS', 'CAR'],
  },
  {
    id: 'RD-A11',
    name: 'East-West Commerce Corridor',
    class: 'TRUNK',
    width: 15,
    points: [[-78, 16], [-52, 16], [-22, 18], [0, 16], [34, 17], [62, 20], [80, 18]],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
] as const;

export function worldUnitsToKilometers(units: number) {
  return units * METERS_PER_WORLD_UNIT / 1000;
}

export function distanceBetween(a: WorldPoint, b: WorldPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function nearbyWorldSectors(position: WorldPoint, extraRadius = 0) {
  return WORLD_SECTORS.filter((sector) => distanceBetween(position, sector.center) <= sector.streamRadius + extraRadius);
}

export function detailedWorldSectors(position: WorldPoint) {
  return WORLD_SECTORS.filter((sector) => distanceBetween(position, sector.center) <= sector.detailRadius);
}

export function nearestMetroHub(position: WorldPoint) {
  return METRO_HUBS.reduce((nearest, hub) => (
    distanceBetween(position, hub.position) < distanceBetween(position, nearest.position) ? hub : nearest
  ));
}

export function nearestUrbanCenter(position: WorldPoint) {
  return URBAN_CENTERS.reduce((nearest, center) => (
    distanceBetween(position, center.position) < distanceBetween(position, nearest.position) ? center : nearest
  ));
}

export function nearestRiverBridge(position: WorldPoint) {
  return RIVER_BRIDGES.reduce((nearest, bridge) => (
    distanceBetween(position, bridge.position) < distanceBetween(position, nearest.position) ? bridge : nearest
  ));
}

export function metroHubsServingSector(sector: WorldSectorId) {
  return METRO_HUBS.filter((hub) => hub.sector === sector);
}

export function roadsByClass(roadClass: RoadConnector['class']) {
  return ROAD_CONNECTORS.filter((road) => road.class === roadClass);
}
