-- Командный Telegram-бот: подключённые чаты и состояние уведомлений.
create table if not exists public.team_bot_chats (
  chat_id bigint primary key,
  title text not null default '',
  added_at timestamptz not null default now()
);
create table if not exists public.team_bot_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- Только service_role из Edge Function: политик для anon/authenticated нет.
alter table public.team_bot_chats enable row level security;
alter table public.team_bot_state enable row level security;
revoke all on public.team_bot_chats, public.team_bot_state from anon, authenticated;

-- Проверка новых событий каждые 10 минут.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('team-bot-tick') where exists (select 1 from cron.job where jobname = 'team-bot-tick');
select cron.schedule('team-bot-tick', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://apuajxotemukpjheppaz.supabase.co/functions/v1/team-bot?tick=1',
    headers := '{"content-type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
