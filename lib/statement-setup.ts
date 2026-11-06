import {Entry,Settings} from './finance';
import {StatementStore,ReportTransaction,normalizeReport} from './statement-types';
import {accounts,cards} from './profile';
import {bills,paymentFor,monthDate,schedule} from './cards';
import {merchantSearchName} from './merchant';
import {validBackup} from './backup';
export type ImportBinding={documentId:string;target:string};
export type SetupCandidate={id:string;row:ReportTransaction;entry?:Entry;reason:string;duplicate:boolean;sourceIds:string[]};
const signature=(e:Entry)=>[e.kind,e.date,e.amount,normalizeReport(e.label),e.account??'',e.card??'',e.toAccount??''].join('|');
const signed=(r:ReportTransaction)=>Number(r.sourceKey?.split('|').at(-1));
export function setupCandidates(s:Settings,entries:Entry[],store:StatementStore,bindings:ImportBinding[],start:string,paymentCards:Record<string,string>={},today:string,salaryIds:string[]=[]){
 const documents=new Map(store.documents.map(d=>[d.id,d])),targets=new Map(bindings.map(b=>[b.documentId,b.target])),used=new Set(entries.flatMap(e=>e.sourceReports??[])),seen=new Set(entries.map(signature)),result:SetupCandidate[]=[],consumed=new Set<string>();let proposed=[...entries];
 const add=(row:ReportTransaction,entry:Entry|undefined,reason:string,sourceIds=[row.id])=>{const duplicate=sourceIds.some(id=>used.has(id))||!!entry&&seen.has(signature(entry));result.push({id:row.id,row,entry:duplicate?undefined:entry,reason:duplicate?'Já registrado ou possível duplicata: mantido fora do controle.':reason,duplicate,sourceIds});if(entry&&!duplicate){const next={...entry,sourceReports:sourceIds};result.at(-1)!.entry=next;proposed.push(next);seen.add(signature(next))}};
 const rows=[...store.transactions].sort((a,b)=>a.date.localeCompare(b.date));
 // Purchases first: bank payments can only settle invoices actually present.
 for(const row of [...rows.filter(r=>documents.get(r.documentId)?.type==='card'),...rows.filter(r=>documents.get(r.documentId)?.type!=='card')]){
 if(consumed.has(row.id))continue;const doc=documents.get(row.documentId),target=targets.get(row.documentId),card=cards(s).find(c=>c.id===target),account=accounts(s).find(a=>a.id===target),base={id:'statement-'+row.id,label:row.description,date:row.date,amount:row.amount,category:row.category};
 if(row.kind==='ignore'){add(row,undefined,'Linha ignorada na análise.');continue}
 if(!start||(row.date<start&&!(doc?.type==='card'&&card&&doc.statementMonth&&monthDate(doc.statementMonth,card.close||31)>=start))||row.date>today){add(row,undefined,'Fora do período do controle. Continua disponível nos relatórios.');continue}
 if(doc?.type==='card'){
 if(!card||card.archived||!card.close||!card.due){add(row,undefined,'Vincule a um cartão ativo com fechamento e vencimento.');continue}
 if(rows.some(r=>r.documentId===doc.id&&r.kind==='refund')){add(row,undefined,'Esta fatura tem estorno/crédito. Ajuste-a manualmente antes de integrar ao controle.');continue}
 if(row.kind!=='expense'){add(row,undefined,'Pagamento da fatura não é uma compra. Use o pagamento presente no extrato bancário.');continue}
 const month=doc.statementMonth??monthDate(row.date.slice(0,7),1,row.date>=monthDate(row.date.slice(0,7),card.close)?1:0).slice(0,7);
 if(entries.some(e=>e.kind==='card'&&e.card===card.id&&normalizeReport(merchantSearchName(e.label))===normalizeReport(merchantSearchName(row.description))&&schedule(e,s).some(c=>c.close.slice(0,7)===month&&c.amount===row.amount))){add(row,undefined,'Possível parcela de compra já cadastrada. Confira antes de registrar novamente.');continue}
 add(row,{...base,kind:'card',card:card.id,installments:1,firstInstallment:1,firstMonth:month,closeDay:card.close,dueDay:card.due},/parcela|\d+\s*\/\s*\d+/.test(normalizeReport(row.description))?'Importa somente a parcela deste mês. Cadastre as parcelas futuras separadamente.':'Compra desta fatura; não movimenta o saldo da conta.');continue}
 if(!account||account.archived){add(row,undefined,'Vincule este extrato a uma conta ativa.');continue}
 if(row.kind==='transfer'){
 const peers=rows.filter(r=>r.id!==row.id&&!consumed.has(r.id)&&r.kind==='transfer'&&r.date===row.date&&r.amount===row.amount&&documents.get(r.documentId)?.type==='bank'&&targets.get(r.documentId)!==target&&accounts(s).some(a=>a.id===targets.get(r.documentId)&&!a.archived)&&signed(r)*signed(row)<0);
 if(peers.length!==1){add(row,undefined,'Transferência própria sem par único. Confira os dois extratos ou registre manualmente.');continue}
 const peer=peers[0];consumed.add(peer.id);const outgoing=signed(row)<0?row:peer,incoming=outgoing===row?peer:row;add(row,{...base,label:'Transferência entre minhas contas',kind:'transfer',account:targets.get(outgoing.documentId),toAccount:targets.get(incoming.documentId)},'Os dois lados viram uma única transferência, sem receita ou despesa.',[row.id,peer.id]);continue}
 if(row.kind==='bill_payment'){
 const chosen=paymentCards[row.id];const matching=bills(proposed,s).filter(b=>b.card===chosen&&b.close<=row.date&&b.remaining===row.amount&&b.remaining>0);
 if(matching.length!==1){add(row,undefined,'Escolha o cartão. O pagamento precisa coincidir com uma fatura fechada ainda a pagar; confira descontos, estornos ou pagamento parcial.');continue}
 const payment=paymentFor(matching[0],proposed,row.date,account.id,cards(s).find(c=>c.id===chosen)?.name);add(row,{...payment,id:base.id,label:row.description},'Quita a fatura correspondente, sem contar as compras novamente.');continue}
 if(!['expense','income','refund'].includes(row.kind)){add(row,undefined,'Revise o tipo deste lançamento.');continue}
 add(row,{...base,kind:row.kind==='expense'?'expense':'income',account:account.id,...(row.kind==='income'&&salaryIds.includes(row.id)?{salaryMonth:row.date.slice(0,7)}:{})},row.kind==='refund'?'Reembolso recebido na conta; aumenta o saldo.':'Entrada ou saída do extrato bancário.');
 }
 return result;
}
export function applySetupCandidates(s:Settings,entries:Entry[],candidates:SetupCandidate[],approved:string[]){
 let next=[...entries];const selected=new Set(approved);for(const c of candidates){if(!selected.has(c.id)||!c.entry)continue;if(next.some(e=>e.sourceReports?.some(id=>c.sourceIds.includes(id))||signature(e)===signature(c.entry!)))continue;next.push(c.entry)}
 if(!validBackup({settings:s,entries:next}))throw Error('As aprovações têm vínculos pendentes. Aprove as compras da fatura junto com o pagamento ou deixe o pagamento para depois.');return next;
}
export function recurringHints(store:StatementStore){const groups=new Map<string,ReportTransaction[]>();for(const t of store.transactions){if(!['income','expense'].includes(t.kind)||store.documents.find(d=>d.id===t.documentId)?.type!=='bank')continue;const key=[t.kind,normalizeReport(t.description),t.amount].join('|');groups.set(key,[...(groups.get(key)??[]),t])}return [...groups.values()].filter(rows=>new Set(rows.map(r=>r.date.slice(0,7))).size>=2).map(rows=>({row:[...rows].sort((a,b)=>a.date.localeCompare(b.date)).at(-1)!,months:new Set(rows.map(r=>r.date.slice(0,7))).size})).slice(0,30)}
