import {merchantKey} from './merchant';
import Papa from 'papaparse';
import {ReportDocument,ReportKind,ReportRule,ReviewRow,StatementStore,normalizeReport,validDate} from './statement-types';
export type ImportOptions={document:ReportDocument;year:number;month:number;pdfAmount:'first'|'last';rules:ReportRule[]};
export type ImportResult={rows:ReviewRow[];rejected:{line:number;text:string;reason:string}[];warnings:string[];inferredDates:number;expectedTotal?:number};
export type ColumnMap={date:number;description:number;amount:number;credit:number;debit:number;direction:number;mode:'single'|'split';unit:'reais'|'centavos'};
export function reportMoney(raw:string,unit:'reais'|'centavos'='reais'){
 const source=raw.trim();if(!source)return null;
 const negative=!/C\s*$/i.test(source)&&/[−-]|\(|D\s*$/i.test(source);let s=source.replace(/[R$€£\s()−+CD-]/gi,'');if(!/^[\d.,]+$/.test(s))return null;
 const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.'),last=Math.max(comma,dot);
 if(comma>=0&&dot>=0){s=s.slice(0,last).replace(/[.,]/g,'')+'.'+s.slice(last+1)}
 else if(last>=0){const fraction=s.length-last-1;s=fraction<=2?s.slice(0,last).replace(/[.,]/g,'')+'.'+s.slice(last+1):s.replace(/[.,]/g,'')}
 const number=Number(s),value=Math.round(number*(unit==='reais'?100:1));
 return Number.isFinite(number)&&Number.isSafeInteger(value)?(negative?-value:value):null;
}
export function reportDate(raw:string,year:number,referenceMonth=0){
 const s=raw.trim().replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s.*)?$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');let date='';let inferred=false;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))date=s.slice(0,10);
 else {const numeric=s.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2}|\d{4}))?$/);const named=s.match(/^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(?:[A-Z]*)?(?:\s+(\d{4}))?$/i);
 if(!numeric&&!named)return null;const d=Number((numeric??named)![1]);const m=numeric?Number(numeric[2]):['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'].indexOf(named![2].toUpperCase())+1;const given=(numeric??named)![3];inferred=!given;let y=given?Number(given):year;if(given?.length===2)y+=y>=70?1900:2000;if(!given&&referenceMonth&&m>referenceMonth)y--;date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
 return validDate(date)?{date,inferred}:null;
}
export function classify(description:string,signed:number,type:'card'|'bank',rules:ReportRule[],direction=''):{kind:ReportKind;category:string;reviewed:boolean}{
 const s=normalizeReport(description),key=merchantKey(description),matches=key?rules.filter(r=>(r.merchantKey??merchantKey(r.description))===key):[],rule=rules.find(r=>normalizeReport(r.description)===s)??(new Set(matches.map(r=>r.category+'|'+r.kind)).size===1?matches[0]:undefined);if(rule){const base=classify(description,signed,type,[],direction),sameSource=rule.documentType===type&&rule.polarity===(signed<0?'negative':'positive'),apply=sameSource||rule.kind===base.kind;return {kind:apply?rule.kind:base.kind,category:rule.category,reviewed:apply}};
 let kind:ReportKind;
 if(/(saldo (anterior|final|do dia|restante)|total (da fatura|a pagar|de compras))/.test(s))kind='ignore';
 else if(/(pagamento|pagto|pagt|pgto).*(fatura|cartao)/.test(s)||(type==='card'&&/^(pagamento (recebido|em\b)|pagamento efetuado)/.test(s)))kind='bill_payment';
 else if(/mesma titularidade|entre (minhas )?contas|transferencia propria/.test(s))kind='transfer';
 else if(/estorno|reembolso|cancelamento de compra/.test(s))kind='refund';
 else if(/^(d|debito|saida|out|despesa|compra)$/.test(normalizeReport(direction)))kind='expense';
 else if(/^(c|credito|entrada|in|receita)$/.test(normalizeReport(direction)))kind=type==='card'?'refund':'income';
 else kind=type==='card'?(signed<0?'refund':'expense'):(signed<0?'expense':'income');
 let category='Não categorizado';
 if(/mercado\s*(pago|livre)|amazon|magalu|shopee|shein/.test(s))category='Compras';
 else if(/supermerc|hipermerc|atacadao|assai|muffato|condor|carrefour|angeloni|festval|\bmercado\b/.test(s))category='Mercado';
 else if(/restaur|lanchon|coxinha|padaria|pizz|hamburg|ifood|99food|delivery|pastel|coffee|cafeteria/.test(s))category='Restaurantes';
 else if(/uber|99.*(ride|trip)|taxi|onibus|metro|combust|posto.*(gas|auto)/.test(s))category='Transporte';
 else if(/iof|juros|tarifa|multa|imposto|anuidade/.test(s))category='Tarifas e impostos';
 else if(/netflix|spotify|chatgpt|openai|assinatura|prime video/.test(s))category='Assinaturas';
 else if(/farmac|drogaria|hospital|clinica|medic/.test(s))category='Saúde';
 else if(/escola|faculdade|curso|livraria/.test(s))category='Educação';
 else if(/aluguel|condominio|energia|sanepar|copel|internet|daju/.test(s))category='Moradia';
 else if(/cinema|teatro|parque|show/.test(s))category='Lazer';
 else if(/hotel|booking|airbnb|passagem|consettur/.test(s))category='Viagens';
 return {kind,category,reviewed:false};
}
export function readCSV(text:string,delimiter='',headerRow?:number,hasHeader=true){
 const parsed=Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{delimiter,skipEmptyLines:'greedy'});
 const rows=parsed.data.map(r=>r.map(v=>String(v??'').trim()));
 const detected=rows.findIndex(r=>r.some(v=>/^(date|data|data do lancamento|data lancamento)$/.test(normalizeReport(v)))&&r.length>=2);
 const start=headerRow??Math.max(0,detected),header=rows[start]??[],headers=hasHeader?header:header.map((_,i)=>`Coluna ${i+1}`);
 const names=headers.map(normalizeReport),find=(re:RegExp)=>names.findIndex(v=>re.test(v));
 const map:ColumnMap={date:find(/^(date|data|data do lancamento|data lancamento|dt.*)$/),description:find(/^(title|description|descricao|historico|lancamento|transacao|detalhes)$/),amount:find(/^(amount|valor|value|valor.*lancamento)$/),credit:find(/^(credito|credit|entrada|receita).*$/),debit:find(/^(debito|debit|saida|despesa).*$/),direction:find(/^(tipo|type|natureza|sentido|d.c|dc)$/),mode:'single',unit:'reais'};
 if(map.amount<0&&map.credit>=0&&map.debit>=0)map.mode='split';
 return {headers,rows:rows.slice(start+(hasHeader?1:0)),map,headerRow:start,delimiter:parsed.meta.delimiter,warnings:parsed.errors.map(e=>`CSV: ${e.message}`)};
}
function parsedRow(date:string,description:string,signed:number,direction:string,line:number,options:ImportOptions){
 const d=reportDate(date,options.year,options.month);if(!d||!description.trim()||!Number.isSafeInteger(signed)||signed===0)return null;
 const clean=description.replace(/[•●*]{4}\s*\d{4}\s*/g,'').trim().slice(0,500),type=classify(clean,signed,options.document.type,options.rules,direction);
 return {row:{id:crypto.randomUUID(),documentId:options.document.id,date:d.date,description:clean,amount:Math.abs(signed),sourceKey:`${d.date}|${normalizeReport(clean)}|${signed}`,...type,include:true,duplicate:false,line} as ReviewRow,inferred:d.inferred};
}
export function parseCSVRows(rows:string[][],map:ColumnMap,options:ImportOptions):ImportResult{
 const result:ImportResult={rows:[],rejected:[],warnings:[],inferredDates:0};
 if(map.date<0||map.description<0||(map.mode==='single'?map.amount<0:map.credit<0||map.debit<0)){result.warnings.push('Selecione as colunas de data, descrição e valor para gerar a revisão.');return result}
 rows.forEach((r,i)=>{let signed:number|null,direction=map.direction>=0?r[map.direction]??'':'';
 if(map.mode==='split'){const cr=r[map.credit]??'',dr=r[map.debit]??'',parsedCredit=reportMoney(cr,map.unit),parsedDebit=reportMoney(dr,map.unit);if((cr.trim()&&parsedCredit===null)||(dr.trim()&&parsedDebit===null)){result.rejected.push({line:i+1,text:r.join(' | '),reason:'Valor de crédito ou débito inválido.'});return}const credit=parsedCredit??0,debit=parsedDebit??0;if(credit&&debit){result.rejected.push({line:i+1,text:r.join(' | '),reason:'Crédito e débito preenchidos juntos.'});return}signed=credit?Math.abs(credit):-Math.abs(debit);direction=credit?'credito':'debito'}
 else {const raw=r[map.amount]??'';signed=reportMoney(raw,map.unit);if(!direction)direction=raw.match(/([CD])\s*$/i)?.[1]??''}
 const parsed=signed===null?null:parsedRow(r[map.date]??'',r[map.description]??'',signed,direction,i+1,options);
 if(!parsed){result.rejected.push({line:i+1,text:r.join(' | '),reason:'Data, descrição ou valor ausente, zero ou inválido.'});return}result.rows.push(parsed.row);if(parsed.inferred)result.inferredDates++});return result;
}
export function parsePDFText(text:string,options:ImportOptions):ImportResult{
 const result:ImportResult={rows:[],rejected:[],warnings:[],inferredDates:0};
 const datePattern=/^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}(?:[/.\-](?:\d{4}|\d{2}))?|\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-ZÀ-ÿ]*(?:\s+\d{4})?)\b\s*(.*)$/i;
 text.split('\n').forEach((line,i)=>{
 const normalized=normalizeReport(line);if(/total a pagar/.test(normalized)){const val=line.match(/R\$\s*[\d.,]+/g)?.at(-1);if(val){const v=reportMoney(val);if(v!==null&&v>0)result.expectedTotal=v}}
 const match=line.match(datePattern);if(!match)return;
 const rest=match[2];if(/^(a|ate)\s+\d/i.test(rest))return;
 const amounts=[...rest.matchAll(/[−+-]?\s*(?:R\$\s*)?\(?\d+(?:[.,]\d{3})*[.,]\d{2}\)?\s*[CD−-]?(?=\s|$)/gi)];
 const amount=options.pdfAmount==='first'?amounts[0]:amounts.at(-1);
 if(!amount){result.rejected.push({line:i+1,text:line,reason:'Linha com data sem valor reconhecido.'});return}
 const description=rest.slice(0,amount.index).replace(/^\s*\d{2}:\d{2}(?::\d{2})?\s*/,'').trim();
 const signed=reportMoney(amount[0]),direction=amount[0].match(/([CD])\s*$/i)?.[1]??'';
 const parsed=signed===null?null:parsedRow(match[1],description,signed,direction,i+1,options);
 if(!parsed){result.rejected.push({line:i+1,text:line,reason:'Data, descrição ou valor inválido/zero.'});return}result.rows.push(parsed.row);if(parsed.inferred)result.inferredDates++
 });
 if(!result.rows.length)result.warnings.push('Nenhum lançamento reconhecido. Ajuste a leitura ou use CSV/texto tabulado. PDFs digitalizados precisam de OCR antes da importação.');
 return result;
}
export function detectBank(name:string,text:string){const s=normalizeReport(name+' '+text.slice(0,12000));return /nubank|nu pagamentos/.test(s)?'Nubank':/caixa economica|caixa economica federal/.test(s)?'CAIXA':/banco do brasil/.test(s)?'Banco do Brasil':/itau/.test(s)?'Itaú':/bradesco/.test(s)?'Bradesco':/santander/.test(s)?'Santander':/c6 bank/.test(s)?'C6':/inter\s/.test(s)?'Inter':'Outro banco'}
export function inferReference(name:string,text:string){const s=normalizeReport(name),iso=s.match(/(20\d{2})[-_](\d{2})/),year=Number(iso?.[1]??s.match(/20\d{2}/)?.[0]??text.match(/\d{2}[/.-]\d{2}[/.-](20\d{2})/)?.[1]??new Date().getFullYear());const months=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];const month=iso?Number(iso[2]):months.findIndex(m=>s.includes(m))+1;return {year,month}}
function fingerprint(t:ReviewRow|StatementStore['transactions'][number],d:ReportDocument){return [normalizeReport(d.bank),normalizeReport(d.account),d.type,t.sourceKey??[t.date,normalizeReport(t.description),t.amount].join('|')].join('|')}
export function flagDuplicates(rows:ReviewRow[],document:ReportDocument,store:StatementStore){
 const docs=new Map(store.documents.map(d=>[d.id,d])),existing=new Map<string,number>(),seen=new Map<string,number>();
 for(const t of store.transactions){const d=docs.get(t.documentId);if(d){const key=fingerprint(t,d);existing.set(key,(existing.get(key)??0)+1)}}
 return rows.map(row=>{const key=fingerprint(row,document),occurrence=(seen.get(key)??0)+1;seen.set(key,occurrence);const duplicate=occurrence<=(existing.get(key)??0);return {...row,duplicate,include:!duplicate}});
}
export function commitStatement(store:StatementStore,document:ReportDocument,rows:ReviewRow[]):StatementStore{
 if(store.documents.some(d=>d.hash===document.hash))throw Error('Este arquivo já foi importado. Nenhum dado foi duplicado.');
 const accepted=rows.filter(r=>r.include);if(!accepted.length)throw Error('Selecione pelo menos um lançamento válido para importar.');
 if(store.documents.length>=120||store.transactions.length+accepted.length>10000)throw Error('Limite desta análise: 120 arquivos ou 10 mil lançamentos. Exporte um backup antes de iniciar outra análise.');
 return {...store,documents:[...store.documents,{...document,rowCount:accepted.length,skipped:document.skipped+rows.length-accepted.length}],transactions:[...store.transactions,...accepted.map(({include,duplicate,line,...t})=>t)]};
}
