import {bills,localDay,monthDate,schedule} from './cards';
import {salaryCycle,salaryDate} from './calendar';
import {Entry,Settings,summary} from './finance';
export type Event={id:string;date:string;label:string;amount:number;kind:'salary'|'card'|'plan'|'budget'|'income'|'expense'|'purchase';planId?:string;planDate?:string;proposed?:boolean};
export function plannedExpenses(entries:Entry[],until:string):Event[]{
 const result:Event[]=[];
 for(const plan of entries.filter(e=>e.kind==='plan')){
  const dates:string[]=[];
  if(plan.recurrence!=='monthly')dates.push(plan.date);
  else{const start=plan.date.slice(0,7);for(let i=0;i<1200;i++){const date=monthDate(start,Number(plan.date.slice(-2)),i);if(date>until||date>(plan.endDate??until))break;dates.push(date)}}
  for(const date of dates){if(date>until||entries.some(e=>e.kind==='expense'&&e.planId===plan.id&&e.planDate===date))continue;result.push({id:`plan:${plan.id}:${date}`,date,label:plan.label,amount:-plan.amount,kind:'plan',planId:plan.id,planDate:date})}
 }
 return result;
}
export function settlePlan(event:Event,entries:Entry[],today=localDay()):Entry{
 if(!event.planId||!event.planDate||event.date>today)throw Error('Registre o pagamento na data prevista ou depois dela.');
 if(entries.some(e=>e.planId===event.planId&&e.planDate===event.planDate))throw Error('Essa despesa já foi paga.');
 return {id:crypto.randomUUID(),kind:'expense',label:event.label,date:today,amount:-event.amount,category:entries.find(p=>p.id===event.planId)?.category,planId:event.planId,planDate:event.planDate};
}
export type Proposal={price:number;count:number;method:'cash'|'Nubank'|'C6 Bank'};
function proposalEvents(p:Proposal,s:Settings,today:string):Event[]{
 if(p.method==='cash')return [{id:'proposal',date:today,label:'Compra simulada à vista',amount:-p.price,kind:'purchase',proposed:true}];
 const close=p.method==='Nubank'?s.nuClose:s.c6Close,due=p.method==='Nubank'?s.nuDue:s.c6Due;
 if(!close||!due)throw Error('Configure fechamento e vencimento do cartão antes de simular.');
 return schedule({id:'proposal',label:'Compra simulada',date:today,kind:'card',card:p.method,amount:p.price,installments:p.count},s).map(c=>({id:c.id,date:c.close,label:`Compra simulada · ${c.number}/${c.count}`,amount:-c.amount,kind:'purchase',proposed:true}));
}
export function forecast(s:Settings,entries:Entry[],today=localDay(),periods=6,proposal?:Proposal){
 const cycle=salaryCycle(today,s.extraHolidays),base=summary(s,entries,new Date(today+'T12:00:00Z'));
 const boundaries=[today,cycle.next];for(let i=1;i<periods;i++)boundaries.push(salaryDate(monthDate(cycle.next.slice(0,7),1,i).slice(0,7),s.extraHolidays));
 const until=boundaries[boundaries.length-1];
 const actual=entries.filter(e=>e.date<=today);
 const paidGuarantee=actual.filter(e=>e.kind==='guarantee'&&e.date>=cycle.start).reduce((a,e)=>a+e.amount,0);
 const spentVariable=actual.filter(e=>e.kind==='expense'&&!e.planId&&e.date>=cycle.start).reduce((a,e)=>a+e.amount,0);
 const guarantee=Math.max(0,s.guarantee-paidGuarantee),variable=Math.max(0,s.variable-spentVariable);
 const events:Event[]=[{id:'current-budget',date:today,label:'Garantia C6 e gastos variáveis restantes',amount:-guarantee-variable,kind:'budget'}];
 for(const b of bills(actual,s))if(b.remaining>0&&b.close<until)events.push({id:b.id,date:b.close<today?today:b.close,label:`Fatura ${b.card} · ${b.close}`,amount:-b.remaining,kind:'card'});
 for(const e of plannedExpenses(entries,until))events.push({...e,date:e.date<today?today:e.date});
 for(const e of entries.filter(e=>e.date>today&&e.date<until))if(['expense','income','father','guarantee'].includes(e.kind))events.push({id:e.id,date:e.date,label:e.label,amount:(e.kind==='income'||e.kind==='father'?1:-1)*e.amount,kind:e.kind==='income'||e.kind==='father'?'income':'expense'});
 for(const pay of boundaries.slice(1,-1)){
 const month=pay.slice(0,7),already=entries.some(e=>e.kind==='income'&&e.salaryMonth===month);
 if(!already)events.push({id:`salary:${month}`,date:pay,label:'Salário previsto',amount:s.salaryOverrides?.[month]??s.salary,kind:'salary'});
 events.push({id:`budget:${pay}`,date:pay,label:'Garantia C6 e gastos variáveis',amount:-s.guarantee-s.variable,kind:'budget'});
 }
 if(proposal)events.push(...proposalEvents(proposal,s,today));
 const ordered=events.filter(e=>e.date<until).sort((a,b)=>a.date.localeCompare(b.date)||(a.amount>=0?-1:1)-(b.amount>=0?-1:1)||a.id.localeCompare(b.id));
 const currentEvents=ordered.filter(e=>e.date<cycle.next);
 const cards=currentEvents.filter(e=>e.kind==='card').reduce((a,e)=>a-e.amount,0);
 const plans=currentEvents.filter(e=>e.kind==='plan'||e.kind==='expense').reduce((a,e)=>a-Math.min(0,e.amount),0);
 // Não antecipa receitas futuras: o disponível de hoje só usa dinheiro já recebido.
 const goalReserved=(s.goals??[]).reduce((a,g)=>a+g.saved,0);
 const available=base.cash-s.reserve-goalReserved+currentEvents.reduce((a,e)=>a+Math.min(0,e.amount),0);
 let balance=base.cash-s.reserve-goalReserved;
 const rows=boundaries.slice(0,-1).map((from,i)=>{
 const end=boundaries[i+1],items=ordered.filter(e=>e.date>=from&&e.date<end);let minimum=balance;let income=0,cost=0,payment=0;
 for(const e of items){balance+=e.amount;minimum=Math.min(minimum,balance);if(e.amount>0)income+=e.amount;else cost-=e.amount;if(e.proposed)payment-=e.amount}
 return {from,until:end,income,cost,remaining:balance,minimum,payment,events:items};
 });
 const credit=proposal?.method==='Nubank'?Math.max(0,400000-bills(actual,s).filter(b=>b.card==='Nubank').reduce((a,b)=>a+b.remaining,0)):null;
 const capExceeded=!!proposal&&proposal.method==='Nubank'&&proposalEvents(proposal,s,today).some(e=>{const existing=bills(actual,s).find(b=>b.card==='Nubank'&&b.close===e.date);return (existing?.total??0)-e.amount>s.nuCap});
 return {goalReserved,nextSalary:cycle.next,cycleStart:cycle.start,available,cash:base.cash,cards,plans,guarantee,variable,rows,events:ordered,viable:rows.every(r=>r.minimum>=0)&&!capExceeded&&(credit===null||!proposal||proposal.price<=credit),capExceeded,credit};
}
export function maximumPurchase(s:Settings,entries:Entry[],today:string,count:number,method:Proposal['method']){
 const periods=Math.max(6,count+3);if(!forecast(s,entries,today,periods).rows.every(r=>r.minimum>=0))return 0;
 let low=0,high=100000000;while(low<high){const mid=Math.ceil((low+high)/2);if(forecast(s,entries,today,periods,{price:mid,count,method}).viable)low=mid;else high=mid-1}return low;
}
