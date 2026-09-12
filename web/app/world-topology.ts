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
  | 'FOOD_RETAIL'
  | 'SUMMIT_ESTATES'
  | 'OFFSHORE_CITY'
  | 'MOTORSPORT_PARK';

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
  role?:
    | 'CORE'
    | 'RIVER'
    | 'CENTRE'
    | 'RESIDENTIAL'
    | 'EMPLOYMENT'
    | 'RESORT'
    | 'INFRASTRUCTURE';
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

export type MetroDistrict = 'STARTER_ARCOLOGY' | 'CBD';
export type MetroStationCode =
  | 'M0'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M7'
  | 'M8'
  | 'M9'
  | 'M10'
  | 'M11'
  | 'M12'
  | 'M13'
  | 'M14';

export type MetroStationRegistryEntry = {
  /** Stable public station code. This is not the rail-line identifier. */
  id: MetroStationCode;
  topologyId: string;
  district: MetroDistrict;
  /** Stable, walkable world-space arrival point beside the station entrance. */
  arrival: WorldPoint;
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
  /** Explicit physical deck span for oblique or chained crossings. */
  deckLength?: number;
  lanes: number;
  modes: readonly ('WALK' | 'CYCLE' | 'METRO' | 'BUS' | 'CAR')[];
  status: WorldSectorStatus;
};

