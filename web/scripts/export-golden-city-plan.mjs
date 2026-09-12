import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  GOLDEN_CITY_BOUNDS, GOLDEN_CITY_PARCELS, GOLDEN_CITY_SPATIAL_CONTRACT,
} from '../app/world-core-plan.ts';
import {
  CORE_TERRAIN_PARAMETERS, CORE_RIVER, CORE_OCEAN_POLYGON, CORE_WATERFALL,
  CORE_PRECINCTS, CORE_PARCEL_PROGRAM, CORE_BRIDGE_RESERVATIONS,
  sampleCoreTerrainYMeters, sampleCoreRiver, isCoreOcean,
} from '../app/world-core-geography.ts';

// Validate the landform handoff before producing any consumer artifacts.
const mouth = CORE_RIVER.at(-1);
assert.equal(mouth.surfaceYMeters, CORE_TERRAIN_PARAMETERS.seaLevelYMeters);
assert.ok(isCoreOcean(...mouth.position), 'River mouth must enter the ocean polygon');
assert.deepEqual(CORE_OCEAN_POLYGON[0], CORE_OCEAN_POLYGON.at(-1));
assert.equal(CORE_RIVER[0].position[0], GOLDEN_CITY_BOUNDS.maxXMeters);
let riverLengthMeters = 0;
for (let i = 1; i < CORE_RIVER.length; i++) {
  const a = CORE_RIVER[i - 1]; const b = CORE_RIVER[i];
  assert.ok(b.surfaceYMeters <= a.surfaceYMeters, 'Water cannot rise downstream');
  riverLengthMeters += Math.hypot(b.position[0] - a.position[0], b.position[1] - a.position[1]);
}
const crest = CORE_RIVER.find(s => s.id === CORE_WATERFALL.crestStationId);
const toe = CORE_RIVER.find(s => s.id === CORE_WATERFALL.toeStationId);
assert.deepEqual(crest.position, toe.position);
assert.equal(crest.surfaceYMeters - toe.surfaceYMeters, CORE_WATERFALL.dropMeters);
for (const bridge of CORE_BRIDGE_RESERVATIONS) {
  const station = CORE_RIVER.find(s => s.id === bridge.riverStationId);
  assert.equal(bridge.deckYMeters - bridge.deckThicknessMeters - station.surfaceYMeters, bridge.soffitClearanceMeters);
  for (const point of [bridge.from, bridge.to]) {
    const river = sampleCoreRiver(...point);
    assert.ok(river.distanceMeters > river.widthMeters / 2 + 15, `${bridge.id} must reach outside the channel`);
    assert.equal(isCoreOcean(...point), false, `${bridge.id} landing must be on land`);
  }
}
assert.equal(new Set(CORE_PARCEL_PROGRAM.map(p => p.parcelId)).size, 64);
for (const parcel of CORE_PARCEL_PROGRAM) assert.ok(CORE_PRECINCTS.some(p => p.id === parcel.precinctId));

const output = fileURLToPath(new URL('../public/planning/', import.meta.url));
await mkdir(output, { recursive: true });
const vertices = []; const faces = [];
const spacing = CORE_TERRAIN_PARAMETERS.sampleSpacingMeters;
const cells = 2000 / spacing;
for (let row = 0; row <= cells; row++) for (let col = 0; col <= cells; col++) {
  const x = -1000 + col * spacing; const z = -1000 + row * spacing;
  const y = sampleCoreTerrainYMeters(x, z);
  assert.ok(Number.isFinite(y));
  vertices.push([x, y, z]);
}
for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
  const a = row * (cells + 1) + col + 1; const b = a + 1;
  const c = a + cells + 1; const d = c + 1;
  faces.push([a, c, b], [b, c, d]); // Y-up winding.
}
assert.equal(vertices.length, 10201);
assert.equal(faces.length, 20000);
const obj = [
  '# AmpliWorld Golden City | metres, Y up, +Z north',
  '# Design landform only. Import axes: forward -Z, up Y; scale 1.0.',
  '# No building assets, navigation or collision certification in this file.',
  'o GC_TERRAIN',
  ...vertices.map(v => `v ${v.map(n => n.toFixed(4)).join(' ')}`),
  ...faces.map(f => `f ${f.join(' ')}`),
].join('\n');
await writeFile(`${output}golden-city-terrain.obj`, obj + '\n');

