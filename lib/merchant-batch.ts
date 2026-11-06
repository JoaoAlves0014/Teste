import {merchantKey,merchantSearchName} from './merchant';
import {normalizeReport,ReportTransaction,ruleFor,StatementStore} from './statement-types';
export type MerchantGroup={key:string;query:string;ids:string[];descriptions:string[];searchable:boolean};
export const isUnknownExpense=(t:ReportTransaction)=>!t.reviewed&&t.kind==='expense'&&normalizeReport(t.category)==='nao categorizado';
const groupKey=(t:ReportTransaction)=>merchantKey(t.description)??'manual:'+normalizeReport(t.description);
export function groupUnknownMerchants(rows:ReportTransaction[]):MerchantGroup[]{
 const groups=new Map<string,MerchantGroup>();
 for(const t of rows){if(!isUnknownExpense(t))continue;const key=groupKey(t),existing=groups.get(key);if(existing){existing.ids.push(t.id);if(!existing.descriptions.includes(t.description))existing.descriptions.push(t.description)}else groups.set(key,{key,query:merchantSearchName(t.description),ids:[t.id],descriptions:[t.description],searchable:!!merchantKey(t.description)})}
 return [...groups.values()];
}
export type MerchantApproval={key:string;ids:string[];category:string};
export function applyMerchantApprovals(store:StatementStore,approvals:MerchantApproval[],remember=false){
 const byId=new Map<string,MerchantApproval>();for(const a of approvals){if(!a.category.trim()||a.category.length>80||normalizeReport(a.category)==='nao categorizado')continue;for(const id of a.ids)byId.set(id,a)}
 let count=0,rules=store.rules;const remembered=new Set<string>();
 const transactions=store.transactions.map(t=>{const a=byId.get(t.id);if(!a||!isUnknownExpense(t)||groupKey(t)!==a.key)return t;const next={...t,category:a.category.trim(),reviewed:true};count++;
 if(remember&&!remembered.has(a.key)){remembered.add(a.key);const rule=ruleFor(next,store.documents.find(d=>d.id===t.documentId)?.type??'bank');rules=[rule,...rules.filter(r=>normalizeReport(r.description)!==normalizeReport(t.description)&&(!rule.merchantKey||(r.merchantKey??merchantKey(r.description))!==rule.merchantKey))].slice(0,500)}return next});
 return {store:{...store,transactions,rules},count};
}
