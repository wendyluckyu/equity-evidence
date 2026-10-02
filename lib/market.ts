import { env } from 'cloudflare:workers';
import { eligibleRows } from './finance.mjs';
export type Row=Record<string,any>;
export type Feed={id:string;url:string;requestId?:string;asOf:number|null;fetchedAt:number;status:'ok'|'empty'|'error';message?:string;rows:Row[]};
export type Dataset={fetchedAt:number;feeds:Record<string,Feed>;companies:{code:string;name:string}[]};
export function secret(key:string):string {return String((env as unknown as Record<string,unknown>)[key] || process.env[key] || '');}
const companies=[{code:'000333.SZ',name:'美的集团'},{code:'000651.SZ',name:'格力电器'},{code:'600690.SH',name:'海尔智家'}];
let cached:Dataset|undefined;let inflight:Promise<Dataset>|undefined;
async function feed(id:string,path:string,params:Record<string,string>):Promise<Feed>{
 const url='https://fuyao.aicubes.cn'+path+'?'+new URLSearchParams(params);const fetchedAt=Date.now();
 const base={id,url,fetchedAt,asOf:null,rows:[]};
 if(!secret('HITHINK_FINANCE_API_KEY'))return {...base,status:'error',message:'金融数据服务尚未配置，无法读取数据。'};
 try{
  const r=await fetch(url,{headers:{'X-api-key':secret('HITHINK_FINANCE_API_KEY')},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(r.status===429?'请求频率受限，请稍后重试。':`上游服务 HTTP ${r.status}`);
  const d=await r.json() as Row;if(d.code!==0)throw new Error(d.code===2003?'当前密钥没有该数据权限。':d.code===4001?'请求频率受限，请稍后重试。':`上游业务错误 ${d.code}`);
  let rows=Array.isArray(d.data?.item)?d.data.item:[];
  if(id.includes(':'))rows=eligibleRows(rows,fetchedAt);
  return {...base,asOf:typeof d.data?.timestamp==='number'?d.data.timestamp:null,requestId:d.request_id,status:rows.length?'ok':'empty',rows,message:rows.length?undefined:'未返回可用记录，不能据此判断正常。'};
 }catch(e){return {...base,status:'error',message:e instanceof Error&&e.name==='TimeoutError'?'数据源响应超时。':e instanceof Error?e.message:'数据源连接失败。'};}
}
export async function getDataset():Promise<Dataset>{
 if(cached&&Date.now()-cached.fetchedAt<300000)return cached;
 if(inflight)return inflight;
 inflight=(async()=>{
  const jobs:{id:string;path:string;p:Record<string,string>}[]=[];
  for(const c of companies)for(const kind of ['income-statements','balance-sheets','cash-flow-statements'])jobs.push({id:`${c.code}:${kind}`,path:`/api/a-share/financials/${kind}`,p:{thscode:c.code,period:'quarterly',limit:'12'}});
  jobs.push({id:'quote',path:'/api/a-share/prices/snapshot',p:{thscodes:'000333.SZ'}},{id:'valuation',path:'/api/a-share/valuations/snapshot',p:{thscodes:companies.map(c=>c.code).join(',')}},{id:'history',path:'/api/a-share/prices/historical',p:{thscode:'000333.SZ',interval:'1d',start:String(Date.now()-366*86400000),end:String(Date.now()),adjust:'forward'}});
  const feeds:Record<string,Feed>={};
  for(let i=0;i<jobs.length;i+=3){const batch=await Promise.all(jobs.slice(i,i+3).map(j=>feed(j.id,j.path,j.p)));for(const f of batch)feeds[f.id]=f;}
  const result={fetchedAt:Date.now(),feeds,companies};
  if(Object.values(feeds).some(f=>f.status==='ok'))cached=result;
  return result;
 })();
 try{return await inflight;}finally{inflight=undefined;}
}
