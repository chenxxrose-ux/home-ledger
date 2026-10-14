-- 偶們家記帳：結算（像你們現在用的 App）
-- 每記一筆就累計在「還沒結算」；按結算 → 變成「第 N 次結算」，那些帳標成已結算。結算可以復原（只有最後一次）。

alter table public.hl_entries add column settlement_id uuid;

create table public.hl_settlements (
  id uuid primary key default gen_random_uuid(),
  no integer not null check (no >= 1),
  upto date not null,
  out_total bigint not null,
  in_total bigint not null,
  n integer not null,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create unique index hl_settlements_no on public.hl_settlements (no) where voided_at is null;
alter table public.hl_entries add constraint hl_entries_settlement foreign key (settlement_id) references public.hl_settlements (id);
create index hl_entries_unsettled on public.hl_entries (day) where settlement_id is null and deleted_at is null;

-- 結算：把到 p_upto 為止、還沒結算的帳結算掉
create function public.hl_settle(p_upto date) returns json
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  v_no integer;
  v_out bigint;
  v_in bigint;
  v_n integer;
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  lock table public.hl_settlements in exclusive mode; -- 兩支手機同時按，只會有一次成功
  select coalesce(sum(amount) filter (where kind = 'out'), 0), coalesce(sum(amount) filter (where kind = 'in'), 0), count(*)
    into v_out, v_in, v_n
    from public.hl_entries
    where settlement_id is null and deleted_at is null and day <= p_upto;
  if v_n = 0 then
    raise exception '沒有要結算的帳（可能對方剛結算過）' using errcode = 'P0001';
  end if;
  select coalesce(max(no), 0) + 1 into v_no from public.hl_settlements where voided_at is null;
  insert into public.hl_settlements (no, upto, out_total, in_total, n)
    values (v_no, p_upto, v_out, v_in, v_n) returning id into v_id;
  update public.hl_entries set settlement_id = v_id
    where settlement_id is null and deleted_at is null and day <= p_upto;
  return json_build_object('id', v_id, 'no', v_no, 'out_total', v_out, 'in_total', v_in, 'n', v_n);
end $$;

-- 復原結算（只能復原最後一次）
create function public.hl_unsettle(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  lock table public.hl_settlements in exclusive mode;
  if not exists (select 1 from public.hl_settlements where id = p_id and voided_at is null
                 and no = (select max(no) from public.hl_settlements where voided_at is null)) then
    raise exception '只能復原最後一次結算' using errcode = 'P0001';
  end if;
  update public.hl_entries set settlement_id = null where settlement_id = p_id;
  update public.hl_settlements set voided_at = now() where id = p_id;
end $$;

alter table public.hl_settlements enable row level security;
create policy hl_settlements_read on public.hl_settlements for select to authenticated using (public.hl_is_member());
create policy hl_settlements_add on public.hl_settlements for insert to authenticated with check (public.hl_is_member());
create policy hl_settlements_edit on public.hl_settlements for update to authenticated using (public.hl_is_member()) with check (public.hl_is_member());
grant select, insert, update on public.hl_settlements to authenticated;
revoke all on public.hl_settlements from anon;
revoke execute on function public.hl_settle(date) from public, anon;
revoke execute on function public.hl_unsettle(uuid) from public, anon;
grant execute on function public.hl_settle(date) to authenticated;
grant execute on function public.hl_unsettle(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.hl_settlements;
  end if;
end $$;
