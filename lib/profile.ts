import type {Settings,Entry} from './finance';
export type BankAccount={id:string;name:string;bank:string;opening:number;archived?:boolean};
export type CreditCard={id:string;name:string;bank:string;close:number;due:number;limit:number|null;cap:number|null;paymentAccount?:string;archived?:boolean};
export function accounts(s:Settings):BankAccount[]{return s.accounts??[{id:'C6',name:'C6 Bank',bank:'C6',opening:s.balance},{id:'Reserva',name:'Reservas livres',bank:'',opening:s.savings}]}
export function cards(s:Settings):CreditCard[]{return s.creditCards??[{id:'Nubank',name:'Nubank',bank:'Nubank',close:s.nuClose,due:s.nuDue,limit:400000,cap:s.nuCap},{id:'C6 Bank',name:'C6 Bank',bank:'C6',close:s.c6Close,due:s.c6Due,limit:null,cap:null}]}
export const cardName=(s:Settings,id:string)=>cards(s).find(c=>c.id===id)?.name??id;
export const accountName=(s:Settings,id:string)=>accounts(s).find(a=>a.id===id)?.name??id;
export const defaultAccount=(s:Settings)=>accounts(s).find(a=>!a.archived)?.id??'';
export function paymentMethods(s:Settings):[string,string][]{return [...cards(s).filter(c=>!c.archived).map(c=>[c.id,s.creditCards?`${c.name} · crédito`:c.id==='Nubank'?'Nu · crédito':'C6 · crédito'] as [string,string]),...accounts(s).filter(a=>!a.archived).map(a=>['cash:'+a.id,s.accounts?`${a.name} · Pix / débito`:a.id==='C6'?'Pix / débito C6':'Reserva livre'] as [string,string])]}
export function freshSettings(base:Settings):Settings{return {...base,balance:0,savings:0,salary:0,guarantee:0,nuCap:0,transferMonthly:0,transferLabel:'Outros repasses',accounts:[],creditCards:[],onboardingComplete:false,salaryRule:{type:'business',day:5,saturday:true,curitiba:false}}}
export function registrySettings(s:Settings):Settings{return {...s,accounts:accounts(s),creditCards:cards(s)}}
export function createTransfer(s:Settings,from:string,to:string,amount:number,date:string,label='Transferência entre minhas contas'):Entry{if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||from===to||!accounts(s).some(a=>a.id===from&&!a.archived)||!accounts(s).some(a=>a.id===to&&!a.archived)||!Number.isSafeInteger(amount)||amount<=0)throw Error('Selecione duas contas diferentes e um valor maior que zero.');return {id:crypto.randomUUID(),kind:'transfer',account:from,toAccount:to,amount,date,label,category:'Transferência entre contas'}}
