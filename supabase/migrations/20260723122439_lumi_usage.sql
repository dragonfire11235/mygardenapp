-- Tages-Nutzungszähler für den lumi-KI-Assistenten (Rate-Limiting je Nutzer/Tag).
-- STRENG serverseitig: Nur die Edge Function `lumi` (service_role) liest/schreibt hier.

create table if not exists public.lumi_usage (
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  requests      int not null default 0,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.lumi_usage is
  'Tägliche Nutzung des lumi-KI-Assistenten je Nutzer. Nur via service_role (Edge Function) zugreifbar.';

-- RLS an, aber KEINE Policies → anon/authenticated haben keinerlei Zugriff.
alter table public.lumi_usage enable row level security;
