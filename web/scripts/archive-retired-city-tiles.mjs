import {readFileSync,readdirSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const source=resolve('public/assets/3d/ampliworld/GC-CITY-2030');
const target=resolve('asset-library/archived/GC-CITY-2030/housing-replan');
const active=new Set(JSON.parse(readFileSync(source+'/city-manifest.json')).tiles.map(t=>t.file));
const retired=readdirSync(source).filter(f=>/^GC-TILE-\d\d-\d\d\.glb$/.test(f)&&!active.has(f));
mkdirSync(target,{recursive:true});
for(const file of retired){if(existsSync(target+'/'+file))throw new Error('Archive target exists: '+file);renameSync(source+'/'+file,target+'/'+file);}
console.log('Archived retired residential-only tiles:',retired.length);