export type UrbanCenter = {
  id: string;
  name: string;
  sector: WorldSectorId;
  position: WorldPoint;
  scale:
    | 'METROPOLITAN'
    | 'SUBCENTER'
    | 'REGIONAL'
    | 'DISTRICT'
    | 'NEIGHBORHOOD';
  catchmentRadiusKm: number;
  anchors: readonly string[];
  housingTiers: readonly (
    | 'VALUE'
    | 'MID_MARKET'
    | 'MOVE_UP'
    | 'PREMIUM'
    | 'TROPHY'
  )[];
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
export const METERS_PER_WORLD_UNIT =
  (PLAYABLE_CORE_KM * 1000) / WORLD_CORE_UNITS;

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
  {
    id: 'BR-W01',
    name: 'Harbor Gate Bridge',
    class: 'ROAD',
    position: [-58, 33],
    rotationDegrees: -34,
    width: 14,
    deckLength: 15,
    lanes: 4,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'SHELL',
  },
  {
    id: 'BR-P01',
    name: 'Foundry Walk',
    class: 'PEDESTRIAN',
    position: [-45, 40],
    rotationDegrees: -18,
    width: 4.5,
    lanes: 0,
    modes: ['WALK', 'CYCLE'],
    status: 'PLANNED',
  },
  {
    id: 'BR-R01',
    name: 'West Inner Ring Bridge',
    class: 'ROAD',
    position: [-29, 44],
    rotationDegrees: 0,
    width: 13,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-R01-WEST',
    name: 'West Inner Ring Crossing',
    class: 'ROAD',
    position: [-51, 36],
    rotationDegrees: -159.44,
    width: 13,
    deckLength: 34.6,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-M01',
    name: 'Academy Metro Bridge',
    class: 'METRO',
    position: [-16, 42],
    rotationDegrees: 0,
    width: 7,
    lanes: 0,
    modes: ['METRO'],
    status: 'SHELL',
  },
  {
    id: 'BR-A01',
    name: 'Grand Axis Bridge',
    class: 'BOULEVARD',
    position: [0, 38],
    rotationDegrees: 0,
    width: 31,
    deckLength: 18.6,
    lanes: 10,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-A03-MERIDIAN',
    name: 'Meridian Link Bridge',
    class: 'ROAD',
    position: [33.95, 38.97],
    rotationDegrees: 57.55,
    width: 11.5,
    deckLength: 20,
    lanes: 4,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-A04-RIDGE',
    name: 'Ridge Garden Bridge',
    class: 'ROAD',
    position: [66, 32.55],
    rotationDegrees: 36.25,
    width: 8,
    deckLength: 12,
    lanes: 2,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-A08-APPROACH',
    name: 'Eastgarden Approach Bridge',
    class: 'ROAD',
    position: [52.7, 32.55],
    rotationDegrees: 77,
    width: 14,
    deckLength: 14,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-P02',
    name: 'Exchange Garden Footbridge',
    class: 'PEDESTRIAN',
    position: [17, 39],
    rotationDegrees: 3,
    width: 5,
    lanes: 0,
    modes: ['WALK', 'CYCLE'],
    status: 'SHELL',
  },
  {
    id: 'BR-R02',
    name: 'East Inner Ring Bridge',
    class: 'ROAD',
    position: [29, 40],
    rotationDegrees: 5,
    width: 13,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-M02',
    name: 'Willow Light Rail Bridge',
    class: 'METRO',
    position: [45, 37],
    rotationDegrees: 11,
    width: 7,
    lanes: 0,
    modes: ['METRO'],
    status: 'PLANNED',
  },
  {
    id: 'BR-E01',
    name: 'Eastgarden Bridge',
    class: 'ROAD',
    position: [59, 34],
    rotationDegrees: 14,
    width: 14,
    deckLength: 17,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'SHELL',
  },
  {
    id: 'BR-A12-ESTUARY',
    name: 'Estuary Gate Bridge',
    class: 'ROAD',
    position: [-70.85, -8],
    rotationDegrees: 90,
    width: 18,
    deckLength: 20,
    lanes: 8,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-A11-HARBOR',
    name: 'Harbor Commerce Bridge',
    class: 'ROAD',
    position: [-69.62, 16],
    rotationDegrees: 90,
    width: 15,
    deckLength: 12,
    lanes: 6,
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
    status: 'PLAYABLE',
  },
  {
    id: 'BR-P03',
    name: 'Wetland Ribbon Bridge',
    class: 'PEDESTRIAN',
    position: [72, 31],
    rotationDegrees: 14,
    width: 4,
    lanes: 0,
    modes: ['WALK', 'CYCLE'],
    status: 'PLANNED',
  },
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
    anchors: [
      'Grand Exchange',
      'Aurelian Park',
      'Forum cultural axis',
      'duplex skyline',
    ],
    description:
      'A New York-scale skyline organized by Beijing-like civic axes, a grand avenue and vertical trophy homes.',
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
    anchors: [
      'continuous riverwalk',
      'sixteen named bridges',
      'ferry landings',
      'floodable parks',
    ],
    description:
      'A navigable metropolitan river joins garden suburbs, the exchange core, the working harbor and the sea.',
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
    anchors: [
      'Glassworks quarter',
      'Willow Bend',
      'cycle promenade',
      'family parks',
    ],
    description:
      'A chain of mixed-income river neighborhoods, creative reuse blocks and public waterfront rooms.',
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
    anchors: [
      'Foundry lofts',
      'Embankment arts centre',
      'night market',
      'river terraces',
    ],
    description:
      'Dense homes, adaptive reuse, food streets and cultural terraces face the civic reach of the river.',
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
    anchors: [
      'public coast',
      'yacht marina',
      'ferry pier',
      'seaside promenade',
    ],
    description:
      'The public coast combines daily ferries, fishing craft, sailing boats, yacht hotels and a continuous promenade.',
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
    anchors: [
      'three resort bays',
      'yacht hotels',
      'public beaches',
      'marine retail',
    ],
    description:
      'Three distinct bays layer public beaches, resort hotels, yacht clubs, residences and marine services.',
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
    anchors: [
      'working docks',
      'ferry terminal',
      'maker halls',
      'harborworker homes',
    ],
    description:
      'A working river port keeps logistics, ferries, repair yards and attainable housing close together.',
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
    anchors: [
      'premium towers',
      'sky gardens',
      'private lift lobbies',
      'local retail',
    ],
    description:
      'Premium towers and one-home-per-floor duplexes form the residential edge of the city core.',
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
    anchors: [
      'townhouses',
      'semi-detached homes',
      'detached estates',
      'forest drives',
    ],
    description:
      'A climbable hillside progresses from townhouses to paired villas and guarded detached estates.',
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
    anchors: [
      'regional mall',
      'family housing',
      'schools',
      'river park',
      'metro interchange',
    ],
    description:
      'Several transit-served commercial centers mix attainable, family and move-up housing around schools and parks.',
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
    anchors: [
      'hospital',
      'emergency services',
      'police',
      'schools',
      'laboratories',
    ],
    description:
      'A complete civic campus with worker housing, public transport, schools, research and emergency services.',
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
    anchors: [
      'grid control',
      'clean energy research',
      'reservoir buffer',
      'worker housing',
    ],
    description:
      'Grid control, clean generation research and secure utilities sit inside a wide landscaped buffer.',
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
    anchors: [
      'reservoir homes',
      'paired villas',
      'forest estates',
      'country lodge',
    ],
    description:
      'Worker apartments step gradually into low-density hillside housing and protected highland landscape.',
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
    anchors: [
      'market hall',
      'grocers',
      'restaurants',
      'pool residences',
      'nightlife',
    ],
    description:
      'Daily retail and food streets support value, mid-market and move-up homes in one walkable center.',
  },
  {
    id: 'STARTER_OUTER_RING',
    name: 'Starter Outer Ring',
    center: [0, 78],
    bounds: [-30, 30, 66, 90],
    streamRadius: 65,
    detailRadius: 34,
    status: 'PLAYABLE',
    role: 'RESIDENTIAL',
    anchors: [
      'starter towers',
      'employment hall',
      'transit mall',
      'sports deck',
    ],
    description:
      'High-density starter housing and attainable townhomes connect to the city by metro, buses and the grand axis.',
  },
  {
    id: 'SUMMIT_ESTATES',
    name: 'Victoria–Bel Air Summit Estates',
    center: [98, 12],
    bounds: [77, 124, -24, 48],
    streamRadius: 86,
    detailRadius: 52,
    status: 'PLAYABLE',
    role: 'RESIDENTIAL',
    anchors: [
      'Hong Kong-style mid-level homes',
      'Los Angeles cantilever villas',
      'summit club',
      'scenic switchback',
    ],
    description:
      'Individually designed houses climb a continuous eastern ridge from garden suburbs to the summit.',
  },
  {
    id: 'OFFSHORE_CITY',
    name: 'Ocean Crown Offshore City',
    center: [-120, -60],
    bounds: [-150, -94, -88, -34],
    streamRadius: 92,
    detailRadius: 58,
    status: 'PLAYABLE',
    role: 'RESORT',
    anchors: [
      'offshore casino',
      'sky hotel',
      'waterfront theatre',
      'elevated metro terminal',
    ],
    description:
      'A gold-and-white offshore entertainment city reached by a dedicated surface metro and sea bridge.',
  },
  {
    id: 'MOTORSPORT_PARK',
    name: 'Ampli Grand Prix Park',
    center: [131, -56],
    bounds: [100, 165, -90, -24],
    streamRadius: 98,
    detailRadius: 62,
    status: 'PLAYABLE',
    role: 'INFRASTRUCTURE',
    anchors: [
      'Grade 1-style circuit',
      'pit complex',
      'grandstand',
      'mobility research campus',
    ],
    description:
      'A purpose-designed permanent racing circuit anchors the eastern mobility and testing district.',
  },
] as const;

