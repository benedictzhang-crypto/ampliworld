import type {LifeWorld} from './engine';
/** Compatible with old JSON saves; compact durable snapshots for the 30k cohort. */
export async function encodeSnapshot(world:LifeWorld):Promise<string>{
 const bytes=new Uint8Array(await new Response(new Blob([JSON.stringify(world)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const result='gz1:'+btoa(binary);if(result.length>8_000_000)throw new Error('Population snapshot exceeds the 30k operating limit');return result;
}
export async function decodeSnapshot(value:string):Promise<LifeWorld>{
 if(!value.startsWith('gz1:'))return JSON.parse(value);
 const raw=atob(value.slice(4)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return JSON.parse(text);
}
