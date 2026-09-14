import {env} from 'cloudflare:workers';
export const populationDB=()=>env.DB;
