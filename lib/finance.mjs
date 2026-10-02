export const valid = (n) => typeof n === 'number' && Number.isFinite(n);
export const ratio = (a,b) => valid(a) && valid(b) && b > 0 ? a/b : null;
export const growth = (a,b) => valid(a) && valid(b) && b > 0 ? (a/b-1)*100 : null;
export const margin = (r,c) => valid(r)&&valid(c)&&r>0 ? (r-c)/r*100 : null;
export const difference = (a,b) => valid(a)&&valid(b) ? a-b : null;
export const dateCN = (ms) => valid(ms) ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(ms) : '未知';
export const periodName = (r) => !r ? '报告期未知' : `${r.fiscal_year}${({Q1:'一季报',Q2:'中报',Q3:'三季报',Q4:'年报',FY:'年报'})[r.fiscal_period] || r.fiscal_period}`;
export function eligibleRows(rows, now=Date.now()) { return rows.filter(r=>valid(r.period_end_ms)&&valid(r.report_date_ms)&&r.period_end_ms<=now&&r.report_date_ms<=now).sort((a,b)=>b.period_end_ms-a.period_end_ms); }
export function samePeriod(rows,current,previous=false) { return current ? rows.find(r=>r.fiscal_year===current.fiscal_year-(previous?1:0)&&r.fiscal_period===current.fiscal_period) : undefined; }
export function validPriceBars(rows,now=Date.now()) {
 const unique=new Map();for(const r of rows)if(valid(r.close_price)&&r.close_price>0&&valid(r.date_ms)&&r.date_ms<=now)unique.set(r.date_ms,r);
 return [...unique.values()].sort((a,b)=>a.date_ms-b.date_ms);
}
export function priceStats(rows,days=120,now=Date.now()) {
 const bars=validPriceBars(rows,now).slice(-days);
 let peakRow=bars[0],drawdownPeak=bars[0],drawdownTrough=bars[0],maxDrawdown=0;
 for(const r of bars){if(r.close_price>peakRow.close_price)peakRow=r;const drop=(r.close_price/peakRow.close_price-1)*100;if(drop<maxDrawdown){maxDrawdown=drop;drawdownPeak=peakRow;drawdownTrough=r;}}
 return {bars,drawdownPeak,drawdownTrough,change:bars.length>=2?growth(bars.at(-1).close_price,bars[0].close_price):null,maxDrawdown:bars.length>=2?maxDrawdown:null};
}
export function selectDimensions(question) {
 if(/估值|便宜|贵|市盈|同行/.test(question)) return {focus:'估值与同行',dimensions:['估值','行业位置','财务趋势','经营质量','行情特征','重要事件','风险'],reason:'家电制造企业：先比较同口径估值，再用盈利质量和业务结构解释差异。'};
 if(/风险|矛盾|反证|扣非|汇率/.test(question)) return {focus:'矛盾与风险',dimensions:['风险','重要事件','经营质量','财务趋势','估值','行业位置','行情特征'],reason:'优先寻找反证与未知项，重点核对归母与扣非利润的口径差异。'};
 if(/行情|股价|走势|涨跌|回撤/.test(question)) return {focus:'行情与基本面',dimensions:['行情特征','财务趋势','重要事件','估值','风险','经营质量','行业位置'],reason:'先描述已发生的行情，再检查基本面与事件；价格变化不构成因果证据。'};
 return {focus:'盈利与现金流',dimensions:['经营质量','财务趋势','风险','估值','行业位置','行情特征','重要事件'],reason:'家电制造企业：优先核对盈利、回款和应收占用，再联系估值及外部风险。'};
}
export function isAdvice(q){
 const direct=/我.*(该|要|能|适合|可以|应不应|应否).*(买|卖|入场|出场|上车|抄底|持有)|买不买|买还是卖|能买吗|能买|该买|该卖|买卖点|目标价|保证.*(收益|赚钱|不.*亏)|稳赚|必涨|必跌|涨到|跌到|推荐.*仓位|建议.*(加仓|减仓|买|卖)|should I (buy|sell)|buy now|sell now|target price|guaranteed return/i;
 if(direct.test(q))return true;
 if(/(解释|核对|公告|公司|股份|回购|交易记录)/.test(q)&&!/(给我|建议我|推荐我)/.test(q))return false;
 return /买入|卖出|加仓|减仓|入场|出场|抄底|上车|建仓|清仓|稳赚|保本|不亏|buy|sell/i.test(q);
}
