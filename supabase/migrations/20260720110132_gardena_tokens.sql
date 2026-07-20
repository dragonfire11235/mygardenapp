-- Gardena-OAuth-Tokens je Nutzer (Multi-User). STRENG serverseitig:
-- Nur die Edge Function (service_role) liest/schreibt hier — kein Client-Zugriff.
-- Access/Refresh-Token sind sensibel; RLS ist an, es gibt aber BEWUSST keine
-- Policies für anon/authenticated → damit sind sie für Clients unlesbar.

create table if not exists public.gardena_tokens (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,   -- Ablauf des Access-Tokens
  gardena_user_id text,                    -- Husqvarna/Gardena-Account-Id (optional, Info)
  updated_at      timestamptz not null default now()
);

comment on table public.gardena_tokens is
  'Gardena-OAuth-Tokens je lumi-Nutzer. Nur via service_role (Edge Function) zugreifbar.';

-- RLS an, aber KEINE Policies → anon/authenticated haben keinerlei Zugriff.
-- service_role umgeht RLS und ist der einzige Weg an die Tokens.
alter table public.gardena_tokens enable row level security;
