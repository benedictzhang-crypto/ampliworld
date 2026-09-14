import {env} from 'cloudflare:workers';
export const populationDB=()=>env.DB;
export const inferenceConfig=()=>{const e=env as unknown as Record<string,string>;return {token:e.AMPLIWORLD_LLM_TOKEN,model:e.AMPLIWORLD_LLM_MODEL,url:e.AMPLIWORLD_LLM_URL};};
