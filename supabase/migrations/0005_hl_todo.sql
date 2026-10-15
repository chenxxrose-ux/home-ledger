-- 待繳：先記起來、還沒繳的帳。繳了在網站上勾一下（todo = false）。
-- 待繳的不算進結算；每月固定自動補的，日子還沒到的先當待繳。
alter table public.hl_entries add column todo boolean not null default false;

create or replace function public.hl_settle(p_upto date) returns json
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
    where settlement_id is null and deleted_at is null and not todo and day <= p_upto;
  if v_n = 0 then
    raise exception '沒有要結算的帳（可能對方剛結算過）' using errcode = 'P0001';
  end if;
  select coalesce(max(no), 0) + 1 into v_no from public.hl_settlements where voided_at is null;
  insert into public.hl_settlements (no, upto, out_total, in_total, n)
    values (v_no, p_upto, v_out, v_in, v_n) returning id into v_id;
  update public.hl_entries set settlement_id = v_id
    where settlement_id is null and deleted_at is null and not todo and day <= p_upto;
  return json_build_object('id', v_id, 'no', v_no, 'out_total', v_out, 'in_total', v_in, 'n', v_n);
end $$;

create or replace function public.hl_run_rules(p_today date) returns integer
language plpgsql set search_path = '' as $$
declare
  n integer := 0;
  r record;
  m date;
  d date;
  added integer;
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  for r in select * from public.hl_rules where stopped_at is null loop
    m := date_trunc('month', r.start_day)::date;
    while m <= date_trunc('month', p_today)::date loop
      d := least(m + (r.dom - 1), (m + interval '1 month' - interval '1 day')::date);
      if d >= r.start_day then
        insert into public.hl_entries (kind, amount, title, category_id, day, rule_id, created_by, todo)
        values (r.kind, r.amount, r.title, r.category_id, d, r.id, r.created_by, r.kind = 'out' and d > p_today)
        on conflict (rule_id, day) where rule_id is not null do nothing;
        get diagnostics added = row_count;
        n := n + added;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  return n;
end $$;
