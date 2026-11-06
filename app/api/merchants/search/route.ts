import {placeCategory,MerchantCandidate} from '../../../../lib/merchant';
export const runtime='nodejs';
const limits=new Map<string,{count:number;until:number}>();
const cache=new Map<string,{until:number;candidates:MerchantCandidate[]}>();
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
 if(cached&&cached.until>now)return json({candidates:cached.candidates,cached:true});
 const limit=limits.get(userId);if(limit&&limit.until>now&&limit.count>=6)return json({error:'Aguarde um minuto antes de pesquisar novamente.'},429);
 if(limits.size>512)limits.clear();limits.set(userId,{count:limit&&limit.until>now?limit.count+1:1,until:limit&&limit.until>now?limit.until:now+60000});
 try{const response=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.types'},body:JSON.stringify({textQuery:[query,location].filter(Boolean).join(' '),languageCode:'pt-BR',pageSize:5}),signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!response.ok)return json({error:'O serviço de estabelecimentos não respondeu à consulta. Use Google/Maps ou tente depois.'},502);
 const data=await response.json();const candidates:MerchantCandidate[]=(Array.isArray(data.places)?data.places:[]).slice(0,5).filter((p:Record<string,unknown>)=>typeof p.id==='string'&&typeof (p.displayName as {text?:string})?.text==='string').map((p:{id:string;displayName:{text:string};formattedAddress?:string;types?:unknown})=>({id:p.id.slice(0,200),name:p.displayName.text.slice(0,160),address:typeof p.formattedAddress==='string'?p.formattedAddress.slice(0,300):'',category:placeCategory(Array.isArray(p.types)?p.types.filter((v):v is string=>typeof v==='string'):[]),url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.displayName.text)+'&query_place_id='+encodeURIComponent(p.id)}));
 if(cache.size>512)cache.clear();cache.set(cacheKey,{until:now+10*60000,candidates});return json({candidates,cached:false});
 }catch{return json({error:'A consulta demorou ou falhou. Use Google/Maps e tente novamente depois.'},502)}
}
