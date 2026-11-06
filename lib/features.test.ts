import {describe,it,expect} from 'vitest';
import {defaults,Entry} from './finance';
import {updateEntry,categoryTotals,accountBalance,reminders,goalProgress} from './features';
import {forecast,settlePlan,plannedExpenses} from './forecast';
import {bills,paymentFor} from './cards';
import {validBackup} from './backup';
const s={...defaults,balance:100000,savings:20000,guarantee:0,variable:0,nuClose:5,nuDue:10};
const expense:Entry={id:'expense',kind:'expense',label:'Almoço',category:'Alimentação',amount:2000,date:'2026-11-01'};
const purchase:Entry={id:'purchase',kind:'card',card:'Nubank',label:'Celular',category:'Compras',amount:30000,date:'2026-10-25',installments:3};
describe('edição de registros',()=>{
 it('corrige saída e recalcula saldos',()=>{const edited=updateEntry([expense],{...expense,amount:3000,label:'Jantar'},s,'2026-11-06');expect(accountBalance(s,edited,'C6','2026-11-06')).toBe(97000);expect(edited[0].label).toBe('Jantar')});
 it('recalcula parcelas de compra sem pagamento',()=>{const next=updateEntry([purchase],{...purchase,amount:36000,installments:4},s,'2026-11-06');expect(bills(next,s)).toHaveLength(4);expect(bills(next,s)[0].total).toBe(9000)});
 it('protege valor de compra paga, mas permite categoria',()=>{const payment=paymentFor(bills([purchase],s)[0],[purchase],'2026-11-06');expect(()=>updateEntry([purchase,payment],{...purchase,amount:35000},s,'2026-11-06')).toThrow('pagamentos vinculados');expect(updateEntry([purchase,payment],{...purchase,category:'Educação'},s,'2026-11-06')[0].category).toBe('Educação')});
 it('não altera valor de pagamento vinculado nem permite data inválida',()=>{const payment=paymentFor(bills([purchase],s)[0],[purchase],'2026-11-06');expect(()=>updateEntry([purchase,payment],{...payment,amount:1},s,'2026-11-06')).toThrow('valor');expect(()=>updateEntry([expense],{...expense,date:'2026-02-30'},s,'2026-11-06')).toThrow('Confira')});
 it('reclassifica pagamentos de um plano sem duplicar despesas',()=>{const plan:Entry={id:'p',kind:'plan',label:'Internet',amount:10000,date:'2026-11-01',category:'Casa'};const paid=settlePlan(plannedExpenses([plan],'2026-11-30')[0],[plan],'2026-11-01');const edited=updateEntry([plan,paid],{...plan,category:'Educação'},s,'2026-11-06');expect(edited[1].category).toBe('Educação');expect(categoryTotals(edited,s,'2026-11','2026-11-06')).toEqual([{category:'Educação',amount:10000}])});
});
describe('categorias e conferência',()=>{
 it('conta parcela do mês, sem somar pagamento da fatura',()=>{const p=paymentFor(bills([purchase],s)[0],[purchase],'2026-11-06');expect(categoryTotals([expense,purchase,p],s,'2026-11','2026-11-06')).toEqual([{category:'Compras',amount:10000},{category:'Alimentação',amount:2000}])});
 it('separa C6 e reservas e respeita data de conferência',()=>{const reserve={...expense,id:'reserve',account:'Reserva' as const,amount:5000};expect(accountBalance(s,[expense,reserve],'C6','2026-11-06')).toBe(98000);expect(accountBalance(s,[expense,reserve],'Reserva','2026-11-06')).toBe(15000);expect(accountBalance(s,[expense],'C6','2026-10-31')).toBe(100000)});
 it('salvar uma conferência não inventa saldo',()=>{const next={...s,reconciliations:[{id:'r',date:'2026-11-06',target:'cash:C6',label:'C6',expected:100000,observed:90000}]};expect(forecast(next,[],'2026-11-06').available).toBe(forecast(s,[],'2026-11-06').available);expect(validBackup({settings:next,entries:[]})).toBe(true)});
});
describe('metas',()=>{
 const goal={id:'phone',name:'Celular',target:60000,saved:20000,monthly:10000,deadline:'2027-03-01'};
 it('separa valor sem criar receita ou saída',()=>{const before=forecast(s,[],'2026-11-06');const after=forecast({...s,goals:[goal]},[],'2026-11-06');expect(after.cash).toBe(before.cash);expect(after.available).toBe(before.available-20000);expect(after.rows[1].remaining).toBe(before.rows[1].remaining-20000)});
 it('projeta data e aporte restante para o prazo',()=>{expect(goalProgress(goal,'2026-11-06')).toMatchObject({remaining:40000,months:4,date:'2027-03-06',perMonth:10000,percent:33})});
 it('aceita cópia antiga e rejeita valores reservados inválidos',()=>{expect(validBackup({settings:defaults,entries:[]})).toBe(true);expect(validBackup({settings:{...s,goals:[goal]},entries:[]})).toBe(true);expect(validBackup({settings:{...s,goals:[{...goal,saved:70000}]},entries:[]})).toBe(false)});
});
describe('lembretes',()=>{
 it('inclui atrasadas e próximos vencimentos, exclui contas pagas',()=>{const plan:Entry={id:'p',kind:'plan',label:'Internet',amount:10000,date:'2026-11-01'};const events=reminders(s,[plan,purchase],'2026-11-06');expect(events.some(e=>e.label==='Internet'&&e.status==='Vencida')).toBe(true);expect(events.some(e=>e.label==='Fatura Nubank'&&e.status==='Fechada para pagar')).toBe(true);const paid=settlePlan(plannedExpenses([plan],'2026-11-30')[0],[plan],'2026-11-06');expect(reminders(s,[plan,paid],'2026-11-06').some(e=>e.label==='Internet')).toBe(false)});
 it('não lembra salário identificado como já recebido',()=>{const salary:Entry={id:'s',kind:'income',label:'Salário',amount:98800,date:'2026-11-06',salaryMonth:'2026-11'};expect(reminders(s,[salary],'2026-11-06').some(e=>e.id==='salary')).toBe(false)});
 it('não destaca parcelas distantes nem faturas liquidadas',()=>{const paid=paymentFor(bills([purchase],s)[0],[purchase],'2026-11-06');expect(reminders({...s,reminderDays:3},[purchase,paid],'2026-11-06').some(e=>e.label==='Fatura Nubank')).toBe(false)});
});
