-- 媽媽代繳：媽媽先幫忙繳的帳（例如電費）。照樣算是家裡的支出，另外累計「欠媽媽多少」。
-- 還給媽媽 → 那些帳標成已還（一次一筆 hl_mom_repays），可以復原最後一次。
create table public.hl_mom_repays (
  id uuid primary key default gen_random_uuid(),
  amount bigint not null,
  n integer not null,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  voided_at timestamptz
);

alter table public.hl_entries add column mom boolean not null default false;
alter table public.hl_entries add column mom_repay_id uuid references public.hl_mom_repays (id);
create index hl_entries_mom_owed on public.hl_entries (day) where mom and mom_repay_id is null and deleted_at is null;

-- 還給媽媽：把還沒還的媽媽代繳全部標成已還
create function public.hl_mom_repay() returns json
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  v_amount bigint;
  v_n integer;
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  lock table public.hl_mom_repays in exclusive mode; -- 兩支手機同時按，只會有一次成功
  select coalesce(sum(amount), 0), count(*) into v_amount, v_n
    from public.hl_entries where mom and mom_repay_id is null and deleted_at is null and kind = 'out';
  if v_n = 0 then
    raise exception '沒有要還給媽媽的（可能對方剛按過）' using errcode = 'P0001';
  end if;
  insert into public.hl_mom_repays (amount, n) values (v_amount, v_n) returning id into v_id;
  update public.hl_entries set mom_repay_id = v_id where mom and mom_repay_id is null and deleted_at is null and kind = 'out';
  return json_build_object('id', v_id, 'amount', v_amount, 'n', v_n);
end $$;

create function public.hl_mom_unrepay(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  lock table public.hl_mom_repays in exclusive mode;
  if not exists (select 1 from public.hl_mom_repays where id = p_id and voided_at is null
                 and created_at = (select max(created_at) from public.hl_mom_repays where voided_at is null)) then
    raise exception '只能復原最後一次' using errcode = 'P0001';
  end if;
  update public.hl_entries set mom_repay_id = null where mom_repay_id = p_id;
  update public.hl_mom_repays set voided_at = now() where id = p_id;
end $$;

alter table public.hl_mom_repays enable row level security;
create policy hl_mom_repays_read on public.hl_mom_repays for select to authenticated using (public.hl_is_member());
create policy hl_mom_repays_add on public.hl_mom_repays for insert to authenticated with check (public.hl_is_member());
create policy hl_mom_repays_edit on public.hl_mom_repays for update to authenticated using (public.hl_is_member()) with check (public.hl_is_member());
grant select, insert, update on public.hl_mom_repays to authenticated;
revoke all on public.hl_mom_repays from anon;
revoke execute on function public.hl_mom_repay() from public, anon;
revoke execute on function public.hl_mom_unrepay(uuid) from public, anon;
grant execute on function public.hl_mom_repay() to authenticated;
grant execute on function public.hl_mom_unrepay(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.hl_mom_repays;
  end if;
end $$;
