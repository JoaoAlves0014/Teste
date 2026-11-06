begin;
-- Execute uma vez no SQL Editor do projeto Supabase.
-- Uma linha por usuário preserva compras e pagamentos numa única transação.
create table public.finance_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ?& array['settings', 'entries'] and jsonb_typeof(data->'settings') = 'object' and jsonb_typeof(data->'entries') = 'array'),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.finance_accounts enable row level security;
revoke all on public.finance_accounts from anon;
grant select, insert, update on public.finance_accounts to authenticated;
create policy account_select on public.finance_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy account_insert on public.finance_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy account_update on public.finance_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.save_finance_account(payload jsonb, expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare saved_revision integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if expected_revision = -1 then
    insert into public.finance_accounts(user_id, data) values(auth.uid(), payload)
      on conflict(user_id) do nothing returning revision into saved_revision;
  else
    update public.finance_accounts set data = payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = expected_revision returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'Revision conflict'; end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_finance_account(jsonb, integer) from public, anon;
grant execute on function public.save_finance_account(jsonb, integer) to authenticated;

commit;
