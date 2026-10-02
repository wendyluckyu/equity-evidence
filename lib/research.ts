import type {Dataset} from './market';
import type {Evidence} from './diagnosis';
import {dateCN,valid,validPriceBars} from './finance.mjs';
import {filing} from './filings';
export type DataQuality={id:string;label:string;status:'available'|'historical'|'missing'|'stale'|'unknown';asOf:string;message:string};
export function assessQuality(data:Dataset,cur:any,selected?:number,now=Date.now()):DataQuality[]{
 const day=86400000;
 const status=(id:string,label:string,stamp:any,exists:boolean,maxDays:number):DataQuality=>({id,label,asOf:dateCN(stamp),status:!exists?'missing':!valid(stamp)||stamp>now?'unknown':now-stamp>maxDays*day?'stale':'available',message:!exists?'数据缺失，不作正常判断。':!valid(stamp)||stamp>now?'有效时点无法确认。':now-stamp>maxDays*day?'超过本产品时效阈值，仅供历史核对。':'在本产品时效阈值内；不代表实时或完整覆盖。'});
 const financial=status('financial','财务',cur?.period_end_ms,!!cur,200);
 if(selected&&cur&&selected===cur.period_end_ms){financial.status='historical';financial.message='按用户选择的报告期研究，不代表当时可知信息的回测。';}
 const bars=validPriceBars(data.feeds.history?.rows||[],now);
 return [financial,status('valuation','估值',data.feeds.valuation?.asOf,!!data.feeds.valuation?.rows.length,10),status('market','行情',bars.at(-1)?.date_ms??null,bars.length>=2,10),{id:'event',label:'公告资料',status:'historical',asOf:filing.published,message:'仅整理所列半年报及摘要，不能判断此后是否出现新事件。'}];
}
export const verificationPlans:Record<string,{fields:string;method:string;keyword:string;target:string}>={
 cash:{fields:'经营性应收、存货、经营性应付及其他现金流调整项目',method:'在同报告期现金流量表补充资料中，对照净利润到经营现金流的调节项，区分回款改善与延后付款。',keyword:'现金流量表补充资料',target:'financial'},
 growth:{fields:'归母净利润、扣非归母净利润、非经常性损益明细',method:'按同一报告期对齐同比，检查两种利润的差异来自哪些损益项目。',keyword:'非经常性损益',target:'financial'},
 receivable:{fields:'应收账龄、坏账准备、信用减值损失与营业收入',method:'比较期末应收增速与同期收入增速，再比较逾期占比及坏账计提；余额增长本身不能证明回款恶化。',keyword:'应收账款',target:'financial'},
 core:{fields:'汇兑损益、衍生工具损益及其列报分类',method:'核对半年报非经常性损益表和相关附注，检验公司对扣非差异的解释，不能据此假定套期完全抵消。',keyword:'汇兑损益、衍生金融',target:'financial'},
 inventory:{fields:'存货分类、跌价准备、账龄和现金流调节表',method:'寻找所选报告期及上年同期附注，区分数量增长、价格变化和减值；没有原文数据时保持未验证。',keyword:'存货、坏账准备',target:'financial'},
 valuation:{fields:'当前 PE TTM、盈利增速、业务分部与海外收入',method:'在同一估值时点比较三家公司，再结合业务结构解释差异；不能用当前 PE 推断历史估值分位。',keyword:'分部信息',target:'peers'},
 peers:{fields:'同报告期收入、毛利率、现金流及分部结构',method:'先比较集团指标，再核对家电与工业业务、境内外业务的占比；三家样本不是行业市场份额排名。',keyword:'分部信息、主营业务',target:'peers'},
 market:{fields:'区间首末收盘价、回撤峰值与谷值、对应交易日期',method:'保持前复权与同一区间口径；将事件日期与价格变化对照，仅作时间关联，不作因果结论。',keyword:'重大事项',target:'market'},
 event:{fields:'转股条件、到期安排、资金用途与后续进展',method:'先核对已列公告，再检索此后公告；计划用途不等于已实现回报。',keyword:'可转换债券',target:'market'},
};
export function buildInsights(evidence:Evidence[]){return evidence.map(e=>({id:e.id,dimension:e.dimension,direction:e.direction,kind:e.direction==='unknown'?'待验证':'分析推断',text:`${e.title}。${e.body} ${e.boundary}`,evidenceIds:[e.id],next:e.next}));}
export function materializeSelection(selection:any,model:any){
 const catalog=buildInsights(model.evidence);const lookup=(id:string)=>catalog.find(c=>c.id===id)!;
 const ids=Array.from(new Set<string>([...selection.focusIds,selection.counterpointId]));
 const claims=ids.map(lookup);const summaryIds=Array.from(new Set<string>([...selection.summaryIds,selection.counterpointId]));
 return {summary:summaryIds.map(id=>lookup(id).text).join('\n'),summaryItems:summaryIds.map(lookup),summaryEvidenceIds:summaryIds,claims,focusDimensions:Array.from(new Set(claims.map(c=>c.dimension))),questions:selection.questionIds.map((id:string)=>lookup(id).next),selection,mode:'evidence_guided',scope:selection.scope};
}
