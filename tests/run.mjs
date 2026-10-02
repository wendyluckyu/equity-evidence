import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['lib/diagnosis.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/diagnosis.mjs'});
await build({entryPoints:['lib/market.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/market.mjs',plugins:[{name:'mock-runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env = {};'}));}}]});
await build({entryPoints:['lib/research.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/research.mjs'});
await build({entryPoints:['app/api/diagnose/route.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/api.mjs',plugins:[{name:'isolated-api',setup(b){b.onResolve({filter:/^@\/lib\/market$/},()=>({path:'audit-market',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const secret=()=> 'synthetic-key'; export const getDataset=async()=>globalThis.auditDataset;"}));}}]});
const r=spawnSync(process.execPath,['--test','tests/finance.test.mjs','tests/market.test.mjs','tests/research.test.mjs'],{stdio:'inherit'});process.exitCode=r.status??1;
