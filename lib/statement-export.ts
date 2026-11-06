import type {ReportFilter} from './statement-analysis';
import {filterStatements,analyzeStatements,statementDate} from './statement-analysis';
import {StatementStore,kindLabels} from './statement-types';
import {money} from './finance';
import {dateLabel} from './calendar';
export function downloadJSON(data:unknown,name:string){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function exportStatementPDF(store:StatementStore,filter:ReportFilter,detail=true){
 const {jsPDF}=await import('jspdf'),{default:autoTable}=await import('jspdf-autotable'),rows=filterStatements(store,filter),docs=new Map(store.documents.map(d=>[d.id,d])),a=analyzeStatements(rows,filter.from,filter.to,t=>statementDate(t,docs.get(t.documentId),filter.basis));
 const pdf=new jsPDF(),pageWidth=pdf.internal.pageSize.getWidth();pdf.setFontSize(23);pdf.setTextColor(25,32,28);pdf.text('Clareza',14,20);pdf.setFontSize(13);pdf.text('Relatorio de extratos e faturas',14,29);pdf.setFontSize(10);pdf.text(`Periodo: ${filter.from?dateLabel(filter.from):'Inicio'} a ${filter.to?dateLabel(filter.to):'Fim'}`,14,38);pdf.text(`Banco: ${filter.bank==='all'?'Todos':filter.bank} | Arquivos no recorte: ${new Set(rows.map(t=>t.documentId)).size}`,14,44);
 pdf.text(filter.basis==='statement'?'Cartoes por competencia da fatura; contas e arquivos sem competencia por data original.':'Periodo pela data original de cada lancamento.',14,49);
 autoTable(pdf,{margin:{bottom:24},startY:55,head:[['Indicador','Valor']],body:[['Receitas',money(a.income)],['Despesas brutas',money(a.expenses)],['Estornos / creditos',money(a.refunds)],['Gastos liquidos',money(a.netExpenses)],['Receitas menos gastos liquidos',money(a.result)],['Lancamentos excluidos dos totais',String(a.excluded)],['Sugestoes ainda nao revisadas',String(a.unreviewed)]],headStyles:{fillColor:[25,110,60]},styles:{fontSize:9}});
 const y=()=>((pdf as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable?.finalY??50)+12;
 autoTable(pdf,{margin:{bottom:24},startY:y(),head:[['Mes','Receitas','Despesas','Estornos','Lancamentos']],body:a.months.map(m=>[m.month.split('-').reverse().join('/'),money(m.income),money(m.expenses),money(m.refunds),m.count?String(m.count):'Sem dados']),headStyles:{fillColor:[25,110,60]},styles:{fontSize:8}});
 autoTable(pdf,{margin:{bottom:24},startY:y(),head:[['Categoria','Gastos liquidos']],body:a.categories.map(c=>[c.category,money(c.amount)]),headStyles:{fillColor:[25,110,60]},styles:{fontSize:9}});
 if(detail)autoTable(pdf,{margin:{bottom:24},startY:y(),head:[['Data','Banco / conta','Descricao','Tipo','Categoria','Valor']],body:rows.map(t=>{const d=docs.get(t.documentId);return [dateLabel(t.date),[d?.bank,d?.account,d?.statementMonth?`Fatura ${d.statementMonth}`:''].filter(Boolean).join(' / '),t.description,kindLabels[t.kind],t.category,money(t.amount)]}),headStyles:{fillColor:[25,110,60]},styles:{fontSize:7,overflow:'linebreak'},columnStyles:{2:{cellWidth:52}}});
 const pages=pdf.getNumberOfPages();for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(110);pdf.text(`Analise independente do orcamento. Transferencias, pagamentos de fatura e itens ignorados nao somam gastos.`,14,pdf.internal.pageSize.getHeight()-14,{maxWidth:pageWidth-28});pdf.text(`${i} / ${pages}`,pageWidth-25,pdf.internal.pageSize.getHeight()-6)}
 pdf.save(`clareza-extratos-${filter.from||'inicio'}-${filter.to||'fim'}.pdf`);
}
