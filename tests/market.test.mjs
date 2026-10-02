import test from 'node:test';
import assert from 'node:assert/strict';
let n=0;const fresh=()=>import(`../.sites-runtime/tests/market.mjs?case=${n++}`);
test('未配置权限：所有源显示错误且不请求网络',async()=>{delete process.env.HITHINK_FINANCE_API_KEY;global.fetch=()=>{throw Error('should not fetch')};const {getDataset}=await fresh();const d=await getDataset();assert.equal(Object.values(d.feeds).every(f=>f.status==='error'&&f.rows.length===0),true);});
test('HTTP 成功但业务权限失败不可视为有数据',async()=>{process.env.HITHINK_FINANCE_API_KEY='synthetic-test-key';global.fetch=async()=>new Response(JSON.stringify({code:2003,data:null}),{status:200});const d=await(await fresh()).getDataset();assert.equal(Object.values(d.feeds).every(f=>f.status==='error'&&f.message.includes('权限')),true);});
test('接口空数组保留 empty 状态',async()=>{global.fetch=async()=>new Response(JSON.stringify({code:0,data:{item:[],timestamp:null}}));const d=await(await fresh()).getDataset();assert.equal(Object.values(d.feeds).every(f=>f.status==='empty'&&f.asOf===null),true);});
test('网络超时显示 error，不回填正常数据',async()=>{global.fetch=async()=>{throw new DOMException('timeout','TimeoutError')};const d=await(await fresh()).getDataset();assert.equal(Object.values(d.feeds).every(f=>f.status==='error'&&f.message.includes('超时')),true);});
test('HTTP 限流无立即重试',async()=>{let calls=0;global.fetch=async()=>{calls++;return new Response('',{status:429})};const d=await(await fresh()).getDataset();assert.equal(calls,12);assert.equal(Object.values(d.feeds).every(f=>f.message.includes('频率')),true);});
