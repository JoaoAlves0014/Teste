import {beforeEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>mock}));
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');
const {loadAccount,saveAccount}=await import('./supabase');
import {defaults} from './finance';
const data={settings:defaults,entries:[]};
beforeEach(()=>{vi.clearAllMocks();mock.from.mockReturnValue(mock);mock.select.mockReturnValue(mock);mock.eq.mockReturnValue(mock)});
describe('persistência Supabase',()=>{
 it('carrega apenas a conta do usuário solicitado',async()=>{mock.maybeSingle.mockResolvedValue({data:{data,revision:3},error:null});expect(await loadAccount('user-a')).toEqual({data,revision:3});expect(mock.eq).toHaveBeenCalledWith('user_id','user-a')});
 it('permite iniciar conta sem registros remotos',async()=>{mock.maybeSingle.mockResolvedValue({data:null,error:null});expect(await loadAccount('new-user')).toBeNull()});
 it('não transforma erro de carregamento em conta vazia',async()=>{mock.maybeSingle.mockResolvedValue({data:null,error:{message:'network'}});await expect(loadAccount('a')).rejects.toThrow('carregar')});
 it('rejeita dados remotos incompatíveis',async()=>{mock.maybeSingle.mockResolvedValue({data:{data:{},revision:0},error:null});await expect(loadAccount('a')).rejects.toThrow('compatíveis')});
 it('envia a versão lida para salvamento atômico',async()=>{mock.rpc.mockResolvedValue({data:4,error:null});expect(await saveAccount(data,3)).toBe(4);expect(mock.rpc).toHaveBeenCalledWith('save_finance_account',{payload:data,expected_revision:3})});
 it('avisa sobre conflito entre dispositivos sem sobrescrever',async()=>{mock.rpc.mockResolvedValue({data:null,error:{code:'P0001'}});await expect(saveAccount(data,3)).rejects.toThrow('Outra sessão');expect(mock.rpc).toHaveBeenCalledTimes(1)});
 it('preserva falha de rede como erro',async()=>{mock.rpc.mockResolvedValue({data:null,error:{code:'network'}});await expect(saveAccount(data,3)).rejects.toThrow('rascunho')});
 it('não envia um backup inválido',async()=>{await expect(saveAccount({settings:defaults,entries:[{} as never]},0)).rejects.toThrow('inválidos');expect(mock.rpc).not.toHaveBeenCalled()});
});
