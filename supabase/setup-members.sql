-- 把阿寶、草莓的帳號加入偶們家記帳（帳號跟叫蛋記帳共用）。只需要跑一次。
insert into public.hl_members (user_id, name, sort)
select id, case email when 'chenxxrose@gmail.com' then '阿寶' else '草莓' end, case email when 'chenxxrose@gmail.com' then 1 else 2 end
from auth.users
where email in ('chenxxrose@gmail.com', 'rspskh12222@gmail.com')
on conflict (user_id) do nothing;