export const URBAN_CENTERS: readonly UrbanCenter[] = [
  {
    id: 'CTR-CBD',
    name: 'Civic Exchange',
    sector: 'CBD_CORE',
    position: [0, -10],
    scale: 'METROPOLITAN',
    catchmentRadiusKm: 18,
    anchors: [
      'exchange',
      'offices',
      'culture',
      'luxury retail',
      'central park',
    ],
    housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'],
  },
  {
    id: 'CTR-CANOPY',
    name: 'Canopy Market Centre',
    sector: 'FOOD_RETAIL',
    position: [-22, 24],
    scale: 'DISTRICT',
    catchmentRadiusKm: 4.5,
    anchors: ['market hall', 'groceries', 'restaurants', 'community services'],
    housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'],
  },
  {
    id: 'CTR-MERIDIAN',
    name: 'Meridian Civic Centre',
    sector: 'CIVIC_MEDICAL',
    position: [45, 46],
    scale: 'SUBCENTER',
    catchmentRadiusKm: 9,
    anchors: [
      'hospital',
      'university',
      'government',
      'research',
      'regional park',
    ],
    housingTiers: ['MID_MARKET', 'MOVE_UP'],
  },
  {
    id: 'CTR-EASTGARDEN',
    name: 'Eastgarden Regional Centre',
    sector: 'EAST_GARDEN_CENTRES',
    position: [64, 57],
    scale: 'REGIONAL',
    catchmentRadiusKm: 8,
    anchors: [
      'regional mall',
      'schools',
      'sports',
      'river park',
      'interchange',
    ],
    housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'],
  },
  {
    id: 'CTR-AZURE',
    name: 'Azure Bay Marina Village',
    sector: 'AZURE_RESORT_BELT',
    position: [-61, -61],
    scale: 'REGIONAL',
    catchmentRadiusKm: 7,
    anchors: [
      'yacht hotels',
      'marina',
      'public beach',
      'dining',
      'marine retail',
    ],
    housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'],
  },
  {
    id: 'CTR-HARBOR',
    name: 'West Harbor Centre',
    sector: 'WEST_HARBOR',
    position: [-66, 22],
    scale: 'DISTRICT',
    catchmentRadiusKm: 6,
    anchors: ['ferry terminal', 'working port', 'repair', 'food market'],
    housingTiers: ['VALUE', 'MID_MARKET'],
  },
  {
    id: 'CTR-STARTER',
    name: 'Outer Ring Transit Centre',
    sector: 'STARTER_OUTER_RING',
    position: [0, 73],
    scale: 'REGIONAL',
    catchmentRadiusKm: 7,
    anchors: [
      'employment hall',
      'transit mall',
      'community clinic',
      'sports deck',
    ],
    housingTiers: ['VALUE', 'MID_MARKET'],
  },
  {
    id: 'CTR-GRID',
    name: 'North Grid Innovation Centre',
    sector: 'ENERGY_RESEARCH',
    position: [-48, 58],
    scale: 'DISTRICT',
    catchmentRadiusKm: 5.5,
    anchors: [
      'research campus',
      'grid control',
      'reservoir park',
      'worker services',
    ],
    housingTiers: ['VALUE', 'MID_MARKET', 'MOVE_UP'],
  },
  {
    id: 'CTR-RIDGE',
    name: 'Ridge Gate Village',
    sector: 'MIDSLOPE_VILLAS',
    position: [50, 5],
    scale: 'NEIGHBORHOOD',
    catchmentRadiusKm: 3,
    anchors: ['club street', 'grocer', 'trailhead', 'metro gate'],
    housingTiers: ['MOVE_UP', 'PREMIUM', 'TROPHY'],
  },
] as const;

