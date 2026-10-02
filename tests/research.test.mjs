import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAnswer,completeCounterpoint} from '../lib/ai-guard.mjs';
import {priceStats,isAdvice} from '../lib/finance.mjs';
import {assessQuality,materializeSelection} from '../.sites-runtime/tests/research.mjs';
import {diagnose} from '../.sites-runtime/tests/diagnosis.mjs';
const catalog=[{id:'cash',direction:'positive'},{id:'growth',direction:'positive'},{id:'inventory',direction:'unknown'}];
const selection=()=>({scope:'covered',focusIds:['cash','growth'],summaryIds:['cash'],counterpointId:'inventory',questionIds:['inventory']});
test('证据选择可包含已核对数字，不再拦截数字本身',()=>assert.equal(validateAnswer(selection(),catalog).summaryIds[0],'cash'));
test('模型不能新增自由事实、预测或中文数字',()=>{for(const text of ['获得行业最高市场份额','明年增长五成','预计增长100%','建议买入'])assert.throws(()=>validateAnswer({...selection(),summary:text},catalog),/AI_OUTPUT_SCHEMA/);});
test('伪造引用不可通过',()=>assert.throws(()=>validateAnswer({...selection(),focusIds:['cash','invented']},catalog),/AI_INVALID_EVIDENCE/));
test('摘要只能引用本次重点，不能挂无关未选引用',()=>assert.throws(()=>validateAnswer({...selection(),summaryIds:['inventory']},catalog),/AI_SUMMARY_CITATION/));
test('缺少反证或用正面证据冒充反证不可通过',()=>{for(const id of [undefined,'cash'])assert.throws(()=>validateAnswer({...selection(),counterpointId:id},catalog),/AI_MISSING_COUNTERPOINT/);});
test('future 行情排除；同日重复去重；回撤峰谷可复核',()=>{const d=priceStats([{date_ms:1,close_price:100},{date_ms:2,close_price:120},{date_ms:3,close_price:90},{date_ms:3,close_price:90},{date_ms:101,close_price:999}],120,100);assert.equal(d.bars.length,3);assert.equal(d.drawdownPeak.date_ms,2);assert.equal(d.drawdownTrough.date_ms,3);assert.equal(d.maxDrawdown,-25);});
test('交易意图识别与公告说明区分',()=>{for(const q of ['我该不该入场','你能保证我不会亏钱吗','我应该继续持有吗'])assert.equal(isAdvice(q),true,q);assert.equal(isAdvice('解释公司公告中的股份买入计划'),false);});
const row=()=>({fiscal_year:2026,fiscal_period:'Q2',period_end_ms:Date.UTC(2026,5,30),report_date_ms:Date.UTC(2026,7,29),currency:'CNY',operating_income:260042490000,parent_holder_net_profit:26446037000,net_profit:26583000000});
const feed=rows=>({status:rows.length?'ok':'empty',rows,asOf:Date.now(),fetchedAt:Date.now(),url:'https://example.invalid/synthetic',id:'synthetic'});
const dataset=()=>({fetchedAt:Date.now(),companies:[{code:'000333.SZ',name:'合成样本'}],feeds:{'000333.SZ:income-statements':feed([row()]),'000333.SZ:cash-flow-statements':feed([{...row(),act_cash_flow_net:37552090000}]),valuation:feed([{thscode:'000333.SZ',pe_ttm:12}]),history:feed([{date_ms:Date.now()-86400000,close_price:100},{date_ms:Date.now(),close_price:105}])}});
test('读取时间新不能洗掉原始数据过期',()=>{const d=dataset();d.feeds.valuation.asOf=1;d.feeds.history.rows=[{date_ms:1,close_price:100},{date_ms:2,close_price:105}];const q=assessQuality(d,row());assert.equal(q.find(q=>q.id==='valuation').status,'stale');assert.equal(q.find(q=>q.id==='market').status,'stale');});
test('新日期的无效价格不能让旧行情通过时效检查',()=>{
 const now=Date.now(),day=86400000;
 for(const invalid of [null,undefined,0,-1,NaN,Infinity,'105']){
  const d=dataset();d.feeds.history.rows=[{date_ms:now-100*day,close_price:100},{date_ms:now-99*day,close_price:110},{date_ms:now-day,close_price:invalid}];
  const quality=assessQuality(d,row(),undefined,now).find(q=>q.id==='market');
  assert.equal(quality.status,'stale');
  const e=diagnose(d).evidence.find(e=>e.id==='market');assert.equal(e.kind,'待验证');assert.equal(e.direction,'unknown');
 }
});
test('行情时效与计算共同排除重复、未来及不足两日的数据',()=>{
 const now=Date.now(),day=86400000,d=dataset();
 for(const rows of [[],[{date_ms:now,close_price:null}],[{date_ms:now,close_price:100},{date_ms:now,close_price:101},{date_ms:now+day,close_price:110}]]){
  d.feeds.history.rows=rows;assert.equal(assessQuality(d,row(),undefined,now).find(q=>q.id==='market').status,'missing');assert.equal(priceStats(rows,120,now).change,null);
 }
 d.feeds.history.rows=[{date_ms:now-day,close_price:100},{date_ms:now,close_price:105},{date_ms:now,close_price:null}];
 assert.equal(assessQuality(d,row(),undefined,now).find(q=>q.id==='market').status,'available');assert.ok(Math.abs(priceStats(d.feeds.history.rows,120,now).change-5)<1e-9);
});
test('未知估值时点保持未知，历史财务选择保留历史含义',()=>{const d=dataset();d.feeds.valuation.asOf=null;const q=assessQuality(d,row(),row().period_end_ms);assert.equal(q[0].status,'historical');assert.equal(q[1].status,'unknown');});
test('摘要条款与实际证据绑定，未知项不能自动变成事实',()=>{const m=diagnose(dataset());const answer=materializeSelection(selection(),m);assert.ok(answer.summary.includes(m.evidence.find(e=>e.id==='cash').title));assert.ok(answer.summaryEvidenceIds.includes('inventory'));assert.equal(answer.claims.find(c=>c.id==='inventory').kind,'待验证');});
let n=0;
const api=()=>import(`../.sites-runtime/tests/api.mjs?case=${n++}`);
const request=q=>new Request('http://localhost/api/diagnose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,days:120})});
const modelReply=a=>new Response(JSON.stringify({id:'synthetic',choices:[{message:{content:JSON.stringify(a)}}]}));
test('API 过期估值直接停止，不调用模型',async()=>{globalThis.auditDataset=dataset();globalThis.auditDataset.feeds.valuation.asOf=1;let calls=0;globalThis.fetch=async()=>{calls++;return modelReply(selection())};const r=await(await api()).POST(request('当前估值如何'));assert.equal(r.status,409);assert.equal(calls,0);});
test('API 旧行情夹带新日期无效价格时停止解读，不调用模型',async()=>{
 globalThis.auditDataset=dataset();const now=Date.now(),day=86400000;
 globalThis.auditDataset.feeds.history.rows=[{date_ms:now-100*day,close_price:100},{date_ms:now-99*day,close_price:110},{date_ms:now-day,close_price:null}];
 let calls=0;globalThis.fetch=async()=>{calls++;return modelReply(selection())};
 const r=await(await api()).POST(request('当前股价走势如何'));assert.equal(r.status,409);assert.equal((await r.json()).errorCode,'DATA_FRESHNESS');assert.equal(calls,0);
});
test('API 过期最新财报停止，不能生成正常当前判断',async()=>{globalThis.auditDataset=dataset();globalThis.auditDataset.feeds['000333.SZ:income-statements'].rows[0]={...row(),period_end_ms:1,fiscal_year:1970};let calls=0;globalThis.fetch=async()=>{calls++;return modelReply(selection())};const r=await(await api()).POST(request('利润情况如何'));assert.equal(r.status,409);assert.equal(calls,0);});
test('API 有效选择返回可追溯摘要与反证',async()=>{globalThis.auditDataset=dataset();globalThis.fetch=async()=>modelReply(selection());const r=await(await api()).POST(request('利润情况如何'));const d=await r.json();assert.equal(r.status,200);assert.equal(d.mode,'evidence_guided');assert.ok(d.summaryItems.every(x=>x.evidenceIds.length));});
test('API 无效选择最多纠正一次，失败不伪装为模型成功',async()=>{globalThis.auditDataset=dataset();let calls=0;globalThis.fetch=async()=>{calls++;return modelReply({...selection(),focusIds:['invented','cash']})};const r=await(await api()).POST(request('利润情况如何'));assert.equal(r.status,502);assert.equal(calls,2);});
test('API 交易问题不调用模型',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected')};const r=await(await api()).POST(request('我该不该入场'));assert.equal((await r.json()).guardrail,true);assert.equal(calls,0);});

test('系统补充反证须标记来源，且不能修复伪造主引用',()=>{const r=completeCounterpoint({...selection(),counterpointId:'cash'},catalog);assert.equal(r.supplemented,true);assert.equal(validateAnswer(r.answer,catalog).counterpointId,'inventory');const bad=completeCounterpoint({...selection(),focusIds:['cash','invented']},catalog);assert.throws(()=>validateAnswer(bad.answer,catalog),/AI_INVALID_EVIDENCE/);});
