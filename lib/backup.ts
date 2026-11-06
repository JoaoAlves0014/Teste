import {defaults,Entry,Settings} from './finance';
import {schedule,monthDate} from './cards';
const day=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const natural=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
export function validBackup(data:unknown):data is {settings:Settings;entries:Entry[]}{
 if(!data||typeof data!=='object')return false;
 const {settings:s,entries}=data as {settings:Settings;entries:Entry[]};
 if(!s||!Array.isArray(entries)||!Object.keys(defaults).every(k=>k==='fatherStart'?typeof s[k]==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(s[k]):natural(s[k as keyof Settings])))return false;
 if(s.salaryOverrides!==undefined&&(!s.salaryOverrides||typeof s.salaryOverrides!=='object'||Array.isArray(s.salaryOverrides)||!Object.entries(s.salaryOverrides).every(([month,value])=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&natural(value))))return false;
 if(s.extraHolidays!==undefined&&(!Array.isArray(s.extraHolidays)||s.extraHolidays.length>100||!s.extraHolidays.every(day)||s.extraHolidays.some(d=>s.extraHolidays!.filter(v=>v.slice(0,7)===d.slice(0,7)).length>10)))return false;
 if(s.reminderDays!==undefined&&![3,7,15,30].includes(s.reminderDays))return false;
 if(s.goals!==undefined&&(!Array.isArray(s.goals)||new Set(s.goals.map(g=>g?.id)).size!==s.goals.length||!s.goals.every(g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&g.name.trim()&&natural(g.target)&&g.target>0&&natural(g.saved)&&g.saved<=g.target&&natural(g.monthly)&&(g.deadline===undefined||day(g.deadline)))))return false;
 if(s.reconciliations!==undefined&&(!Array.isArray(s.reconciliations)||!s.reconciliations.every(r=>r&&typeof r.id==='string'&&typeof r.target==='string'&&typeof r.label==='string'&&day(r.date)&&Number.isSafeInteger(r.expected)&&typeof r.expected==='number'&&typeof r.observed==='number'&&Number.isSafeInteger(r.observed))))return false;
 if([s.nuClose,s.nuDue,s.c6Close,s.c6Due].some(n=>n>31))return false;
 const ids=new Set<string>();
 for(const e of entries){
 if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.label!=='string'||!e.label.trim()||!natural(e.amount)||!e.amount||!day(e.date)||!['income','expense','father','card','payment','plan','guarantee'].includes(e.kind))return false;
 ids.add(e.id);
 if(e.category!==undefined&&(typeof e.category!=='string'||e.category.length>80))return false;
 if(e.account!==undefined&&!['C6','Reserva'].includes(e.account))return false;
 if(e.salaryMonth!==undefined&&(e.kind!=='income'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.salaryMonth)))return false;
 if(e.kind==='plan'&&(!['once','monthly'].includes(e.recurrence??'once')||e.date<'2000-01-01'||e.date>'2099-12-31'||(e.endDate!==undefined&&(!day(e.endDate)||e.endDate<e.date))))return false;
 if(e.kind==='card'){
 if(!['Nubank','C6 Bank'].includes(e.card??''))return false;
 const n=e.installments??1,first=e.firstInstallment??1;
 if(!natural(n)||n<1||n>120||!natural(first)||first<1||first>n||e.amount<n)return false;
 if(e.firstMonth!==undefined&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.firstMonth))return false;
 if([e.closeDay,e.dueDay].some(n=>n!==undefined&&(!natural(n)||n<1||n>31)))return false;
 }
 }
 const settlements=new Set<string>();
 for(const e of entries){if(e.planId!==undefined||e.planDate!==undefined){const plan=entries.find(p=>p.id===e.planId&&p.kind==='plan');if(e.kind!=='expense'||!plan||!day(e.planDate)||e.planDate!<plan.date||e.planDate!>e.date)return false;if(e.amount!==plan.amount||(plan.endDate&&e.planDate!>plan.endDate)||(plan.recurrence==='monthly'?monthDate(e.planDate!.slice(0,7),Number(plan.date.slice(-2)))!==e.planDate:plan.date!==e.planDate))return false;const key=`${e.planId}:${e.planDate}`;if(settlements.has(key))return false;settlements.add(key)}}
 const charges=new Map(entries.flatMap(e=>schedule(e,s)).map(c=>[c.id,c]));const paid=new Map<string,number>();
 for(const p of entries.filter(e=>e.kind==='payment')){
 if(!Array.isArray(p.allocations)||!p.allocations.length)return false;
 let total=0;
 for(const a of p.allocations){const c=charges.get(a.chargeId);if(!c||!natural(a.amount)||!a.amount||p.card!==c.card||p.date<c.close)return false;const sum=(paid.get(a.chargeId)??0)+a.amount;if(sum>c.amount)return false;paid.set(a.chargeId,sum);total+=a.amount}
 if(total!==p.amount)return false;
 }
 return true;
}