export const RESORT_BAYS: readonly ResortBay[] = [
  {
    id: 'BAY-AZURE',
    name: 'Azure Crescent Bay',
    center: [-61, -55],
    coast: [
      [-77, -43],
      [-69, -51],
      [-61, -57],
      [-50, -55],
      [-42, -48],
    ],
    hotelRooms: 1_320,
    publicBerths: 220,
    largeYachtBerths: 28,
    anchors: [
      'yacht hotel',
      'public promenade',
      'ferry pier',
      'sailing school',
    ],
    status: 'PLAYABLE',
  },
  {
    id: 'BAY-PEARL',
    name: 'Pearl Cape Bay',
    center: [-75, -69],
    coast: [
      [-80, -58],
      [-76, -66],
      [-72, -73],
      [-65, -77],
    ],
    hotelRooms: 420,
    publicBerths: 82,
    largeYachtBerths: 34,
    anchors: [
      'cape villas',
      'private marina',
      'cliff hotel',
      'marine sanctuary',
    ],
    status: 'PLANNED',
  },
  {
    id: 'BAY-CORAL',
    name: 'Coral Lantern Bay',
    center: [-43, -69],
    coast: [
      [-58, -73],
      [-49, -67],
      [-40, -65],
      [-33, -72],
    ],
    hotelRooms: 860,
    publicBerths: 146,
    largeYachtBerths: 12,
    anchors: [
      'family resort',
      'public beach',
      'fishing harbor',
      'night market',
    ],
    status: 'SHELL',
  },
] as const;

/** Beijing-inspired entrances occupy multiple street corners rather than one isolated portal. */
function fourCornerEntrances(
  connections: readonly [string, string, string, string],
): readonly MetroEntrancePlan[] {
  return [
    {
      code: 'A',
      corner: 'NORTHWEST',
      form: 'GLASS_CANOPY',
      accessible: true,
      connectsTo: connections[0],
    },
    {
      code: 'B',
      corner: 'NORTHEAST',
      form: 'INTEGRATED_PODIUM',
      accessible: false,
      connectsTo: connections[1],
    },
    {
      code: 'C',
      corner: 'SOUTHEAST',
      form: 'STONE_PAVILION',
      accessible: true,
      connectsTo: connections[2],
    },
    {
      code: 'D',
      corner: 'SOUTHWEST',
      form: 'PARK_GATE',
      accessible: false,
      connectsTo: connections[3],
    },
  ];
}

export const METRO_ENTRANCE_DESIGN_STANDARD = {
  defaultEntranceCodes: ['A', 'B', 'C', 'D'],
  minimumAccessibleEntrances: 2,
  placement: 'OPPOSITE_STREET_CORNERS',
  commonElements: [
    'weather canopy',
    'bilingual line signage',
    'lift',
    'cycle parking',
    'bus transfer',
    'flood threshold',
  ],
} as const;

