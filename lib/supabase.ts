import {createClient} from '@supabase/supabase-js';
import {validBackup} from './backup';
import type {Entry,Settings} from './finance';
export type FinanceData={settings:Settings;entries:Entry[]};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigIncomplete=Boolean(url)!==Boolean(key);
export const supabase=url&&key?createClient(url,key):null;
export async function loadAccount(userId:string){
 if(!supabase)throw Error('Supabase não configurado.');
 const {data,error}=await supabase.from('finance_accounts').select('data,revision').eq('user_id',userId).maybeSingle();
 if(error)throw Error('Não foi possível carregar sua conta. Confira conexão e configuração do banco.');
 if(data&&!validBackup(data.data))throw Error('Os dados recebidos não são compatíveis. Nenhum registro foi alterado.');
 return data as {data:FinanceData;revision:number}|null;
}
export async function saveAccount(data:FinanceData,revision:number){
 if(!supabase||!validBackup(data))throw Error('Dados inválidos. Exporte uma cópia e confira seus registros.');
 const result=await supabase.rpc('save_finance_account',{payload:data,expected_revision:revision});
 if(result.error){if(result.error.code==='P0001')throw Error('Outra sessão alterou seus dados. Exporte suas alterações e recarregue a conta antes de salvar.');throw Error('Não foi possível salvar na nuvem. Seu rascunho permanece neste navegador. Tente novamente.');}
 if(!Number.isSafeInteger(result.data))throw Error('O banco não confirmou o salvamento. Recarregue a conta antes de tentar novamente.');
 return result.data as number;
}
