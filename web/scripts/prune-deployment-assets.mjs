import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// Retain editable/source assets in public; omit only verified unused copies from deployment.
const omitted = [
  'assets/3d/ampliworld/GC-MALL-TENANTS-001/tenants.glb',
  'assets/3d/ampliworld/GC-MALL-GARAGE-001/garage.glb',
];
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir,e.name)) : [join(dir,e.name)]); }
const source = files('app').filter(p => /\.(tsx?|jsx?)$/.test(p)).map(p => readFileSync(p,'utf8')).join('\n');
for (const asset of omitted) {
  const marker = asset.includes('GARAGE-001') ? 'GC-MALL-GARAGE-001' : '/'+asset;
  if (source.includes(marker)) throw new Error('Cannot prune referenced asset: '+asset);
  const output = join('dist/client',asset);
  if (existsSync(output)) { const bytes=statSync(output).size; unlinkSync(output); console.log('Excluded unused build copy:',asset,bytes); }
}
// Whitespace-only compaction preserves every manifest field and coordinate.
for (const path of files('dist/client/assets').filter(p=>p.endsWith('.json'))) {
  writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path,'utf8'))));
}
const bytes=files('dist').reduce((sum,p)=>sum+statSync(p).size,0);
console.log('Deployment output MiB:',(bytes/1024/1024).toFixed(2));
if (bytes>256*1024*1024) throw new Error('Deployment output exceeds 256 MiB');