export const METRO_HUBS: readonly MetroHub[] = [
  {
    id: 'MTR-S01',
    name: 'Outer Ring Central',
    sector: 'STARTER_OUTER_RING',
    position: [0, 71],
    lines: ['M1', 'M4'],
    catchmentRadiusMeters: 1_100,
    entrances: fourCornerEntrances([
      'Starter Towers',
      'Employment Hall',
      'Orchard Mall',
      'Sports Deck',
    ]),
  },
  {
    id: 'MTR-C01',
    name: 'Exchange Grand Avenue',
    sector: 'CBD_CORE',
    position: [0, 25],
    lines: ['M1', 'M2', 'M3'],
    catchmentRadiusMeters: 900,
    entrances: fourCornerEntrances([
      'Grand Exchange',
      'Aurelian Park',
      'Forum Offices',
      'Canopy Market',
    ]),
  },
  {
    id: 'MTR-C02',
    name: 'Rotunda South',
    sector: 'CBD_CORE',
    position: [0, -39],
    lines: ['M1', 'M3'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances([
      'Rotunda',
      'Crown Residences',
      'Theatre Row',
      'South Boulevard',
    ]),
  },
  {
    id: 'MTR-G01',
    name: 'Grand River Northbank',
    sector: 'NORTH_RIVER',
    position: [13, 48],
    lines: ['M2', 'M6'],
    catchmentRadiusMeters: 950,
    entrances: fourCornerEntrances([
      'Glassworks',
      'Willow Bend',
      'North Riverwalk',
      'Civic Bridge',
    ]),
  },
  {
    id: 'MTR-G02',
    name: 'Grand River Southbank',
    sector: 'SOUTH_RIVER',
    position: [-12, 31],
    lines: ['M2', 'M6'],
    catchmentRadiusMeters: 950,
    entrances: fourCornerEntrances([
      'Foundry Lofts',
      'Embankment Arts',
      'South Riverwalk',
      'Night Market',
    ]),
  },
  {
    id: 'MTR-W01',
    name: 'Azure Waterfront',
    sector: 'WATERFRONT_MARINA',
    position: [-53, -27],
    lines: ['M2'],
    catchmentRadiusMeters: 1_050,
    entrances: fourCornerEntrances([
      'Public Marina',
      'Yacht Hotel',
      'Ferry Pier',
      'Azure Crescent',
    ]),
  },
  {
    id: 'MTR-B01',
    name: 'Azure Bay Hotels',
    sector: 'AZURE_RESORT_BELT',
    // The resort itself spans the bay, but the station entrance must sit on
    // the walkable east bank beside Azure Resort Parkway—not in the estuary.
    position: [-36, -63],
    lines: ['M2', 'M7'],
    catchmentRadiusMeters: 1_300,
    entrances: fourCornerEntrances([
      'Resort Promenade',
      'Yacht Club',
      'Public Beach',
      'Convention Hotel',
    ]),
  },
  {
    id: 'MTR-W02',
    name: 'West Harbor Exchange',
    sector: 'WEST_HARBOR',
    position: [-65, 20],
    lines: ['M6'],
    catchmentRadiusMeters: 1_200,
    entrances: fourCornerEntrances([
      'Ferry Terminal',
      'Provision Market',
      'Repair Yards',
      'Harborworkers Court',
    ]),
  },
  {
    id: 'MTR-R01',
    name: 'Crown Towers',
    sector: 'CROWN_RESIDENTIAL',
    position: [34, -33],
    lines: ['M3'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances([
      'Crown Towers',
      'Sky Garden',
      'Local Retail',
      'River Road',
    ]),
  },
  {
    id: 'MTR-H01',
    name: 'Ridge Gate',
    sector: 'MIDSLOPE_VILLAS',
    position: [48, 5],
    lines: ['M3', 'M5'],
    catchmentRadiusMeters: 1_250,
    entrances: fourCornerEntrances([
      'Townhouse Gate',
      'Village Centre',
      'Forest Trail',
      'Villa Shuttle',
    ]),
  },
  {
    id: 'MTR-M01',
    name: 'Meridian Medical',
    sector: 'CIVIC_MEDICAL',
    position: [34, 43],
    lines: ['M1', 'M5'],
    catchmentRadiusMeters: 1_100,
    entrances: fourCornerEntrances([
      'Hospital',
      'Academy',
      'Civic Park',
      'Resident Quarter',
    ]),
  },
  {
    id: 'MTR-E02',
    name: 'Eastgarden Central',
    sector: 'EAST_GARDEN_CENTRES',
    position: [62, 56],
    lines: ['M5', 'M6'],
    catchmentRadiusMeters: 1_250,
    entrances: fourCornerEntrances([
      'Regional Mall',
      'Family Park',
      'Schools',
      'River Wetlands',
    ]),
  },
  {
    id: 'MTR-E01',
    name: 'North Grid Research',
    sector: 'ENERGY_RESEARCH',
    position: [-36, 54],
    lines: ['M4'],
    catchmentRadiusMeters: 1_200,
    entrances: fourCornerEntrances([
      'Research Campus',
      'Grid Control',
      'Reservoir Park',
      'Worker Housing',
    ]),
  },
  {
    id: 'MTR-F01',
    name: 'Canopy Market',
    sector: 'FOOD_RETAIL',
    position: [-18, 23],
    lines: ['M2', 'M4'],
    catchmentRadiusMeters: 850,
    entrances: fourCornerEntrances([
      'Market Hall',
      'Food Street',
      'Canopy Courtyard',
      'Verdant Pool',
    ]),
  },
  {
    id: 'MTR-O01',
    name: 'Ocean Crown Terminal',
    sector: 'OFFSHORE_CITY',
    position: [-120, -84],
    lines: ['M7'],
    catchmentRadiusMeters: 1_400,
    entrances: fourCornerEntrances([
      'Casino Promenade',
      'Sky Hotel',
      'Marine Theatre',
      'Sea Bridge',
    ]),
  },
] as const;

/**
 * Public station codes are deliberately explicit and permanent. Never derive
 * them from METRO_HUBS array order: saved games, signs and shared links depend
 * on these values remaining stable.
 */
export const METRO_STATION_REGISTRY = [
  {
    id: 'M0',
    topologyId: 'MTR-S01',
    district: 'STARTER_ARCOLOGY',
    arrival: [0, 71],
  },
  { id: 'M1', topologyId: 'MTR-G02', district: 'CBD', arrival: [-8, 28] },
  { id: 'M2', topologyId: 'MTR-W01', district: 'CBD', arrival: [-53, -27] },
  { id: 'M3', topologyId: 'MTR-G01', district: 'CBD', arrival: [13, 48] },
  { id: 'M4', topologyId: 'MTR-C01', district: 'CBD', arrival: [0, 25] },
  { id: 'M5', topologyId: 'MTR-C02', district: 'CBD', arrival: [-5, -49] },
  { id: 'M6', topologyId: 'MTR-B01', district: 'CBD', arrival: [-35, -68] },
  { id: 'M7', topologyId: 'MTR-W02', district: 'CBD', arrival: [-65, 20] },
  { id: 'M8', topologyId: 'MTR-M01', district: 'CBD', arrival: [34, 43] },
  { id: 'M9', topologyId: 'MTR-H01', district: 'CBD', arrival: [45, 13] },
  { id: 'M10', topologyId: 'MTR-R01', district: 'CBD', arrival: [41, -28] },
  { id: 'M11', topologyId: 'MTR-E02', district: 'CBD', arrival: [51, 48] },
  { id: 'M12', topologyId: 'MTR-E01', district: 'CBD', arrival: [-33, 51] },
  { id: 'M13', topologyId: 'MTR-F01', district: 'CBD', arrival: [-10, 19] },
  { id: 'M14', topologyId: 'MTR-O01', district: 'CBD', arrival: [-120, -84] },
] as const satisfies readonly MetroStationRegistryEntry[];

export const DEFAULT_METRO_STATION_BY_DISTRICT = {
  STARTER_ARCOLOGY: 'M0',
  CBD: 'M4',
} as const satisfies Record<MetroDistrict, MetroStationCode>;

export function metroStationByCode(code: string) {
  return METRO_STATION_REGISTRY.find((station) => station.id === code);
}

export function metroStationByTopologyId(topologyId: string) {
  return METRO_STATION_REGISTRY.find(
    (station) => station.topologyId === topologyId,
  );
}

export function metroHubById(topologyId: string) {
  return METRO_HUBS.find((hub) => hub.id === topologyId);
}

export const METROPOLITAN_AXES: readonly RoadConnector[] = [
  {
    id: 'RD-A01',
    name: 'Grand Market Avenue',
    class: 'AXIS',
    width: 31,
    points: [
      [0, 80],
      [0, 60],
      [0, 38],
      [0, 25],
      [0, 2],
      [0, -39],
      [0, -78],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A12',
    name: 'Forum Cultural Axis',
    class: 'AXIS',
    width: 18,
    points: [
      [-80, -8],
      [-40, -8],
      [-34, -10.5],
      [-12, -10.5],
      [-7, -8],
      [2, -8],
      [7, -11],
      [9, -16],
      [9, -21],
      [16, -24],
      [30, -24],
      [39, -21],
      [41, -15],
      [42, -8],
      [54.67, -8],
      [75.61, -8],
      [80, -8],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
] as const;

export const RING_ROADS: readonly RoadConnector[] = [
  {
    id: 'RD-R01',
    name: 'Inner Capital Ring',
    class: 'RING',
    width: 13,
    points: [
      [13, -45],
      [24, -53],
      [25, -60],
      [34, -62],
      [44, -60],
      [52, -51],
      [55, -46],
      [58, -40],
      [58, -32],
      [58, -18],
      [57, -12],
      [54.67, -8],
      [57, -5],
      [58, 2],
      [55.5, 11.4],
      [50.32, 18.75],
      [42, 26],
      [25, 28],
      [14, 25],
      [5, 26],
      [0, 29],
      [0, 47],
      [-12, 51],
      [-25, 52],
      [-38, 52],
      [-45, 52],
      [-57, 20],
      [-55, -10],
      [-40, -10.5],
      [-20, -10.5],
      [0, -8],
      [10, -10],
      [13, -22],
      [13, -45],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-R02',
    name: 'Metropolitan Middle Ring',
    class: 'RING',
    width: 16,
    points: [
      [-50, -67],
      [-40.24, -67.4],
      [-30, -65],
      [0, -69.43],
      [5, -65],
      [10, -58],
      [36, -63],
      [48, -58],
      [56, -55],
      [63.58, -53.75],
      [70, -48],
      [76, -40],
      [75.61, -8],
      [75, 18],
      [67, 24],
      [62, 24],
      [57.06, 26.24],
      [60.94, 41.76],
      [66, 45],
      [48, 96],
      [-45, 96],
      [-76, 48],
      [-77, -25],
      [-76, -50],
      [-73, -60],
      [-69, -64],
      [-64, -67],
      [-50, -67],
    ],
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
    points: [
      [11.5, -18],
      [0, -18.5],
      [-8, -18],
      [-11, -13],
      [-15, -10],
      [-31, -10],
      [-37, -15],
      [-40, -24],
      [-45, -35],
      [-61, -52],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A03',
    name: 'Civic Parkway',
    class: 'ARTERIAL',
    width: 11.5,
    points: [
      [0, 25],
      [23, 32],
      [45, 46],
      [64, 57],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A04',
    name: 'Ridge Scenic Drive',
    class: 'SCENIC',
    width: 8,
    points: [
      [18, -23],
      [28, -23],
      [36, -19],
      [39, -13],
      [42, -8],
      [50, -8],
      [55, -5],
      [57, 2],
      [57, 8],
      [55.5, 11.4],
      [57, 18],
      [59, 23],
      [70, 38],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A05',
    name: 'North Utility Boulevard',
    class: 'ARTERIAL',
    width: 10,
    points: [
      [0, 45],
      [-20, 51],
      [-35, 52],
      [-48, 56],
      [-56, 62],
      [-59, 70],
      [-64, 71],
    ],
    modes: ['CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A06',
    name: 'North River Parkway',
    class: 'SCENIC',
    width: 9,
    points: [
      [-72.13, 30.93],
      [-64.01, 39.29],
      [-54.59, 45.39],
      [-44.33, 49.5],
      [-33.47, 51.65],
      [-21.64, 51.17],
      [-11.63, 48.42],
      [-3.14, 46.04],
      [0, 45],
      [4.72, 45.34],
      [13.61, 45.97],
      [23.31, 46.97],
      [34.04, 47.13],
      [44.52, 45.43],
      [54.12, 42.85],
      [63.1, 40.8],
      [72.4, 39.2],
      [83, 42.5],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A07',
    name: 'Southbank Avenue',
    class: 'ARTERIAL',
    width: 12,
    points: [
      [-61.05, 14.49],
      [-58.01, 20.64],
      [-53.04, 25.93],
      [-46.6, 27],
      [-42, 23],
      [-37, 18],
      [-20, 18],
      [-12, 22],
      [-6, 27],
      [5.18, 29.86],
      [15.4, 30.83],
      [24.68, 32],
      [32.99, 32.31],
      [41.26, 31.07],
      [50.11, 28.77],
      [59.65, 26.25],
      [68, 20],
      [79, 17],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A08',
    name: 'Eastgarden Centre Boulevard',
    class: 'TRUNK',
    width: 14,
    points: [
      [32, 17],
      [46, 31],
      [59, 34],
      [64, 57],
      [55, 78],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A09',
    name: 'Azure Resort Parkway',
    class: 'SCENIC',
    width: 10,
    points: [
      [-44, -32],
      [-51, -46],
      [-61, -55],
      [-67, -62],
      [-71.57, -67.08],
      [-69, -70],
      [-62, -72],
      [-55, -73],
      [-45, -72],
      [-40.24, -67.4],
      [-34, -63],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A10',
    name: 'West Harbor Logistics Way',
    class: 'TRUNK',
    width: 14,
    points: [
      [-77, 44],
      [-62, 39],
      [-54, 27],
      [-61, 20],
      [-60, 8],
      [-58, -3],
      [-57, -12],
      [-53, -21],
      [-49, -30],
      [-45, -39],
    ],
    modes: ['BUS', 'CAR'],
  },
  {
    id: 'RD-A11',
    name: 'East-West Commerce Corridor',
    class: 'TRUNK',
    width: 15,
    points: [
      [-78, 16],
      [-52, 16],
      [-22, 18],
      [7, 23],
      [34, 17],
      [50.32, 18.75],
      [62, 20],
      [80, 18],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A13',
    name: 'Ocean Crown Sea Bridge',
    class: 'SCENIC',
    width: 12,
    points: [
      [-45, -72],
      [-72, -72],
      [-96, -76],
      [-116, -76],
      [-120, -81.3],
      [-120, -84],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A14',
    name: 'Grand Prix Expressway',
    class: 'TRUNK',
    width: 16,
    points: [
      [76, -40],
      [92, -44],
      [108, -50],
      [124, -55],
    ],
    modes: ['BUS', 'CAR'],
  },
  {
    id: 'RD-A15',
    name: 'Summit Switchback Drive',
    class: 'SCENIC',
    width: 8,
    points: [
      [70, 38],
      [70, 51],
      [80, 62],
      [100, 66],
      [122, 62],
      [136, 50],
      [142, 34],
      [141, 18],
      [132, 8],
      [112, 8],
      [106, 4],
      [103, -4],
      [105, -16],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
  {
    id: 'RD-A16',
    name: 'Apex Mobility Avenue',
    class: 'ARTERIAL',
    width: 11,
    points: [
      [63.58, -53.75],
      [70, -51],
      [82, -51],
      [94, -51],
      [105, -53],
    ],
    modes: ['WALK', 'CYCLE', 'BUS', 'CAR'],
  },
] as const;

/** Heading, in radians, of the road segment nearest a world-space point. */
export function headingAlongNearestRoad(position: WorldPoint) {
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  let heading = 0;
  for (const road of ROAD_CONNECTORS) {
    road.points.slice(0, -1).forEach((from, index) => {
      const to = road.points[index + 1];
      const segmentX = to[0] - from[0];
      const segmentZ = to[1] - from[1];
      const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
      const progress =
        lengthSquared > Number.EPSILON
          ? Math.min(
              1,
              Math.max(
                0,
                ((position[0] - from[0]) * segmentX +
                  (position[1] - from[1]) * segmentZ) /
                  lengthSquared,
              ),
            )
          : 0;
      const dx = position[0] - (from[0] + segmentX * progress);
      const dz = position[1] - (from[1] + segmentZ * progress);
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        heading = Math.atan2(segmentX, segmentZ);
      }
    });
  }
  return heading;
}

export function worldUnitsToKilometers(units: number) {
  return (units * METERS_PER_WORLD_UNIT) / 1000;
}

export function distanceBetween(a: WorldPoint, b: WorldPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function nearbyWorldSectors(position: WorldPoint, extraRadius = 0) {
  return WORLD_SECTORS.filter(
    (sector) =>
      distanceBetween(position, sector.center) <=
      sector.streamRadius + extraRadius,
  );
}

export function detailedWorldSectors(position: WorldPoint) {
  return WORLD_SECTORS.filter(
    (sector) => distanceBetween(position, sector.center) <= sector.detailRadius,
  );
}

export function nearestMetroHub(position: WorldPoint) {
  return METRO_HUBS.reduce((nearest, hub) =>
    distanceBetween(position, hub.position) <
    distanceBetween(position, nearest.position)
      ? hub
      : nearest,
  );
}

export function nearestUrbanCenter(position: WorldPoint) {
  return URBAN_CENTERS.reduce((nearest, center) =>
    distanceBetween(position, center.position) <
    distanceBetween(position, nearest.position)
      ? center
      : nearest,
  );
}

export function nearestRiverBridge(position: WorldPoint) {
  return RIVER_BRIDGES.reduce((nearest, bridge) =>
    distanceBetween(position, bridge.position) <
    distanceBetween(position, nearest.position)
      ? bridge
      : nearest,
  );
}

export function metroHubsServingSector(sector: WorldSectorId) {
  return METRO_HUBS.filter((hub) => hub.sector === sector);
}

export function roadsByClass(roadClass: RoadConnector['class']) {
  return ROAD_CONNECTORS.filter((road) => road.class === roadClass);
}
