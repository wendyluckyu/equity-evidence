# 数据字典与追溯口径

| 字段 | 含义 | 原始单位 | 使用限制 |
|---|---|---|---|
| operating_income | 营业收入 | 人民币元 | 不等同营业总收入；年初至期末累计 |
| operating_costs | 营业成本 | 人民币元 | 毛利率分子使用此字段 |
| operating_expenses | 营业总成本 | 人民币元 | 不用于计算毛利率 |
| net_profit | 合并净利润 | 人民币元 | 与合并现金流口径配对 |
| parent_holder_net_profit | 归母净利润 | 人民币元 | 不等同扣非归母净利润 |
| act_cash_flow_net | 经营活动现金流量净额 | 人民币元 | 年初至期末累计 |
| accounts_receivable | 应收账款 | 人民币元 | 期末余额；增长快不直接证明回款恶化 |
| total_debt | 负债合计 | 人民币元 | **不是有息债务**；禁止误标 |
| assets_total | 资产总计 | 人民币元 | 期末值 |
| pe_ttm | 市盈率 TTM | 倍 | 当前快照；负值不可按低估解释 |
| pb_mrq | 市净率 MRQ | 倍 | 数据已取回，本版不作为主指标展示 |
| close_price | 前复权日收盘价 | 元/股 | 不等同现金分红再投资总回报 |
| date_ms | K 线所属日 | Unix 毫秒 | 按 Asia/Shanghai 显示 |
| report_date_ms | 上游报告披露日 | Unix 毫秒 | 历史行可能反映最新重述，非 point-in-time |
| period_end_ms | 报告期末 | Unix 毫秒 | 累计截止时点，不是发布时间 |
| data.timestamp | 上游有效时间 | Unix 毫秒或空 | 快照最大有效时间不能当最后交易日 |

表中人民币金额适用于 `currency=CNY` 的财务记录。原始证据按源记录币种显示，币种缺失标注“币种未知（单位未确认）”；非 CNY 或币种缺失的数据不参与人民币指标计算，不擅自换算。

## 证据对象

每条证据包含 `id / dimension / direction / kind / formula / boundary / next / raw[]`。
`direction` 是支持、负面、矛盾、未知或中性；`kind` 是事实、推断、待验证。这是两条独立分类轴。
原始行保留字段、值、币种与单位、报告期、来源、披露日、请求 ID 和不带密钥的查询地址。公告来源保留原文 URL 和页码。

## 公告原文

- [美的 2026 半年度报告，第 7 页主要指标及口径解释](https://disc.static.szse.cn/disc/disk03/finalpage/2026-08-29/df25443f-d67a-4cc5-8bd6-6c3e681a9575.PDF#page=7)
- [美的 2026 半年度报告摘要，第 4 页重要事项](https://static.cninfo.com.cn/finalpage/2026-08-29/1225531403.PDF#page=4)
- [扶摇财务接口定义](https://fuyao.aicubes.cn/docs/api-reference/financials/)
- [扶摇行情接口定义](https://fuyao.aicubes.cn/docs/api-reference/prices/)
- [扶摇估值接口定义](https://fuyao.aicubes.cn/docs/api-reference/valuations/)

公告指标原文单位为千元，转人民币元须乘 1,000，页面展示亿元再除以 100,000,000。EPS 是元/股，不能套用金额换算。

本版以报告原文披露的归母增长和扣非下降作为矛盾研究案例，不将两者误判为数据供应商冲突；数据供应商与公告在相同字段、相同期次和单位下不一致才属于来源冲突。
