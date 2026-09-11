export type WorldAssetKind = 'BUILDING' | 'WATERCRAFT' | 'VEHICLE';

export type WorldAssetRecord = {
  id: string;
  kind: WorldAssetKind;
  name: string;
  family: string;
  status: 'LIVE' | 'DESIGN';
  implementation: 'PROCEDURAL' | 'GLB';
  source: string;
  scaleClass: string;
  notes: string;
};

export const BUILDING_ASSETS = [
  { id: 'BLD-A01', kind: 'BUILDING', name: 'Helix One', family: 'CYBER FULL-FLOOR TOWER', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#SciFiResidenceTower:HELIX', scaleClass: '15 premium levels · 42 m', notes: 'Rotating floor plates, panoramic glazing and one home per level.' },
  { id: 'BLD-A02', kind: 'BUILDING', name: 'Prism House', family: 'CYBER FULL-FLOOR TOWER', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#SciFiResidenceTower:PRISM', scaleClass: '12 double-height tiers · 39 m', notes: 'Faceted terraces and private sky-garden levels.' },
  { id: 'BLD-A03', kind: 'BUILDING', name: 'Skybridge Residences', family: 'CYBER FULL-FLOOR TOWER', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#SciFiResidenceTower:BRIDGE', scaleClass: 'twin 42–50 m towers', notes: 'Twin residential towers connected by private bridge salons.' },
  { id: 'BLD-B01', kind: 'BUILDING', name: 'Hua Court', family: 'MODERN CHINESE VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:CHINESE', scaleClass: '2 floors', notes: 'White walls, dark timber screens, layered eaves and a water courtyard.' },
  { id: 'BLD-B02', kind: 'BUILDING', name: 'Cotswold House', family: 'ENGLISH COUNTRY VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:ENGLISH', scaleClass: '3 floors', notes: 'Stone walls, steep gables, tall chimneys and a formal garden.' },
  { id: 'BLD-B03', kind: 'BUILDING', name: 'Pacific Terrace', family: 'AMERICAN MODERN VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:AMERICAN', scaleClass: '2 floors', notes: 'Broad cantilever, glass living wall and generous motor court.' },
  { id: 'BLD-B04', kind: 'BUILDING', name: 'Atlas Concrete House', family: 'BRUTALIST VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:CONCRETE', scaleClass: '2 above + 2 below', notes: 'Board-formed concrete, sunken courtyard and planted roof.' },
  { id: 'BLD-B05', kind: 'BUILDING', name: 'Whitewood House', family: 'WHITE + TIMBER VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:WHITEWOOD', scaleClass: '3 floors', notes: 'White stucco, vertical timber fins and warm recessed terraces.' },
  { id: 'BLD-B06', kind: 'BUILDING', name: 'Meadow House', family: 'PASTORAL VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:PASTORAL', scaleClass: '2 floors', notes: 'Stone base, pitched roof, veranda and flowering garden.' },
  { id: 'BLD-B07', kind: 'BUILDING', name: 'Neon Cliff House', family: 'CYBER COASTAL VILLA', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#CatalogVilla:CYBER', scaleClass: '3 floors', notes: 'Sculpted dark shell, cyan light seams and cantilevered sea decks.' },
  { id: 'BLD-C01', kind: 'BUILDING', name: 'Canopy Studio', family: 'ATTAINABLE MIDRISE', status: 'LIVE', implementation: 'PROCEDURAL', source: 'game-shell.tsx#MidriseCommunity', scaleClass: '5 floors', notes: 'Compact first upgrade around a shared pool.' },
] as const satisfies readonly WorldAssetRecord[];

export const WATERCRAFT_ASSETS = [
  { id: 'YHT-A45', kind: 'WATERCRAFT', name: 'Ampli 45 Sport', family: 'SPORT CRUISER', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/boat-speed-a.glb', scaleClass: '45 ft', notes: 'Low-profile day yacht with open cockpit.' },
  { id: 'YHT-A55', kind: 'WATERCRAFT', name: 'Ampli 55 Fly', family: 'FLYBRIDGE YACHT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/boat-speed-f.glb', scaleClass: '55 ft', notes: 'Live 55-foot-scale prototype; shares a licensed base hull with A60 until its original flybridge model is complete.' },
  { id: 'YHT-A60', kind: 'WATERCRAFT', name: 'Ampli 60 Open', family: 'EXPRESS YACHT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/boat-speed-f.glb', scaleClass: '60 ft', notes: 'Live 60-foot-scale prototype; shares a licensed base hull with A55 until its original open-yacht model is complete.' },
  { id: 'YHT-A70', kind: 'WATERCRAFT', name: 'Ampli 70 Voyager', family: 'EXPLORER YACHT', status: 'DESIGN', implementation: 'PROCEDURAL', source: 'docs/world_asset_library.md#下一步', scaleClass: '70 ft', notes: 'Planned three-deck coastal explorer with sheltered upper helm; not yet instantiated in the live scene.' },
  { id: 'YHT-A80', kind: 'WATERCRAFT', name: 'Ampli 80 Sky', family: 'SKYLOUNGE YACHT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/ship-large.glb', scaleClass: '80 ft', notes: 'Large-volume flybridge yacht with full-beam salon.' },
  { id: 'YHT-A100', kind: 'WATERCRAFT', name: 'Ampli 100', family: 'SUPERYACHT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/ship-ocean-liner-small.glb', scaleClass: '100+ ft', notes: 'Four-deck flagship kept offshore to preserve scale.' },
  { id: 'FSH-B38', kind: 'WATERCRAFT', name: 'Ampli Fisher 38', family: 'SPORT FISHING BOAT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/boat-fishing-small.glb', scaleClass: '38 ft', notes: 'Working cockpit, compact wheelhouse and fishing deck.' },
  { id: 'SAI-C42', kind: 'WATERCRAFT', name: 'Ampli Sail 42', family: 'SAILING YACHT', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/watercraft-kit/models/boat-sail-a.glb', scaleClass: '42 ft', notes: 'Private sailing yacht with a single tall mast.' },
] as const satisfies readonly WorldAssetRecord[];

export const VEHICLE_ASSETS = [
  { id: 'VEH-A01', kind: 'VEHICLE', name: 'City Sedan', family: 'EVERYDAY CAR', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/car-kit/models/sedan.glb', scaleClass: 'compact sedan', notes: 'Ordinary resident vehicle.' },
  { id: 'VEH-A02', kind: 'VEHICLE', name: 'City Taxi', family: 'PUBLIC MOBILITY', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/car-kit/models/taxi.glb', scaleClass: 'sedan', notes: 'Paid express transport.' },
  { id: 'VEH-A03', kind: 'VEHICLE', name: 'Parcel Van', family: 'COMMERCIAL VEHICLE', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/car-kit/models/delivery.glb', scaleClass: 'delivery van', notes: 'City logistics vehicle.' },
  { id: 'VEH-L01', kind: 'VEHICLE', name: 'Apex Luxury SUV', family: 'LUXURY CAR', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/car-kit/models/suv-luxury.glb', scaleClass: 'full-size SUV', notes: 'Villa district and 4S showroom vehicle.' },
  { id: 'VEH-S01', kind: 'VEHICLE', name: 'Apex Future GT', family: 'FUTURISTIC SPORTS CAR', status: 'LIVE', implementation: 'GLB', source: '/assets/3d/vendor/kenney/car-kit/models/race-future.glb', scaleClass: 'low sports car', notes: 'Sci-fi grand tourer for the city core.' },
] as const satisfies readonly WorldAssetRecord[];

export const WORLD_ASSET_CATALOG = [...BUILDING_ASSETS, ...WATERCRAFT_ASSETS, ...VEHICLE_ASSETS] as const;

export const WORLD_ASSET_COUNTS = {
  buildings: BUILDING_ASSETS.length,
  watercraft: WATERCRAFT_ASSETS.length,
  vehicles: VEHICLE_ASSETS.length,
};
