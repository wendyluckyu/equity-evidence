'use client';
import {useState} from 'react';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {verificationPlans} from '@/lib/research';
import {filing} from '@/lib/filings';
import type {Evidence} from '@/lib/diagnosis';
export default function VerificationPlan({evidence,onNavigate,note,onSave}:{evidence:Evidence;onNavigate:(target:string)=>void;note:string;onSave:(text:string)=>void}){
 const plan=verificationPlans[evidence.id]||verificationPlans.inventory;const [draft,setDraft]=useState(note);const [saved,setSaved]=useState(false);
 return <div className="verification-plan"><h4>验证路径</h4><dl><dt>需要补充</dt><dd>{plan.fields}</dd><dt>核对方法</dt><dd>{plan.method}</dd><dt>检索位置</dt><dd>所选报告期报告及附注，关键词：{plan.keyword}。</dd></dl><div className="verification-actions"><button onClick={()=>onNavigate(plan.target)}>打开{plan.target==='peers'?'同行比较':plan.target==='market'?'行情与公告':'财务数据'}</button><a href={filing.url} target="_blank" rel="noreferrer">2026 中报原文</a></div><p className="muted">原文链接仅对应 2026 中报；研究其他期次请在公告平台检索对应报告。后续公告可在<a href="https://www.cninfo.com.cn/" target="_blank" rel="noreferrer">巨潮资讯</a>检索“000333”。</p><label htmlFor={'note-'+evidence.id}>核查记录</label><Textarea id={'note-'+evidence.id} value={draft} maxLength={1500} onChange={e=>{setDraft(e.target.value);setSaved(false);}} placeholder="记录原文页码、发现的事实，以及支持或不支持原判断的原因。"/><Button variant="outline" disabled={!draft.trim()} onClick={()=>{onSave(draft);setSaved(true);}}>保存本次记录</Button><p className="muted" role="status">{saved?'记录已保存。':'记录仅保留在本次页面会话。'}用户记录不会自动变成已验证事实，也不会发送给模型。</p></div>;
}
