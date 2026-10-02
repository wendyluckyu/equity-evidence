import test from 'node:test';
import assert from 'node:assert/strict';
import {ratio,growth,margin,priceStats,eligibleRows,samePeriod,selectDimensions,isAdvice} from '../lib/finance.mjs';
import {validateAnswer} from '../lib/ai-guard.mjs';
import {diagnose} from '../.sites-runtime/tests/diagnosis.mjs';
// All records are synthetic; no licensed market responses are stored in this repository.
const row=(year,quarter,extra={})=>({fiscal_year:year,fiscal_period:quarter,period_end_ms:Date.UTC(year,quarter==='Q2'?5:2,30),report_date_ms:Date.UTC(year,7,29),currency:'CNY',...extra});
const feed=rows=>({id:'fixture',url:'https://example.invalid/synthetic',asOf:1,fetchedAt:1,status:rows.length?'ok':'empty',rows});
const synthetic=()=>({fetchedAt:Date.now(),companies:[{code:'000333.SZ',name:'测试公司'}],feeds:{'000333.SZ:income-statements':feed([row(2026,'Q2',{operating_income:1200,operating_costs:800,parent_holder_net_profit:120,net_profit:150}),row(2025,'Q2',{operating_income:1000,parent_holder_net_profit:100,net_profit:125})]),'000333.SZ:cash-flow-statements':feed([row(2026,'Q2',{act_cash_flow_net:180,pay_fixed_assets_etc_cash:30}),row(2025,'Q2',{act_cash_flow_net:160})]),'000333.SZ:balance-sheets':feed([]),valuation:feed([]),history:feed([])}});
test('同口径累计同比：半年累计不与一季度比较',()=>{const rows=[row(2026,'Q1',{operating_income:600}),row(2025,'Q2',{operating_income:1000})];assert.equal(samePeriod(rows,row(2026,'Q2'),true).operating_income,1000);assert.ok(Math.abs(growth(1200,1000)-20)<1e-9);});
test('零、负基数及缺失不生成正常增长',()=>{for(const n of [0,-1,null,undefined,NaN])assert.equal(growth(20,n),null);assert.equal(ratio(null,20),null);assert.equal(ratio(20,0),null);assert.equal(growth(0,10),-100);});
test('毛利率按营业成本而非营业总成本计算',()=>assert.ok(Math.abs(margin(100,60)-40)<1e-9));
test('仅纳入分析时点已披露记录',()=>{const now=Date.UTC(2026,9,2);assert.equal(eligibleRows([{period_end_ms:1,report_date_ms:now+1},{period_end_ms:1,report_date_ms:null},{period_end_ms:1,report_date_ms:2}],now).length,1);});
test('现金流覆盖分母为合并净利润，不是归母利润',()=>{const d=diagnose(synthetic());assert.equal(d.metrics.cashRatio,1.2);assert.notEqual(d.metrics.cashRatio,1.5);});
test('币种不明不继续计算',()=>{const d=synthetic();d.feeds['000333.SZ:income-statements'].rows[0].currency='USD';assert.equal(diagnose(d).metrics.revenue,null);});
test('证据金额标注源币种，缺失币种不冒充人民币且不擅自换算',()=>{
 for(const [currency,unit] of [['CNY','元 CNY'],['USD','美元 USD'],['HKD','港元 HKD'],['EUR','EUR'],[undefined,'币种未知（单位未确认）'],[null,'币种未知（单位未确认）'],['','币种未知（单位未确认）']]){
  const d=synthetic();d.feeds['000333.SZ:income-statements'].rows[0].currency=currency;
  const model=diagnose(d),raw=model.evidence.find(e=>e.id==='growth').raw[0];
  assert.equal(raw.value,1200);assert.equal(raw.unit,unit);assert.equal(model.peers[0].raw[0].unit,unit);assert.equal(model.metrics.revenue,currency==='CNY'?1200:null);
 }
});
test('缺失现金流标记未知，原始字段保留空值',()=>{const d=synthetic();d.feeds['000333.SZ:cash-flow-statements']=feed([]);const e=diagnose(d).evidence.find(e=>e.id==='cash');assert.equal(e.kind,'待验证');assert.equal(e.direction,'unknown');assert.equal(e.raw[0].value,null);});
test('与公告原文冲突会被识别',()=>assert.equal(diagnose(synthetic()).checks[0].status,'conflict'));
test('切换历史期不冒用最新中报扣非证据',()=>{const d=synthetic();const m=diagnose(d,Date.UTC(2025,5,30));assert.equal(m.evidence.some(e=>e.id==='core'),false);assert.equal(m.cur.fiscal_year,2025);});
test('股价区间排序和最大回撤',()=>{const d=priceStats([{date_ms:3,close_price:90},{date_ms:1,close_price:100},{date_ms:2,close_price:120}]);assert.ok(Math.abs(d.change+10)<1e-9);assert.equal(d.maxDrawdown,-25);assert.equal(priceStats([]).change,null);assert.equal(priceStats([{date_ms:1,close_price:10}]).maxDrawdown,null);});
test('用户问题改变优先诊断维度',()=>{assert.equal(selectDimensions('估值贵吗').dimensions[0],'估值');assert.equal(selectDimensions('有哪些风险').dimensions[0],'风险');assert.equal(selectDimensions('现金流支撑').dimensions[0],'经营质量');});
test('直接交易、承诺收益、目标价被识别',()=>{for(const q of ['现在能买吗','给我买入点','预测目标价','保证收益','should I buy'])assert.equal(isAdvice(q),true);assert.equal(isAdvice('有哪些经营风险'),false);});
