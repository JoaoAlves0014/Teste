import {describe,it,expect} from 'vitest';
import {cents,defaults,summary,simulate} from './finance';
describe('cálculos financeiros',()=>{
 it('converte reais em centavos',()=>expect(cents('12,34')).toBe(1234));
 it('exclui garantia, reserva e fatura do disponível',()=>{const s={...defaults,balance:100000,guarantee:20000,reserve:10000,variable:5000};expect(summary(s,[{id:'1',label:'Compra',kind:'card',amount:12000,date:'2026-11-06'}],new Date('2026-11-06')).available).toBe(53000)});
 it('não conta crédito como dinheiro',()=>expect(summary(defaults,[]).cash).toBe(0));
 it('distribui centavos sem perder o total',()=>expect(simulate(10000,3,20000,20000).reduce((a,r)=>a+r.installment,0)).toBe(10000));
 it('acumula repasses e desconta recebimentos',()=>expect(summary({...defaults,fatherStart:'2026-10'},[{id:'1',label:'Pai',kind:'father',amount:10000,date:'2026-11-01'}],new Date('2026-11-06')).father).toBe(50000));
});
