import {cards} from './profile';
import type {Entry, Settings} from './finance';
export const localDay = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function monthDate(month:string,day:number,offset=0){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`}
export type Charge={id:string;purchaseId:string;label:string;card:string;number:number;count:number;amount:number;close:string;due:string};
export type Bill={id:string;card:string;close:string;due:string;charges:Charge[];total:number;paid:number;remaining:number};
export function schedule(e:Entry,s:Settings):Charge[]{
 if(e.kind!=='card')return [];
 const count=e.installments??1,first=e.firstInstallment??1;
 const config=cards(s).find(c=>c.id===(e.card||'Nubank'));
 const closeDay=e.closeDay??config?.close??0;
 const dueDay=e.dueDay??config?.due??0;
 // Legacy records without configured dates stay in their original calendar month.
 let month=e.firstMonth??e.date.slice(0,7);
 if(!e.firstMonth&&closeDay&&e.date>=monthDate(month,closeDay))month=monthDate(month,1,1).slice(0,7);
 return Array.from({length:count-first+1},(_,i)=>{
 const number=first+i;const close=monthDate(month,closeDay||31,i);
 let due=monthDate(close.slice(0,7),dueDay||31);
 if(due<close)due=monthDate(close.slice(0,7),dueDay||31,1);
 return {id:`${e.id}:${number}`,purchaseId:e.id,label:e.label,card:e.card||'Nubank',number,count,amount:Math.floor(e.amount/count)+(number<=e.amount%count?1:0),close,due};
 });
}
export function bills(entries:Entry[],s:Settings):Bill[]{
 const map=new Map<string,Bill>();
 const payments=entries.filter(e=>e.kind==='payment').flatMap(e=>e.allocations??[]);
 for(const e of entries)for(const c of schedule(e,s)){
 const id=`${c.card}:${c.close}`;let b=map.get(id);
 if(!b){b={id,card:c.card,close:c.close,due:c.due,charges:[],total:0,paid:0,remaining:0};map.set(id,b)}
 const paid=Math.min(c.amount,payments.filter(p=>p.chargeId===c.id).reduce((a,p)=>a+p.amount,0));
 b.charges.push(c);b.total+=c.amount;b.paid+=paid;b.remaining+=c.amount-paid;
 }
 return [...map.values()].sort((a,b)=>a.close.localeCompare(b.close)||a.card.localeCompare(b.card));
}
export function paymentFor(bill:Bill,entries:Entry[],date:string,account?:string,name=bill.card):Entry{
 if(bill.close>date)throw Error('Aguarde o fechamento para registrar o pagamento.');
 if(bill.remaining<=0)throw Error('Esta fatura já está paga.');
 const paid=entries.filter(e=>e.kind==='payment').flatMap(e=>e.allocations??[]);
 const allocations=bill.charges.map(c=>({chargeId:c.id,amount:c.amount-paid.filter(p=>p.chargeId===c.id).reduce((a,p)=>a+p.amount,0)})).filter(p=>p.amount>0);
 return {id:crypto.randomUUID(),label:`Pagamento ${name} · ${bill.close}`,kind:'payment',card:bill.card,...(account?{account}:{}),date,amount:allocations.reduce((a,p)=>a+p.amount,0),allocations};
}
export function cardReserve(entries:Entry[],s:Settings,today:string){
 const all=bills(entries,s);let reserve=0;
 for(const card of new Set(all.map(b=>b.card))){
 const open=all.filter(b=>b.card===card&&b.remaining>0);
 const next=open.find(b=>b.close>=today)?.close;
 reserve+=open.filter(b=>b.close<=today||b.close===next).reduce((a,b)=>a+b.remaining,0);
 }
 return reserve;
}

// Freeze the effective cycle before changing account/card configuration.
export function preserveCardCycles(entries:Entry[],settings:Settings){return entries.map(e=>{if(e.kind!=='card'||(e.closeDay&&e.dueDay&&e.firstMonth))return e;const first=schedule(e,settings)[0],config=cards(settings).find(c=>c.id===(e.card??'Nubank'));return {...e,closeDay:e.closeDay||config?.close||31,dueDay:e.dueDay||config?.due||31,firstMonth:e.firstMonth??first?.close.slice(0,7)??e.date.slice(0,7)}})}
