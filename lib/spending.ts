import {cards,accounts,paymentMethods} from './profile';
import {Entry,Settings,cents} from './finance';
import {Bill,bills,localDay,monthDate,schedule} from './cards';
export type SpendingMethod=string;
export type SpendingInput={label:string;value:string;date:string;method:SpendingMethod;category?:string;count?:number;first?:number;firstMonth?:string};
export function createSpending(input:SpendingInput,s:Settings,today=localDay()):Entry{
 const amount=cents(input.value),count=input.count??1,first=input.first??1;
 if(!input.label.trim())throw Error('Informe a descrição do gasto.');
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Informe um valor maior que zero.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||isNaN(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date||input.date>today)throw Error('Informe uma data válida, até hoje.');
 if(!paymentMethods(s).some(([id])=>id===input.method))throw Error('Selecione onde pagou.');
 const base={id:crypto.randomUUID(),label:input.label.trim(),date:input.date,amount,category:input.category??'Sem categoria'};
 if(input.method.startsWith('cash:')){if(count!==1||first!==1)throw Error('Parcelamento está disponível apenas para cartão de crédito.');return {...base,kind:'expense',account:input.method.slice(5)}}
 const config=cards(s).find(c=>c.id===input.method),close=config?.close,due=config?.due;
 if(!close||!due)throw Error('Configure o fechamento e o vencimento deste cartão antes de registrar o gasto.');
 if(!Number.isInteger(count)||count<1||count>120||!Number.isInteger(first)||first<1||first>count||amount<count)throw Error('Confira as parcelas: total de 1 a 120 e parcela inicial até o total.');
 if(input.firstMonth&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.firstMonth))throw Error('Informe um mês de fatura válido.');
 return {...base,kind:'card',card:input.method,installments:count,firstInstallment:first,firstMonth:input.firstMonth||monthDate(input.date.slice(0,7),1,input.date>=monthDate(input.date.slice(0,7),close)?1:0).slice(0,7),closeDay:close,dueDay:due};
}
export type SpendingRow={entry:Entry;method:SpendingMethod;amount:number;firstClose?:string;lastClose?:string;due?:string;parts:number;remaining:number;status:string};
export function spendingRows(entries:Entry[],s:Settings,filters:{month?:string;method?:string;invoice?:string;query?:string}={},today=localDay()):SpendingRow[]{
 const actual=entries.filter(e=>e.date<=today),payments=actual.filter(e=>e.kind==='payment').flatMap(e=>e.allocations??[]);
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const rows:SpendingRow[]=[];
 for(const e of actual){
 if(e.kind!=='card'&&e.kind!=='expense')continue;
 const method:SpendingMethod=e.kind==='card'?(e.card??'Nubank'):'cash:'+(e.account??accounts(s)[0]?.id??'C6');
 if(filters.method&&filters.method!=='all'&&filters.method!==method)continue;
 if(filters.query&&!normalize(e.label).includes(normalize(filters.query.trim())))continue;
 if(!filters.invoice&&filters.month&&e.date.slice(0,7)!==filters.month)continue;
 const all=schedule(e,s),charges=filters.invoice?all.filter(c=>`${c.card}:${c.close}`===filters.invoice):all;
 if(filters.invoice&&!charges.length)continue;
 const remaining=charges.reduce((a,c)=>a+Math.max(0,c.amount-payments.filter(p=>p.chargeId===c.id).reduce((sum,p)=>sum+p.amount,0)),0);
 const late=charges.some(c=>c.due<today&&payments.filter(p=>p.chargeId===c.id).reduce((a,p)=>a+p.amount,0)<c.amount);
 rows.push({entry:e,method,amount:filters.invoice?charges.reduce((a,c)=>a+c.amount,0):e.amount,firstClose:charges[0]?.close,lastClose:charges.at(-1)?.close,due:charges[0]?.due,parts:charges.length,remaining,status:e.kind==='expense'?'Pago':remaining===0?'Pago':late?'Fatura vencida':'A pagar'});
 }
 return rows.sort((a,b)=>b.entry.date.localeCompare(a.entry.date));
}
export function featuredInvoice(entries:Entry[],s:Settings,card:string,today=localDay()):Bill|null{
 const actual=entries.filter(e=>e.date<=today),all=bills(actual,s).filter(b=>b.card===card);
 const pending=all.find(b=>b.remaining>0);if(pending)return pending;
 const config=cards(s).find(c=>c.id===card),closeDay=config?.close,dueDay=config?.due;if(!closeDay||!dueDay)return null;
 const close=monthDate(today.slice(0,7),closeDay,today>monthDate(today.slice(0,7),closeDay)?1:0);
 const existing=all.find(b=>b.close===close);if(existing)return existing;
 let due=monthDate(close.slice(0,7),dueDay);if(due<close)due=monthDate(close.slice(0,7),dueDay,1);
 return {id:`${card}:${close}`,card,close,due,total:0,paid:0,remaining:0,charges:[]};
}
