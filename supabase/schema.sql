-- CardZero 牌组投稿系统
-- 在 Supabase Dashboard > SQL Editor 执行整份脚本。

create extension if not exists pgcrypto;

create table if not exists public.deck_submissions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,

  author_name text not null
    check (char_length(author_name) between 2 and 40),
  contact text
    check (contact is null or char_length(contact) <= 120),

  deck_name text not null
    check (char_length(deck_name) between 2 and 80),
  series text not null
    check (char_length(series) between 1 and 80),
  color text not null
    check (char_length(color) between 1 and 30),
  deck_type text not null
    check (char_length(deck_type) between 1 and 50),

  deck_code text
    check (deck_code is null or char_length(deck_code) <= 4000),
  deck_link text
    check (deck_link is null or char_length(deck_link) <= 500),

  description text not null
    check (char_length(description) between 20 and 3000),
  strategy text not null
    check (char_length(strategy) between 20 and 5000),

  image_url text not null,
  image_path text not null,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text
    check (admin_note is null or char_length(admin_note) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists deck_submissions_status_created_idx
  on public.deck_submissions (status, created_at desc);

create index if not exists deck_submissions_published_idx
  on public.deck_submissions (published_at desc)
  where status = 'approved';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deck_submissions_set_updated_at
  on public.deck_submissions;

create trigger deck_submissions_set_updated_at
before update on public.deck_submissions
for each row
execute function public.set_updated_at();

-- 所有浏览器端直接访问都禁止。
-- 网站通过服务器端 Secret / Service Role key 访问。
alter table public.deck_submissions enable row level security;

revoke all on table public.deck_submissions from anon, authenticated;
