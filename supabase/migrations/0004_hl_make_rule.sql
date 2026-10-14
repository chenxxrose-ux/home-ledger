-- 把一筆帳設成「每月固定」：可以選每月幾號。
-- 這一筆就算它那個月的，從下個月開始每月那天自動記（不會在同一個月多記一筆）。
create function public.hl_make_rule(p_entry uuid, p_dom smallint) returns uuid
language plpgsql set search_path = '' as $$
declare
  e public.hl_entries%rowtype;
  v_rule uuid;
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  if p_dom is null or p_dom < 1 or p_dom > 31 then
    raise exception '日期不對' using errcode = '22023';
  end if;
  select * into e from public.hl_entries where id = p_entry and deleted_at is null for update;
  if not found then
    raise exception '找不到這一筆' using errcode = 'P0002';
  end if;
  if e.rule_id is not null then
    raise exception '這一筆已經是每月固定了' using errcode = '23505';
  end if;
  insert into public.hl_rules (kind, amount, title, category_id, dom, start_day)
  values (e.kind, e.amount, e.title, e.category_id, p_dom, (date_trunc('month', e.day) + interval '1 month')::date)
  returning id into v_rule;
  update public.hl_entries set rule_id = v_rule where id = e.id;
  return v_rule;
end $$;

revoke execute on function public.hl_make_rule(uuid, smallint) from public, anon;
grant execute on function public.hl_make_rule(uuid, smallint) to authenticated;

-- 傳到 LINE 群組過的那筆記下時間：之後改了或刪了，機器人才知道要補一則更正
alter table public.hl_entries add column line_sent_at timestamptz;
