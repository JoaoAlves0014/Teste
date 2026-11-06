import {test,expect} from '@playwright/test';
import {defaults} from '../lib/finance';
test('login obrigatório quando o Supabase está configurado',async({page})=>{await page.goto('/');await expect(page.getByRole('button',{name:'Entrar com Google'})).toBeVisible();await expect(page.locator('.available')).toHaveCount(0)});
test('carrega conta, salva versão e mostra conflito sem perder alterações',async({page})=>{
 const userId='11111111-1111-4111-8111-111111111111';
 await page.addInitScript(({userId})=>localStorage.setItem('sb-zevonxoyngnjgrlacyia-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:userId,aud:'authenticated',role:'authenticated',email:'test@example.com',app_metadata:{provider:'google'},user_metadata:{},created_at:new Date().toISOString()}})),{userId});
 await page.route('https://zevonxoyngnjgrlacyia.supabase.co/**',async route=>{
 const url=route.request().url();
 if(url.includes('/rest/v1/finance_accounts'))return route.fulfill({json:{data:{settings:{...defaults,balance:100000},entries:[]},revision:2}});
 if(url.includes('/auth/v1/user'))return route.fulfill({json:{id:userId,aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{}}});
 if(url.includes('/rest/v1/rpc/save_finance_account'))return route.fulfill({status:400,json:{code:'P0001',message:'Revision conflict'}});
 return route.fulfill({json:{}});
 });
 await page.goto('/');await expect(page.locator('.available')).toBeVisible();
 await page.getByRole('button',{name:'Nova movimentação'}).click();
 await page.getByLabel('Descrição',{exact:true}).fill('Compra teste');await page.getByLabel('Valor (R$)',{exact:true}).fill('10');await page.getByRole('button',{name:'Salvar movimentação'}).click();
 await expect(page.getByText('Alterações pendentes',{exact:true})).toBeVisible();
 const request=page.waitForRequest(r=>r.url().includes('rpc/save_finance_account'));
 await page.getByRole('button',{name:'Salvar na nuvem',exact:true}).click();
 expect((await request).postDataJSON().expected_revision).toBe(2);
 await expect(page.getByText(/Outra sessão alterou seus dados/)).toBeVisible();
 await expect(page.getByText('Compra teste',{exact:true})).toBeVisible();
 await page.route('https://zevonxoyngnjgrlacyia.supabase.co/rest/v1/rpc/save_finance_account',r=>r.fulfill({json:3}));
 await page.getByRole('button',{name:'Salvar na nuvem',exact:true}).click();
 await expect(page.getByText('Dados salvos na nuvem.',{exact:true})).toBeVisible();
});
