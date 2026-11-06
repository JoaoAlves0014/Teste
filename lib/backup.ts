import {defaults,Entry,Settings} from './finance';
import {schedule} from './cards';
const day=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s));
const natural=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
export function validBackup(data:unknown):data is {settings:Settings;entries:Entry[]}{
 if(!data||typeof data!=='object')return false;
 const {settings:s,entries}=data as {settings:Settings;entries:Entry[]};
 if(!s||!Array.isArray(entries)||!Object.keys(defaults).every(k=>k==='fatherStart'?typeof s[k]==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(s[k]):natural(s[k as keyof Settings])))return false;
 if([s.nuClose,s.nuDue,s.c6Close,s.c6Due].some(n=>n>31))return false;
 const ids=new Set<string>();
 for(const e of entries){
 if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.label!=='string'||!e.label.trim()||!natural(e.amount)||!e.amount||!day(e.date)||!['income','expense','father','card','payment'].includes(e.kind))return false;
 ids.add(e.id);
 if(e.kind==='card'){
 if(!['Nubank','C6 Bank'].includes(e.card??''))return false;
 const n=e.installments??1,first=e.firstInstallment??1;
 if(!natural(n)||n<1||n>120||!natural(first)||first<1||first>n||e.amount<n)return false;
 if(e.firstMonth!==undefined&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.firstMonth))return false;
 if([e.closeDay,e.dueDay].some(n=>n!==undefined&&(!natural(n)||n<1||n>31)))return false;
 }
 }
 const charges=new Map(entries.flatMap(e=>schedule(e,s)).map(c=>[c.id,c]));const paid=new Map<string,number>();
 for(const p of entries.filter(e=>e.kind==='payment')){
 if(!Array.isArray(p.allocations)||!p.allocations.length)return false;
 let total=0;
 for(const a of p.allocations){const c=charges.get(a.chargeId);if(!c||!natural(a.amount)||!a.amount||p.card!==c.card||p.date<c.close)return false;const sum=(paid.get(a.chargeId)??0)+a.amount;if(sum>c.amount)return false;paid.set(a.chargeId,sum);total+=a.amount}
 if(total!==p.amount)return false;
 }
 return true;
}
