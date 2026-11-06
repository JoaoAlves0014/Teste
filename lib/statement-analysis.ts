import {ReportKind,ReportTransaction,StatementStore,normalizeReport,ReportDocument,ruleFor} from './statement-types';
export type ReportFilter={from:string;to:string;bank:string;document:string;basis?:'transaction'|'statement'};
export function statementDate(t:ReportTransaction,document:ReportDocument|undefined,basis?:string){return basis==='statement'&&document?.type==='card'&&document.statementMonth?document.statementMonth+'-01':t.date}
export function filterStatements(store:StatementStore,f:ReportFilter){const docs=new Map(store.documents.map(d=>[d.id,d]));return store.transactions.filter(t=>{const d=docs.get(t.documentId),date=statementDate(t,d,f.basis);return d&&(!f.from||date>=f.from)&&(!f.to||date<=f.to)&&(f.bank==='all'||!f.bank||d.bank===f.bank)&&(f.document==='all'||!f.document||t.documentId===f.document)}).sort((a,b)=>b.date.localeCompare(a.date));}
export function analyzeStatements(rows:ReportTransaction[],from?:string,to?:string,dateOf:(t:ReportTransaction)=>string=t=>t.date){
 let expenses=0,income=0,refunds=0,excluded=0,unreviewed=0;const categories=new Map<string,number>(),months=new Map<string,{month:string;expenses:number;income:number;refunds:number;count:number}>();
 if(from&&to){const start=new Date(from.slice(0,7)+'-01T12:00:00Z'),end=to.slice(0,7);for(let i=0;i<240;i++){const month=start.toISOString().slice(0,7);if(month>end)break;months.set(month,{month,expenses:0,income:0,refunds:0,count:0});start.setUTCMonth(start.getUTCMonth()+1)}}
 for(const t of rows){const key=dateOf(t).slice(0,7);let m=months.get(key);if(!m){m={month:key,expenses:0,income:0,refunds:0,count:0};months.set(key,m)}m.count++;if(!t.reviewed)unreviewed++;
 if(t.kind==='expense'){expenses+=t.amount;m.expenses+=t.amount;categories.set(t.category,(categories.get(t.category)??0)+t.amount)}else if(t.kind==='income'){income+=t.amount;m.income+=t.amount}else if(t.kind==='refund'){refunds+=t.amount;m.refunds+=t.amount;categories.set(t.category,(categories.get(t.category)??0)-t.amount)}else excluded++;
 }
 return {expenses,income,refunds,netExpenses:expenses-refunds,result:income-expenses+refunds,excluded,unreviewed,categories:[...categories].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount),months:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month))};
}
export function editReportTransaction(store:StatementStore,edited:ReportTransaction,remember=false){
 let rules=store.rules;if(remember){rules=[...rules.filter(r=>normalizeReport(r.description)!==normalizeReport(edited.description)),ruleFor(edited,store.documents.find(d=>d.id===edited.documentId)?.type??'bank')].slice(-500)}
 return {...store,rules,transactions:store.transactions.map(t=>t.id===edited.id?{...edited,documentId:t.documentId,sourceKey:t.sourceKey,reviewed:true}:t)};
}
