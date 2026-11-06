import {placeCategory,MerchantCandidate} from '../../../../lib/merchant';
import {merchantCategoryHint,merchantQueryVariants,rankedMerchantCandidate,candidateRank,MerchantSuggestion} from '../../../../lib/merchant-identification';
export const runtime='nodejs';
const limits=new Map<string,{count:number;until:number}>();
const cache=new Map<string,{until:number;candidates:MerchantCandidate[];queries:string[];suggestion:MerchantSuggestion|null}>();
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const key=process.env.GOOGLE_PLACES_API_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!key)return json({code:'not_configured',error:'A pesquisa automática ainda não foi ativada. Use os links Google ou Maps.'},503);
 const auth=request.headers.get('authorization');if(!auth?.startsWith('Bearer ')||auth.length<10)return json({error:'Entre na sua conta para pesquisar.'},401);
 if(!url||!publishable)return json({error:'A autenticação da aplicação está incompleta.'},503);
 if(Number(request.headers.get('content-length')??0)>2048)return json({error:'Pesquisa muito longa.'},413);
 let query:string,location:string;
 try{const raw=await request.text();if(raw.length>2048)return json({error:'Pesquisa muito longa.'},413);const body=JSON.parse(raw);query=typeof body.query==='string'?body.query.trim():'';location=typeof body.location==='string'?body.location.trim():'';if(query.length<3||query.length>160||location.length>80)return json({error:'Informe um estabelecimento entre 3 e 160 caracteres.'},400)}catch{return json({error:'Pesquisa inválida.'},400)}
 let userId:string;
 try{const response=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:publishable,Authorization:auth},signal:AbortSignal.timeout(8000),cache:'no-store'});if(!response.ok)return json({error:'Sessão inválida. Entre novamente.'},401);const user=await response.json();if(typeof user.id!=='string')return json({error:'Sessão inválida.'},401);userId=user.id}catch{return json({error:'Não foi possível verificar a sessão. Tente novamente.'},503)}
 const now=Date.now(),cacheKey=[userId,query.toLowerCase(),location.toLowerCase()].join('|'),cached=cache.get(cacheKey);
 if(cached&&cached.until>now)return json({candidates:cached.candidates,queries:cached.queries,suggestion:cached.suggestion,cached:true});
 const queries:string[]=[],found=new Map<string,MerchantCandidate>(),suggestion=merchantCategoryHint(query);
 try{for(const variant of merchantQueryVariants(query)){
 const limit=limits.get(userId),tick=Date.now();if(limit&&limit.until>tick&&limit.count>=60)return Response.json({error:'Aguarde um minuto antes de pesquisar novamente.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(Math.max(1,Math.ceil((limit.until-tick)/1000)))}});
 if(limits.size>512)limits.clear();limits.set(userId,{count:limit&&limit.until>tick?limit.count+1:1,until:limit&&limit.until>tick?limit.until:tick+60000});
 queries.push(variant);
 const response=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.types,places.primaryType'},body:JSON.stringify({textQuery:[variant,location].filter(Boolean).join(' '),languageCode:'pt-BR',pageSize:5}),signal:AbortSignal.timeout(6500),cache:'no-store'});
 if([400,401,403].includes(response.status))return json({code:'provider_config',error:'O Google recusou a consulta. Confira a chave, a ativação da Places API (New), as restrições e o faturamento no Google Cloud.'},503);
 if(response.status===429)return json({code:'provider_quota',error:'A cota de consultas do Google foi atingida. Confira as cotas no Google Cloud e tente novamente mais tarde.'},503);
 if(!response.ok)return json({error:'O serviço de estabelecimentos não respondeu à consulta. Use Google/Maps ou tente depois.'},502);
 const data=await response.json();const candidates:MerchantCandidate[]=(Array.isArray(data.places)?data.places:[]).slice(0,5).filter((p:Record<string,unknown>)=>typeof p.id==='string'&&typeof (p.displayName as {text?:string})?.text==='string').map((p:{id:string;displayName:{text:string};formattedAddress?:string;types?:unknown;primaryType?:unknown})=>{const googleCategory=(typeof p.primaryType==='string'?placeCategory([p.primaryType]):null)??placeCategory(Array.isArray(p.types)?p.types.filter((v):v is string=>typeof v==='string'):[]);return {id:p.id.slice(0,200),name:p.displayName.text.slice(0,160),address:typeof p.formattedAddress==='string'?p.formattedAddress.slice(0,300):'',category:googleCategory??merchantCategoryHint(p.displayName.text)?.category??null,categorySource:googleCategory?'google' as const:'description' as const,url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.displayName.text)+'&query_place_id='+encodeURIComponent(p.id)}});
 for(const c of candidates){const ranked=rankedMerchantCandidate(query,c),previous=found.get(c.id);if(!previous||candidateRank(ranked)<candidateRank(previous))found.set(c.id,ranked)}
 if([...found.values()].some(c=>c.confidence!=='baixa'))break;
 }
 const candidates=[...found.values()].sort((a,b)=>candidateRank(a)-candidateRank(b)).slice(0,5);
 if(cache.size>512)cache.clear();cache.set(cacheKey,{until:now+10*60000,candidates,queries,suggestion});return json({candidates,queries,suggestion,cached:false});
 }catch{return json({error:'A consulta demorou ou falhou. Use Google/Maps e tente novamente depois.'},502)}
}