// Separate water mesh: upstream, vertical curtain, lower river and sea share stations.
const waterVertices = []; const waterFaces = [];
for (let i = 0; i < CORE_RIVER.length; i++) {
  const s = CORE_RIVER[i];
  let before = i - 1; let after = i + 1;
  while (before >= 0 && CORE_RIVER[before].position[0] === s.position[0] && CORE_RIVER[before].position[1] === s.position[1]) before--;
  while (after < CORE_RIVER.length && CORE_RIVER[after].position[0] === s.position[0] && CORE_RIVER[after].position[1] === s.position[1]) after++;
  const a = CORE_RIVER[Math.max(0, before)].position;
  const b = CORE_RIVER[Math.min(CORE_RIVER.length - 1, after)].position;
  const dx = b[0] - a[0]; const dz = b[1] - a[1]; const length = Math.hypot(dx, dz);
  const ox = -dz / length * s.widthMeters / 2; const oz = dx / length * s.widthMeters / 2;
  waterVertices.push([s.position[0] - ox, s.surfaceYMeters, s.position[1] - oz], [s.position[0] + ox, s.surfaceYMeters, s.position[1] + oz]);
  if (i > 0) { const j = i * 2; waterFaces.push([j - 1, j, j + 1], [j, j + 2, j + 1]); }
}
const oceanBase = waterVertices.length + 1;
waterVertices.push(...CORE_OCEAN_POLYGON.slice(0, -1).map(([x,z]) => [x,0,z]));
// This coastline is convex, so a triangle fan is sufficient.
for (let i = 1; i < CORE_OCEAN_POLYGON.length - 2; i++) waterFaces.push([oceanBase, oceanBase + i, oceanBase + i + 1]);
await writeFile(`${output}golden-city-water.obj`, [
  '# AmpliWorld river, 34 m waterfall curtain and sea | metres, Y up', 'o GC_WATER',
  ...waterVertices.map(v => `v ${v.map(n => n.toFixed(4)).join(' ')}`),
  ...waterFaces.map(f => `f ${f.join(' ')}`),
].join('\n') + '\n');

const manifest = {
  schemaVersion: 1, status: 'DESIGN_STUDY', source: 'world-core-geography.ts',
  spatialContract: GOLDEN_CITY_SPATIAL_CONTRACT,
  terrain: { ...CORE_TERRAIN_PARAMETERS, mesh: 'golden-city-terrain.obj', vertices: vertices.length, triangles: faces.length },
  water: { mesh: 'golden-city-water.obj', river: CORE_RIVER, oceanPolygon: CORE_OCEAN_POLYGON, waterfall: CORE_WATERFALL },
  precincts: CORE_PRECINCTS, parcels: GOLDEN_CITY_PARCELS.map(p => ({ ...p, ...CORE_PARCEL_PROGRAM.find(a => a.parcelId === p.id) })),
  bridgeReservations: CORE_BRIDGE_RESERVATIONS,
  limitations: ['Schematic channel and coastline need detailed grading.', 'Bridge ramps, road network, collision and navmesh are not yet built.', 'Height caps are above ground; parcels are planning allocations, not built property.'],
};
await writeFile(`${output}golden-city-masterplan.json`, JSON.stringify(manifest, null, 2) + '\n');

