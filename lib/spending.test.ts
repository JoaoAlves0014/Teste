import {describe,it,expect} from 'vitest';
import {defaults,summary} from './finance';
import {createSpending,featuredInvoice,spendingRows} from './spending';
import {bills,paymentFor} from './cards';
const s={...defaults,balance:100000,nuClose:10,nuDue:17,c6Close:3,c6Due:12};
const input={label:'Coxinha',value:'8,50',method:'Nubank' as const,date:'2026-11-06'};
describe('registro centralizado',()=>{
 it('registra o mesmo gasto no cartão escolhido e preserva centavos',()=>{const nu=createSpending(input,s,'2026-11-06'),c6=createSpending({...input,method:'C6 Bank'},s,'2026-11-06');expect(nu.amount).toBe(850);expect(bills([nu,c6],s).map(b=>[b.card,b.close,b.total])).toEqual([['Nubank','2026-11-10',850],['C6 Bank','2026-12-03',850]]);expect(summary(s,[nu,c6],new Date('2026-11-06')).cash).toBe(100000)});
 it('usa 1x por padrão e joga compra no fechamento para a fatura seguinte',()=>{const e=createSpending({...input,date:'2026-11-10'},s,'2026-11-10');expect(e.installments).toBe(1);expect(e.firstMonth).toBe('2026-12')});
 it('suporta compra em andamento e soma exata das parcelas',()=>{const e=createSpending({...input,value:'100',count:3},s,'2026-11-06');expect(bills([e],s).reduce((a,b)=>a+b.total,0)).toBe(10000);const old=createSpending({...input,count:12,first:5,firstMonth:'2026-11',value:'1200'},s,'2026-11-06');expect(bills([old],s)).toHaveLength(8)});
 it('registra Pix como saída sem aumentar a fatura',()=>{const e=createSpending({...input,method:'cash:C6'},s,'2026-11-06');expect(e.kind).toBe('expense');expect(bills([e],s)).toHaveLength(0);expect(summary(s,[e],new Date('2026-11-06')).cash).toBe(99150)});
 it('exige datas do cartão, mas permite dinheiro sem configurar crédito',()=>{expect(()=>createSpending(input,defaults,'2026-11-06')).toThrow('fechamento');expect(createSpending({...input,method:'cash:Reserva'},defaults,'2026-11-06').account).toBe('Reserva')});
 it('rejeita valor zero, data inválida ou futura e parcelas inválidas',()=>{expect(()=>createSpending({...input,value:'0'},s,'2026-11-06')).toThrow('maior');expect(()=>createSpending({...input,date:'2026-02-30'},s,'2026-11-06')).toThrow('data');expect(()=>createSpending({...input,date:'2026-12-01'},s,'2026-11-06')).toThrow('data');expect(()=>createSpending({...input,count:2,first:3},s,'2026-11-06')).toThrow('parcelas')});
});
describe('tabela e faturas',()=>{
 it('filtra por cartão e pesquisa sem distinguir acentos',()=>{const nu=createSpending({...input,label:'Pão'},s,'2026-11-06'),c6=createSpending({...input,label:'Pão',method:'C6 Bank'},s,'2026-11-06');const rows=spendingRows([nu,c6],s,{method:'Nubank',query:'pao'},'2026-11-06');expect(rows).toHaveLength(1);expect(rows[0].method).toBe('Nubank')});
 it('filtro de fatura usa parcela e não limita pelo mês original da compra',()=>{const e=createSpending({...input,value:'100',count:3},s,'2026-11-06');const row=spendingRows([e],s,{month:'2026-12',invoice:'Nubank:2026-12-10'},'2026-11-06')[0];expect(row.amount).toBe(3333);expect(row.firstClose).toBe('2026-12-10');expect(spendingRows([e],s,{month:'2026-12'},'2026-11-06')).toHaveLength(0)});
 it('pagamento liquida gasto sem virar uma segunda compra na tabela',()=>{const e=createSpending(input,s,'2026-11-06'),paid=paymentFor(bills([e],s)[0],[e],'2026-11-11');const rows=spendingRows([e,paid],s,{},'2026-11-11');expect(rows).toHaveLength(1);expect(rows[0].status).toBe('Pago');expect(rows[0].amount).toBe(850)});
 it('destaque traz a primeira pendência ou um ciclo vazio com datas',()=>{const e=createSpending(input,s,'2026-11-06');expect(featuredInvoice([e],s,'Nubank','2026-11-06')?.remaining).toBe(850);expect(featuredInvoice([],s,'C6 Bank','2026-11-06')).toMatchObject({close:'2026-12-03',due:'2026-12-12',remaining:0});expect(featuredInvoice([],defaults,'Nubank','2026-11-06')).toBeNull()});
});
