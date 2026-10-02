import {readFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const keys=['HITHINK_FINANCE_API_KEY','DEEPSEEK_API_KEY'];
const secrets=[];
for(const file of ['.dev.vars','.env.local']){try{const text=await readFile(file,'utf8');for(const l of text.split('\n')){const i=l.indexOf('=');if(keys.includes(l.slice(0,i).trim())){const v=l.slice(i+1).trim().replace(/^['"]|['"]$/g,'');if(v.length>12)secrets.push(v);}}}catch{}}
let files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
async function walk(path){try{for(const d of await readdir(path,{withFileTypes:true})){const p=path+'/'+d.name;if(d.isDirectory())await walk(p);else if(d.isFile())files.push(p);}}catch{}}
await walk('dist');let leaked=0;let forbidden=0;
for(const f of files){if(/(^|\/)(\.env(?!\.example)|\.dev\.vars)|credentials\.env/.test(f)&&!f.startsWith('dist/')){forbidden++;continue;}try{const st=await stat(f);if(st.size>15000000)continue;const t=await readFile(f,'utf8');if(secrets.some(s=>t.includes(s)))leaked++;}catch{}}
if(leaked||forbidden){console.error(JSON.stringify({status:'failed',secretMatches:leaked,forbiddenFiles:forbidden}));process.exit(1);}
console.log(JSON.stringify({status:'passed',checkedFiles:files.length,configuredSecretsChecked:secrets.length>0}));
