-- 偶們家記帳：LINE 機器人
-- hl_line_cfg 存 Channel secret／access token、綁定的群組、排程用的 cron_key。只有 edge function（service role）讀寫。
create table public.hl_line_cfg (k text primary key, v text not null, updated_at timestamptz not null default now());
alter table public.hl_line_cfg enable row level security;
revoke all on public.hl_line_cfg from public, anon, authenticated;

-- 在 LINE 群組打字記的，標成 line（打錯可以在群組打「取消」）
alter table public.hl_entries add column via text not null default 'app' check (via in ('app', 'line'));

insert into public.hl_line_cfg (k, v) values ('cron_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (k) do nothing;

-- 每月 1 號早上 9 點（台灣）把上個月的總結傳到群組。測試環境沒有 pg_cron 就跳過。
do $outer$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.unschedule('hl-line-monthly') where exists (select 1 from cron.job where jobname = 'hl-line-monthly');
    perform cron.schedule('hl-line-monthly', '0 1 1 * *', $job$
      select net.http_post(
        url := 'https://bhaxitqzdrcndshxgvtx.supabase.co/functions/v1/hl-line',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('op', 'monthly', 'key', (select v from public.hl_line_cfg where k = 'cron_key')),
        timeout_milliseconds := 20000);
    $job$);
  end if;
end $outer$;
