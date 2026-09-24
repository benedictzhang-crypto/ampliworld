import type {LifeWorld} from './engine';
/** Compatible with old JSON saves; compact durable snapshots for the 30k cohort. */
export async function encodeSnapshot(world:LifeWorld):Promise<string>{
 const bytes=new Uint8Array(await new Response(new Blob([JSON.stringify(world)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const result='gz1:'+btoa(binary);if(result.length>32_000_000)throw new Error('Population snapshot exceeds the 30k operating limit');return result;
}
/** Keep each D1 row below its 2 MB value limit; the route commits these pieces transactionally. */
export function splitSnapshot(value:string,chunkSize=1_500_000):string[]{
 if(!Number.isSafeInteger(chunkSize)||chunkSize<1||chunkSize>1_500_000)throw new Error('Invalid snapshot chunk size');
 const chunks:string[]=[];for(let i=0;i<value.length;i+=chunkSize)chunks.push(value.slice(i,i+chunkSize));
 return chunks;
}
export async function decodeSnapshot(value:string):Promise<LifeWorld>{
 if(!value.startsWith('gz1:'))return JSON.parse(value);
 const raw=atob(value.slice(4)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return JSON.parse(text);
}
