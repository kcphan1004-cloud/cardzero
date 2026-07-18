create table if not exists public.user_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  series text not null default '',
  entries jsonb not null default '[]'::jsonb,
  total_cards integer not null default 0 check (total_cards >= 0 and total_cards <= 50),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_decks_user_updated_idx
  on public.user_decks (user_id, updated_at desc);

alter table public.user_decks enable row level security;

drop policy if exists "Users can read own decks" on public.user_decks;
create policy "Users can read own decks" on public.user_decks
for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own decks" on public.user_decks;
create policy "Users can insert own decks" on public.user_decks
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own decks" on public.user_decks;
create policy "Users can update own decks" on public.user_decks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own decks" on public.user_decks;
create policy "Users can delete own decks" on public.user_decks
for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_decks_updated_at on public.user_decks;
create trigger set_user_decks_updated_at
before update on public.user_decks
for each row execute function public.set_updated_at();
