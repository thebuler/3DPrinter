create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  device_number smallint not null check (device_number between 1 and 10),
  symptom text not null check (char_length(symptom) between 1 and 100),
  description text not null check (char_length(description) between 1 and 500),
  name text not null default '' check (char_length(name) <= 40),
  status text not null default '확인 대기' check (status in ('확인 대기', '확인 중', '해결 완료')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;
grant all on table public.reports to service_role;
