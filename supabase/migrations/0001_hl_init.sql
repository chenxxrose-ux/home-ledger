-- 偶們家記帳：阿寶和草莓的生活帳
-- 跟「叫蛋記帳」「今日事」「晚餐煮什麼」共用同一個 Supabase 專案，所以每張表都用 hl_ 開頭，權限完全分開。
-- 只有 hl_members 裡的人看得到、改得到。金額一律新台幣「元」整數。
-- 刪除一筆是填 deleted_at（可以復原），不會真的刪掉。

create table public.hl_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 10),
  sort smallint not null default 0
);

create function public.hl_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hl_members where user_id = auth.uid())
$$;

create function public.hl_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───── 分類 ─────
create table public.hl_categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('out', 'in')),
  name text not null check (length(btrim(name)) between 1 and 8),
  icon text not null check (length(icon) between 1 and 20),
  color text not null check (color ~ '^[a-z]{2,12}$'),
  sort integer not null default 0,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

insert into public.hl_categories (kind, name, icon, color, sort) values
  ('out', '餐飲', 'food', 'red', 1),
  ('out', '日用品', 'bag', 'orange', 2),
  ('out', '交通', 'bus', 'teal', 3),
  ('out', '汽車', 'car', 'yellow', 4),
  ('out', '住房', 'home', 'amber', 5),
  ('out', '水電網路', 'bolt', 'sky', 6),
  ('out', '醫療保健', 'heart', 'pink', 7),
  ('out', '卡費', 'card', 'purple', 8),
  ('out', '管理費', 'building', 'blue', 9),
  ('out', '安親班', 'book', 'mint', 10),
  ('out', '娛樂', 'star', 'coral', 11),
  ('out', '其他', 'dots', 'gray', 12),
  ('in', '薪水', 'wallet', 'blue', 1),
  ('in', '獎金', 'gift', 'coral', 2),
  ('in', '投資', 'chart', 'teal', 3),
  ('in', '其他收入', 'dots', 'gray', 4);

-- ───── 每月固定（房貸、車貸…） ─────
create table public.hl_rules (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('out', 'in')),
  amount integer not null check (amount between 1 and 100000000),
  title text not null default '' check (length(title) <= 30),
  category_id uuid not null references public.hl_categories (id),
  dom smallint not null check (dom between 1 and 31),
  start_day date not null,
  stopped_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───── 每一筆 ─────
create table public.hl_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('out', 'in')),
  amount integer not null check (amount between 1 and 100000000),
  title text not null default '' check (length(title) <= 30),
  category_id uuid not null references public.hl_categories (id),
  day date not null,
  note text not null default '' check (length(note) <= 200),
  rule_id uuid references public.hl_rules (id),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index hl_entries_day on public.hl_entries (day);
-- 每月固定的同一個月只會有一筆（兩支手機同時打開也不會重複）
create unique index hl_entries_rule_day on public.hl_entries (rule_id, day) where rule_id is not null;

create trigger hl_categories_touch before update on public.hl_categories for each row execute function public.hl_touch();
create trigger hl_rules_touch before update on public.hl_rules for each row execute function public.hl_touch();
create trigger hl_entries_touch before update on public.hl_entries for each row execute function public.hl_touch();

-- 每月固定：把「開始那天」到「這個月」之間每個月的那一筆補上（像現在用的 App，一進到這個月就先列出來）。
-- 日子超過當月天數（例如 31 號）就記在月底。
create function public.hl_run_rules(p_today date) returns integer
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
        insert into public.hl_entries (kind, amount, title, category_id, day, rule_id, created_by)
        values (r.kind, r.amount, r.title, r.category_id, d, r.id, r.created_by)
        on conflict (rule_id, day) where rule_id is not null do nothing;
        get diagnostics added = row_count;
        n := n + added;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
  return n;
end $$;

-- 記一筆（要每月重複時，規則和這一筆在同一個交易裡建立，另一支手機不會趁中間補出重複的一筆）
create function public.hl_add_entry(
  p_id uuid, p_kind text, p_amount integer, p_title text, p_category uuid, p_day date, p_note text, p_repeat boolean
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_rule uuid;
begin
  if not public.hl_is_member() then
    raise exception '沒有權限' using errcode = '42501';
  end if;
  if p_repeat then
    insert into public.hl_rules (kind, amount, title, category_id, dom, start_day)
    values (p_kind, p_amount, coalesce(p_title, ''), p_category, extract(day from p_day)::smallint, p_day)
    returning id into v_rule;
  end if;
  insert into public.hl_entries (id, kind, amount, title, category_id, day, note, rule_id)
  values (p_id, p_kind, p_amount, coalesce(p_title, ''), p_category, p_day, coalesce(p_note, ''), v_rule);
  return p_id;
end $$;

-- ───── 權限：成員可以看、新增、修改；沒有刪除 ─────
do $$
declare t text;
begin
  foreach t in array array['hl_categories', 'hl_rules', 'hl_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.hl_is_member())', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.hl_is_member())', t || '_add', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.hl_is_member()) with check (public.hl_is_member())', t || '_edit', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.hl_members enable row level security;
create policy hl_members_read on public.hl_members for select to authenticated using (public.hl_is_member());
grant select on public.hl_members to authenticated;
-- Supabase 預設會把新函式、新表開給 anon（沒登入的人），這裡收回
revoke execute on function public.hl_is_member() from public, anon;
revoke execute on function public.hl_run_rules(date) from public, anon;
revoke execute on function public.hl_add_entry(uuid, text, integer, text, uuid, date, text, boolean) from public, anon;
revoke all on public.hl_members, public.hl_categories, public.hl_rules, public.hl_entries from anon;
grant execute on function public.hl_add_entry(uuid, text, integer, text, uuid, date, text, boolean) to authenticated;
grant execute on function public.hl_is_member() to authenticated;
grant execute on function public.hl_run_rules(date) to authenticated;

-- 兩支手機即時同步
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.hl_categories, public.hl_rules, public.hl_entries;
  end if;
end $$;
