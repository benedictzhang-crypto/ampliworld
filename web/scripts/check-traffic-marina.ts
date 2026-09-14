import assert from 'node:assert/strict';
import {signalAt,crossingWait,coreCarMustStop} from '../app/life-sim/traffic';
import {civicGroundHeight,CIVIC_PLACES} from '../app/world-client/civic-registry';
import {consumerPersona,authorizePersonaSource} from '../app/life-sim/persona-adapter';
import marina from '../public/assets/3d/ampliworld/GC-MARINA-001/marina-manifest.json';
assert.equal(marina.berths.length,150);assert.equal(new Set(marina.berths.map(b=>b.id)).size,150);
assert.equal(marina.berths.filter(b=>b.occupied).length,100);
assert(CIVIC_PLACES.some(p=>p.id==='GC-MARINA-001'));
for(let z=13199;z<=13295;z++){const y=civicGroundHeight(6500,z);assert.equal(y,.18+(z-13199)/96*(-7.08));}
for(let t=0;t<90;t++){const s=signalAt(t);assert(!(s.northSouth==='green'&&s.eastWest==='green'));if(s.pedestrian)assert(s.northSouth==='red'&&s.eastWest==='red');}
assert.equal(crossingWait(0,20),72);assert.equal(crossingWait(72,20),0);assert.equal(crossingWait(73,20),89);
assert(coreCarMustStop(2,17.1,2,16.9,74));assert(!coreCarMustStop(2,17.1,2,16.9,5));
assert.throws(()=>authorizePersonaSource('huggingface'));assert.equal(consumerPersona(0).source,'ampliworld-local');
console.log('Passed: 150 berths, 100 boats, continuous gangway, protected signal phases, red stop line, external-data gate.');
