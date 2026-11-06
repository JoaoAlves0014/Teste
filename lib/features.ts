import {accounts,cardName} from './profile';
import {Entry,Settings,Goal} from './finance';
import {bills,localDay,schedule,monthDate} from './cards';
import {salaryCycle,shiftDay} from './calendar';
import {plannedExpenses} from './forecast';
import {validBackup} from './backup';
export const categories=['Sem categoria','Alimentação','Transporte','Lazer','Compras','Assinaturas','Saúde','Educação','Casa','Empréstimos','Ajustes','Outros'];
export function updateEntry(entries:Entry[],updated:Entry,s:Settings,today=localDay()){
 const original=entries.find(e=>e.id===updated.id);if(!original)throw Error('Registro não encontrado.');
 if(original.kind!==updated.kind)throw Error('O tipo do registro deve ser preservado.');
 const linked=entries.some(e=>e.planId===original.id||e.allocations?.some(a=>a.chargeId.startsWith(original.id+':')));
 if(linked&&['amount','date','installments','firstInstallment','firstMonth','card','closeDay','dueDay','recurrence'].some(key=>original[key as keyof Entry]!==updated[key as keyof Entry]))throw Error('Cancele os pagamentos vinculados antes de alterar valores, datas ou parcelas. Descrição e categoria podem ser corrigidas.');
 if((original.kind==='payment'||original.planId)&&original.amount!==updated.amount)throw Error('O valor deste pagamento está vinculado. Cancele o pagamento e registre novamente para corrigir o valor.');
 if(updated.kind!=='plan'&&updated.date>today)throw Error('A data de um lançamento realizado não pode estar no futuro.');
 const next=entries.map(e=>e.id===updated.id?updated:original.kind==='plan'&&e.planId===original.id?{...e,category:updated.category}:e);
 if(!validBackup({settings:s,entries:next}))throw Error('Confira valor, data e vínculos com pagamentos. A alteração não foi salva.');
 return next;
}
export function categoryTotals(entries:Entry[],s:Settings,month:string,today=localDay()){
 const totals=new Map<string,number>();const add=(category:string|undefined,amount:number)=>totals.set(category||'Sem categoria',(totals.get(category||'Sem categoria')??0)+amount);
 for(const e of entries.filter(e=>e.date<=today)){
 if(e.kind==='expense'&&e.date.slice(0,7)===month)add(e.category??entries.find(p=>p.id===e.planId)?.category,e.amount);
 if(e.kind==='card')for(const c of schedule(e,s))if(c.close.slice(0,7)===month)add(e.category,c.amount);
 }
 return [...totals.entries()].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount||a.category.localeCompare(b.category));
}
export function accountBalance(s:Settings,entries:Entry[],account:string,date=localDay()){
 let amount=accounts(s).find(a=>a.id===account)?.opening??0;
 for(const e of entries.filter(e=>e.date<=date&&((e.account??accounts(s)[0]?.id??'C6')===account||e.kind==='transfer'&&e.toAccount===account))){
 if(e.kind==='transfer'){amount+=(e.toAccount===account?e.amount:0)-(e.account===account?e.amount:0);continue}
 if(e.kind==='income'||e.kind==='father')amount+=e.amount;
 if(e.kind==='expense'||e.kind==='payment'||e.kind==='guarantee')amount-=e.amount;
 }
 return amount;
}
export function reminders(s:Settings,entries:Entry[],today=localDay()){
 const until=shiftDay(today,s.reminderDays??7),actual=entries.filter(e=>e.date<=today);
 const items=plannedExpenses(entries.filter(e=>e.kind==='plan'||e.date<=today),until).map(e=>({id:e.id,label:e.label,date:e.date,amount:-e.amount,tab:1,status:e.date<today?'Vencida':e.date===today?'Vence hoje':'A vencer'}));
 for(const b of bills(actual,s))if(b.remaining>0&&(b.close<=until||b.due<=until))items.push({id:b.id,label:`Fatura ${cardName(s,b.card)}`,date:b.due<=today?b.due:b.close,amount:b.remaining,tab:2,status:b.due<today?'Vencida':b.due===today?'Vence hoje':b.close<=today?'Fechada para pagar':'Fecha em breve'});
 const next=salaryCycle(today,s.extraHolidays,s.salaryRule).next;
 if((s.salaryOverrides?.[next.slice(0,7)]??s.salary)>0&&next<=until&&!actual.some(e=>e.kind==='income'&&e.salaryMonth===next.slice(0,7)))items.push({id:'salary',label:'Salário previsto',date:next,amount:s.salaryOverrides?.[next.slice(0,7)]??s.salary,tab:5,status:'Receita prevista'});
 return items.sort((a,b)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label));
}
export function goalProgress(goal:Goal,today=localDay()){
 const remaining=Math.max(0,goal.target-goal.saved),months=goal.monthly>0?Math.ceil(remaining/goal.monthly):null;
 const date=months===null?null:months===0?today:monthDate(today.slice(0,7),Number(today.slice(-2)),months);
 const deadlineMonths=goal.deadline?Math.max(1,(Number(goal.deadline.slice(0,4))-Number(today.slice(0,4)))*12+Number(goal.deadline.slice(5,7))-Number(today.slice(5,7))):null;
 return {remaining,months,date,perMonth:deadlineMonths?Math.ceil(remaining/deadlineMonths):null,percent:Math.min(100,Math.floor(goal.saved/goal.target*100))};
}