// Functional survey diagram, exported from exactly the same geometry and registry.
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const sx = x => 65 + (x + 1000) * 0.4;
const sy = z => 145 + (1000 - z) * 0.4;
const pts = points => points.map(([x,z]) => `${sx(x)},${sy(z)}`).join(' ');
const tags = [];
tags.push('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1070" viewBox="0 0 1280 1070" role="img" aria-labelledby="title desc">');
tags.push('<title id="title">AmpliWorld Golden City: 2 km by 2 km masterplan</title><desc id="desc">Metre-space planning map, north up, showing 64 parcels, river, 34 metre waterfall, ocean, three bridge reservations and precinct height envelopes. This is a design study, not a playable city.</desc>');
tags.push('<rect width="1280" height="1070" fill="#f3f0e8"/><g font-family="Arial, sans-serif" fill="#263c3e">');
tags.push('<text x="65" y="48" font-size="13" letter-spacing="4">AMPLIWORLD / GOLDEN CITY</text><text x="65" y="91" font-size="34" font-weight="bold">A city shaped by river, ridge and coast.</text>');
tags.push('<text x="65" y="119" font-size="15" fill="#5b6b68">2,000 × 2,000 metres · 64 planning parcels · editable landform handoff</text>');
for (const parcel of GOLDEN_CITY_PARCELS) {
  const program = CORE_PARCEL_PROGRAM.find(p => p.parcelId === parcel.id);
  const precinct = CORE_PRECINCTS.find(p => p.id === program.precinctId);
  tags.push(`<rect x="${sx(parcel.bounds.minXMeters)}" y="${sy(parcel.bounds.maxZMeters)}" width="100" height="100" fill="${precinct.color}" stroke="#f3f0e8" stroke-width="1.5"/>`);
}
tags.push('<defs><clipPath id="map-bounds"><rect x="65" y="145" width="800" height="800"/></clipPath></defs><g clip-path="url(#map-bounds)">');
tags.push(`<polygon points="${pts(CORE_OCEAN_POLYGON)}" fill="#548b9a"/>`);
for (let i = 1; i < CORE_RIVER.length; i++) {
  const a = CORE_RIVER[i-1]; const b = CORE_RIVER[i];
  tags.push(`<polyline points="${pts([a.position,b.position])}" fill="none" stroke="#548b9a" stroke-width="${(a.widthMeters+b.widthMeters)/2*0.4}" stroke-linejoin="round" stroke-linecap="round"/>`);
}
tags.push('</g>');
for (const parcel of GOLDEN_CITY_PARCELS) {
  tags.push(`<text x="${sx(parcel.bounds.minXMeters)+7}" y="${sy(parcel.bounds.maxZMeters)+16}" font-size="10" fill="#263c3e" opacity="0.8">${esc(parcel.id)}</text>`);
}
for (const bridge of CORE_BRIDGE_RESERVATIONS) {
  tags.push(`<polyline points="${pts([bridge.from,bridge.to])}" stroke="#243d42" stroke-width="9"/><polyline points="${pts([bridge.from,bridge.to])}" stroke="#fffaf0" stroke-width="5"/>`);
  const x = sx((bridge.from[0]+bridge.to[0])/2); const y = sy((bridge.from[1]+bridge.to[1])/2);
  tags.push(`<circle cx="${x}" cy="${y}" r="12" fill="#243d42"/><text x="${x}" y="${y+4}" fill="white" font-size="11" text-anchor="middle">${bridge.id.at(-1)}</text>`);
}
tags.push(`<circle cx="${sx(850)}" cy="${sy(640)}" r="10" fill="#bf8332" stroke="#fffaf0" stroke-width="3"/>`);
tags.push(`<rect x="${sx(850)-168}" y="${sy(640)-37}" width="163" height="24" rx="3" fill="#f3f0e8"/><text x="${sx(850)-10}" y="${sy(640)-19}" text-anchor="end" font-size="14" font-weight="bold">Aurelian Falls · 34 m</text>`);
tags.push('<rect x="65" y="145" width="800" height="800" fill="none" stroke="#263c3e" stroke-width="2"/>');
tags.push('<text x="879" y="177" font-size="18" font-weight="bold">N ↑</text>');
tags.push('<text x="925" y="168" font-size="13" letter-spacing="2">PRECINCTS / HEIGHT CAPS</text>');
CORE_PRECINCTS.forEach((p,i) => { const y = 213+i*73;
  tags.push(`<rect x="925" y="${y-17}" width="18" height="18" fill="${p.color}" stroke="#667871"/><text x="955" y="${y-3}" font-size="14" font-weight="bold">${esc(p.name)}</text><text x="955" y="${y+20}" font-size="13" fill="#52645e">${p.maxHeightAGLMeters ? `Up to ${p.maxHeightAGLMeters} m above ground` : 'Public water / coastal reserve'}</text>`);
});
tags.push('<text x="925" y="760" font-size="14" font-weight="bold">ONE SHARED PLAN</text><text x="925" y="789" font-size="13">River + sea + waterfall geometry</text><text x="925" y="813" font-size="13">3 bridge reservations · 28 m decks</text><text x="925" y="837" font-size="13">10,201 terrain vertices · 20 m grid</text>');
tags.push('<text x="925" y="889" font-size="13" fill="#6d6555">Design study. Detailed roads, grading,</text><text x="925" y="910" font-size="13" fill="#6d6555">buildings and collision remain to build.</text>');
tags.push('<path d="M65 978 H265 M65 972 V984 M165 972 V984 M265 972 V984" fill="none" stroke="#263c3e" stroke-width="2"/><text x="65" y="1005" font-size="12">0</text><text x="150" y="1005" font-size="12">250 m</text><text x="249" y="1005" font-size="12">500 m</text>');
tags.push('<text x="385" y="983" font-size="13">Water and public-bank reserves override parcel land-use colours.</text><text x="385" y="1006" font-size="13">XY on this map means east / north; OBJ uses X / Y-up / Z-north.</text></g></svg>');
await writeFile(`${output}golden-city-masterplan.svg`, tags.join('\n') + '\n');
console.log(`Golden City handoff validated: 64 parcels, ${Math.round(riverLengthMeters)} m river, ${CORE_WATERFALL.dropMeters} m fall, 3 bridge reservations, ${faces.length} terrain triangles.`);
console.log(output);
