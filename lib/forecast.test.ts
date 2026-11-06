import {describe,it,expect} from 'vitest';
import {salaryDate,salaryCycle,easter,holidays} from './calendar';
import {forecast,maximumPurchase,plannedExpenses,settlePlan} from './forecast';
import {Entry,defaults} from './finance';
import {bills,paymentFor} from './cards';
import {validBackup} from './backup';
const settings={...defaults,balance:100000,guarantee:0,variable:0,reserve:0,nuClose:5,nuDue:10};
const plan:Entry={id:'rent',kind:'plan',label:'Conta',amount:8000,date:'2026-11-04',recurrence:'once'};
const card:Entry={id:'card',kind:'card',card:'Nubank',label:'Celular',amount:36000,date:'2026-10-20',installments:3};
describe('calendário salarial Curitiba',()=>{
 it('conta sábado e exclui domingo e feriados',()=>{expect(salaryDate('2026-11')).toBe('2026-11-07');expect(salaryDate('2026-01')).toBe('2026-01-07');expect(salaryDate('2026-05')).toBe('2026-05-07')});
 it('calcula Páscoa, Sexta Santa e Corpus Christi',()=>{expect(easter(2026)).toBe('2026-04-05');expect(holidays(2026).has('2026-04-03')).toBe(true);expect(holidays(2026).has('2026-06-04')).toBe(true);expect(salaryDate('2026-04')).toBe('2026-04-07');expect(salaryDate('2026-06')).toBe('2026-06-06')});
 it('inclui padroeira de Curitiba e Consciência Negra',()=>{expect(holidays(2026).has('2026-09-08')).toBe(true);expect(holidays(2026).has('2026-11-20')).toBe(true)});
 it('permite exceção do empregador e atravessa ano',()=>{expect(salaryDate('2026-11',['2026-11-03'])).toBe('2026-11-09');expect(salaryCycle('2026-12-31').next).toBe('2027-01-07')});
 it('no dia do pagamento usa próximo mês sem criar salário recebido',()=>expect(salaryCycle('2026-11-07').next).toBe('2026-12-05'));
});
describe('previsão por ciclo',()=>{
 it('reserva somente despesas e faturas antes do próximo salário',()=>{const f=forecast({...settings,guarantee:20000,variable:10000,reserve:5000},[plan,card],'2026-11-01');expect(f.available).toBe(45000);expect(f.cards).toBe(12000);expect(f.plans).toBe(8000);expect(f.rows[0].income).toBe(0);expect(f.rows[1].income).toBe(98800)});
 it('não antecipa salário nem repasse no disponível',()=>{const f=forecast(settings,[{id:'future',kind:'income',label:'Extra',amount:50000,date:'2026-11-05'}],'2026-11-01');expect(f.available).toBe(100000);expect(f.rows[0].remaining).toBe(150000)});
 it('ajuste salarial muda somente o mês escolhido',()=>{const f=forecast({...settings,salaryOverrides:{'2026-11':110000}},[],'2026-11-01');expect(f.rows[1].income).toBe(110000);expect(f.rows[2].income).toBe(98800)});
 it('despesa paga sai do caixa e deixa de ser reservada',()=>{const due={...plan,date:'2026-11-01'};const event=plannedExpenses([due],'2026-12-01')[0];const payment=settlePlan(event,[due],'2026-11-01');const before=forecast(settings,[due],'2026-11-01');const after=forecast(settings,[due,payment],'2026-11-01');expect(after.available).toBe(before.available);expect(after.cash).toBe(92000);expect(after.plans).toBe(0);expect(validBackup({settings,entries:[due,payment]})).toBe(true);expect(()=>settlePlan(event,[due,payment],'2026-11-01')).toThrow('já foi paga')});
 it('aportes na garantia reduzem a reserva restante sem dupla contagem',()=>{const s={...settings,guarantee:20000};const paid:Entry={id:'g',kind:'guarantee',label:'C6',amount:20000,date:'2026-11-01'};expect(forecast(s,[paid],'2026-11-01').available).toBe(forecast(s,[],'2026-11-01').available);expect(forecast(s,[paid],'2026-11-01').guarantee).toBe(0)});
 it('gasto variável consome o orçamento e não duplica reserva',()=>{const s={...settings,variable:10000};const paid:Entry={id:'v',kind:'expense',label:'Uber',amount:4000,date:'2026-11-01'};expect(forecast(s,[paid],'2026-11-01').available).toBe(forecast(s,[],'2026-11-01').available);expect(forecast(s,[paid],'2026-11-01').variable).toBe(6000)});
 it('não cobra reserva de segurança todo mês',()=>{const f=forecast({...settings,salary:0,reserve:10000},[],'2026-11-01');expect(f.rows.every(r=>r.remaining===90000)).toBe(true)});
 it('preserva atraso e distribui recorrência mensal pelo fim do mês',()=>{const monthly={...plan,date:'2026-01-31',recurrence:'monthly' as const,endDate:'2026-03-31'};expect(plannedExpenses([monthly],'2026-12-01').map(e=>e.date)).toEqual(['2026-01-31','2026-02-28','2026-03-31']);expect(forecast(settings,[monthly],'2026-11-01').plans).toBe(24000)});
 it('mantém disponível ao pagar fatura já fechada',()=>{const s={...settings};const payment=paymentFor(bills([card],s)[0],[card],'2026-11-06');expect(forecast(s,[card,payment],'2026-11-06').available).toBe(forecast(s,[card],'2026-11-06').available)});
 it('não deixa renda posterior esconder um déficit anterior',()=>{const future:Entry={id:'extra',kind:'income',label:'Extra',amount:100000,date:'2026-11-06'};const f=forecast({...settings,balance:5000},[plan,future],'2026-11-01');expect(f.rows[0].remaining).toBeGreaterThan(0);expect(f.rows[0].minimum).toBe(-3000);expect(f.viable).toBe(false)});
 it('prevê parcelas futuras sem repetir a primeira fatura para sempre',()=>{const f=forecast(settings,[card],'2026-11-01');expect(f.events.filter(e=>e.kind==='card').map(e=>e.amount)).toEqual([-12000,-12000,-12000])});
});
describe('simulador integrado',()=>{
 it('distribui compra simulada por fechamento e preserva centavos',()=>{const f=forecast(settings,[],'2026-11-01',6,{method:'Nubank',count:3,price:10000});expect(f.events.filter(e=>e.proposed).map(e=>e.amount)).toEqual([-3334,-3333,-3333]);expect(f.rows[0].payment).toBe(3334)});
 it('respeita teto pessoal da fatura inteira',()=>{const f=forecast({...settings,nuCap:20000},[card],'2026-11-01',6,{method:'Nubank',count:1,price:10000});expect(f.capExceeded).toBe(true);expect(f.viable).toBe(false)});
 it('sugere máximo à vista sem gastar reserva ou dinheiro futuro',()=>{expect(maximumPurchase({...settings,reserve:10000},[plan],'2026-11-01',1,'cash')).toBe(82000)});
 it('exige datas para simular no cartão',()=>expect(()=>forecast({...settings,nuClose:0},[],'2026-11-01',6,{method:'Nubank',count:3,price:10000})).toThrow('Configure'));
});
describe('compatibilidade do backup',()=>{
 it('aceita dados antigos e novos campos opcionais',()=>{expect(validBackup({settings:defaults,entries:[]})).toBe(true);expect(validBackup({settings:{...settings,salaryOverrides:{'2026-11':110000},extraHolidays:['2026-11-03']},entries:[plan]})).toBe(true)});
 it('rejeita ajustes negativos e datas inválidas',()=>{expect(validBackup({settings:{...settings,salaryOverrides:{'2026-11':-1}},entries:[]})).toBe(false);expect(validBackup({settings:{...settings,extraHolidays:['2026-02-30']},entries:[]})).toBe(false)});
});
