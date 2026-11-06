import {merchantKey,merchantSearchName,MerchantCandidate} from './merchant';
import type {ReportRule} from './statement-types';
export type MerchantSuggestion={category:string|null;confidence:'alta'|'media'|'baixa';source:'description'|'history';reason:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function merchantCategoryHint(description:string):MerchantSuggestion|null{
 if(!merchantKey(description))return null;const s=normalize(merchantSearchName(description));
 const hints:[RegExp,string,string][]=[
 [/\b(otica\w*|optica\w*|optical\w*|oculos|lentes|farmacia\w*|drogaria\w*|hospital\w*|clinica\w*|dentista\w*)\b/,'Saúde','O nome contém uma referência a ótica, farmácia ou atendimento de saúde.'],
 [/\b(supermerc\w*|hipermerc\w*|atacado\w*|mercearia\w*|hortifruti\w*)\b/,'Mercado','O nome contém uma referência a supermercado ou alimentos para casa.'],
 [/\b(restaur\w*|pizz\w*|lanch\w*|hamburg\w*|padaria\w*|cafeteria\w*|coffee|bakery|sorvet\w*|acai|ifood|pastel\w*)\b/,'Restaurantes','O nome contém uma referência a restaurante, lanchonete ou alimentação pronta.'],
 [/\b(uber|nupay uber|taxi|99\s*(ride|trip)|onibus|metro|combust\w*|estacionamento\w*)\b/,'Transporte','O nome contém uma referência a transporte ou deslocamento.'],
 [/\b(netflix|spotify|assinatura\w*|prime video|chatgpt)\b/,'Assinaturas','O nome contém uma referência a assinatura ou serviço recorrente.'],
 [/\b(escola\w*|faculdade\w*|universidade\w*|curso\w*|livraria\w*)\b/,'Educação','O nome contém uma referência a ensino, cursos ou livros.'],
 [/\b(hotel\w*|hostel\w*|pousada\w*|airbnb|booking|travel|turismo\w*)\b/,'Viagens','O nome contém uma referência a hospedagem ou viagem.'],
 [/\b(cinema\w*|teatro\w*|boliche\w*|parque\w*)\b/,'Lazer','O nome contém uma referência a atividades de lazer.'],
 [/\b(roupa\w*|calcado\w*|vestuario\w*|eletronico\w*|informatica\w*|papelaria\w*)\b/,'Compras','O nome contém uma referência a uma loja ou produto.']
 ];
 for(const [pattern,category,reason] of hints)if(pattern.test(s))return {category,confidence:'media',source:'description',reason:reason+' É uma pista pelo texto, sem confirmar o estabelecimento.'};
 if(/\bdigital\b/.test(s))return {category:null,confidence:'baixa',source:'description',reason:'“Digital” pode indicar uma loja ou um serviço online. O nome é genérico e não permite determinar a categoria.'};
 return null;
}
export function rememberedMerchantHint(description:string,rules:ReportRule[]):MerchantSuggestion|null{
 const key=merchantKey(description);if(!key)return null;const matches=rules.filter(r=>r.kind==='expense'&&(r.merchantKey??merchantKey(r.description))===key&&r.category!=='Não categorizado');
 const categories=[...new Set(matches.map(r=>r.category))];return categories.length===1?{category:categories[0],confidence:'alta',source:'history',reason:'Você já confirmou esta categoria para o mesmo nome de estabelecimento. Confira se é a mesma empresa.'}:null;
}
export function merchantQueryVariants(description:string){
 const clean=merchantSearchName(description),words=clean.replace(/([a-zá-ú])([A-ZÁ-Ú])/g,'$1 $2').replace(/^(ótica|otica|óptica|optica)(?=[a-z])/i,'$1 ').replace(/[.*_\/]+/g,' ').replace(/\s+/g,' ').trim(),short=words.replace(/\s+(?:ltda|eireli|s\s*a|me|loja\s*\d+|\d{3,})\b.*$/i,'').trim();
 const result=[clean,words,short].filter(v=>v.length>=3),seen=new Set<string>();return result.filter(v=>{const key=normalize(v);if(seen.has(key))return false;seen.add(key);return true}).slice(0,3);
}
export function rankedMerchantCandidate(query:string,candidate:MerchantCandidate):MerchantCandidate{
 const q=normalize(merchantSearchName(query)),n=normalize(candidate.name),compact=(s:string)=>s.replace(/\s/g,''),tokens=q.split(' ').filter(t=>t.length>=3&&!['ltda','digital','loja','comercio','servicos'].includes(t)),nameTokens=new Set(n.split(' '));
 let confidence:'alta'|'media'|'baixa'='baixa',matchReason='O nome encontrado tem pouca semelhança com o da fatura. Pode ser outra empresa.';
 if(compact(q)===compact(n)){confidence='alta';matchReason='O nome encontrado corresponde ao nome pesquisado. O endereço ainda precisa ser conferido.'}
 else if(tokens.length&&tokens.every(t=>nameTokens.has(t))){confidence='media';matchReason='O resultado contém os principais termos do nome pesquisado. Confira o endereço e a atividade.'}
 else if(compact(q).length>=6&&(compact(n).includes(compact(q))||compact(q).includes(compact(n))&&compact(n).length>=6)){confidence='media';matchReason='Há uma correspondência parcial entre os nomes. Confira se é a mesma empresa.'}
 return {...candidate,confidence,matchReason};
}
export const candidateRank=(c:MerchantCandidate)=>c.confidence==='alta'?0:c.confidence==='media'?1:2;
export function recommendedMerchant(candidates:MerchantCandidate[]){const plausible=candidates.filter(c=>c.confidence!=='baixa');return plausible.length===1?plausible[0]:undefined}
