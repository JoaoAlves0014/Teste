import {describe,it,expect} from 'vitest';
import {bills,schedule,paymentFor,cardReserve} from './cards';
import {defaults,Entry,summary} from './finance';
const s={...defaults,nuClose:20,nuDue:5};
const buy:Entry={id:'buy',label:'Celular',kind:'card',card:'Nubank',date:'2026-11-19',amount:10000,installments:3};
describe('compras e faturas',()=>{
 it('distribui o total exato e define vencimento no mês seguinte',()=>{const rows=schedule(buy,s);expect(rows.map(r=>r.amount)).toEqual([3334,3333,3333]);expect(rows[0].close).toBe('2026-11-20');expect(rows[0].due).toBe('2026-12-05')});
 it('compra no fechamento e após fechamento vai para o próximo ciclo',()=>{expect(schedule({...buy,date:'2026-11-20'},s)[0].close).toBe('2026-12-20');expect(schedule({...buy,date:'2026-11-21'},s)[0].close).toBe('2026-12-20')});
 it('limita o dia ao fim do mês e atravessa o ano',()=>{const rows=schedule({...buy,date:'2026-12-25',closeDay:31,dueDay:31},s);expect(rows[1].close).toBe('2027-01-31');expect(rows[2].close).toBe('2027-02-28')});
 it('cadastra apenas parcelas pendentes de compra antiga',()=>{const rows=schedule({...buy,installments:12,firstInstallment:5,firstMonth:'2026-11'},s);expect(rows).toHaveLength(8);expect(rows[0].number).toBe(5);expect(rows[7].close).toBe('2027-06-20')});
 it('pagar preserva compra e não desconta duas vezes',()=>{const settings={...s,balance:50000,guarantee:0};const single={...buy,installments:1};const before=summary(settings,[single],new Date('2026-11-21'));const payment=paymentFor(bills([single],s)[0],[single],'2026-11-21');const after=summary(settings,[single,payment],new Date('2026-11-21'));expect(before.available).toBe(40000);expect(after.available).toBe(before.available);expect(after.cash).toBe(40000);expect(bills([single,payment],s)[0].remaining).toBe(0);expect(()=>paymentFor(bills([single,payment],s)[0],[single,payment],'2026-11-21')).toThrow('já está paga')});
 it('não permite pagamento antes do fechamento',()=>expect(()=>paymentFor(bills([buy],s)[0],[buy],'2026-11-19')).toThrow('Aguarde'));
 it('reserva atrasadas e próximo ciclo sem somar todas as futuras',()=>expect(cardReserve([buy],s,'2026-12-01')).toBe(6667));
 it('mantém pagamento alocado ao comprar mais no mesmo ciclo',()=>{const initial=bills([buy],s)[0];const payment=paymentFor(initial,[buy],'2026-11-21');const another={...buy,id:'other',amount:1500,installments:1};expect(bills([buy,payment,another],s)[0].remaining).toBe(1500)});
 it('ignora receitas futuras no saldo',()=>expect(summary({...s,balance:0},[{id:'salary',kind:'income',label:'Salário',amount:98800,date:'2026-12-05'}],new Date('2026-11-21')).cash).toBe(0));
});
import {validBackup} from './backup';
describe('backup de faturas',()=>{
 it('aceita registros legados e novos pagamentos',()=>{expect(validBackup({settings:s,entries:[buy]})).toBe(true);const p=paymentFor(bills([buy],s)[0],[buy],'2026-11-21');expect(validBackup({settings:s,entries:[buy,p]})).toBe(true)});
 it('rejeita pagamento duplicado e referência inexistente',()=>{const p=paymentFor(bills([buy],s)[0],[buy],'2026-11-21');expect(validBackup({settings:s,entries:[buy,p,{...p,id:'dup'}]})).toBe(false);expect(validBackup({settings:s,entries:[p]})).toBe(false)});
});
