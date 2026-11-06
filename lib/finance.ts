import {cardReserve,localDay} from './cards';
export type Entry = {id:string; label:string; amount:number; kind:'income'|'expense'|'card'|'father'|'payment'; date:string; card?:string; installments?:number; firstInstallment?:number; firstMonth?:string; closeDay?:number; dueDay?:number; allocations?:{chargeId:string;amount:number}[]};
export type Settings = {balance:number; savings:number; salary:number; guarantee:number; variable:number; reserve:number; nuCap:number; fatherOpening:number; fatherStart:string; nuClose:number; nuDue:number; c6Close:number; c6Due:number};
export const defaults:Settings={balance:0,savings:0,salary:98800,guarantee:20000,variable:0,reserve:0,nuCap:40000,fatherOpening:0,fatherStart:new Date().toISOString().slice(0,7),nuClose:0,nuDue:0,c6Close:0,c6Due:0};
export const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export function cents(s:string){const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<0)throw Error('Informe um valor válido.');return Math.round(n*100)}
export function summary(s:Settings,entries:Entry[],today?:Date){
 const day=today?today.toISOString().slice(0,10):localDay();
 today=new Date(day+'T12:00:00Z');
 entries=entries.filter(e=>e.date<=day);
 const paid=entries.filter(e=>e.kind==='father').reduce((a,e)=>a+e.amount,0);
 const start=s.fatherStart.split('-').map(Number); const months=Math.max(0,(today.getFullYear()-start[0])*12+today.getMonth()+1-start[1]+1);
 const cash=s.balance+s.savings+entries.reduce((a,e)=>a+(e.kind==='income'||e.kind==='father'?e.amount:(e.kind==='expense'||e.kind==='payment')?-e.amount:0),0);
 const cards=cardReserve(entries,s,day);
 return {cash,cards,available:cash-cards-s.guarantee-s.variable-s.reserve,father:Math.max(0,s.fatherOpening+months*30000-paid)};
}
export function simulate(price:number,count:number,available:number,monthly:number){return Array.from({length:count},(_,i)=>{const installment=Math.floor(price/count)+(i<price%count?1:0);return {month:i+1,installment,remaining:(i===0?available:monthly)-installment}})}
