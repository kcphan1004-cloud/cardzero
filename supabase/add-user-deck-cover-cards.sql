alter table public.user_decks
add column if not exists cover_cards jsonb not null default '[]'::jsonb;

update public.user_decks
set cover_cards = '[]'::jsonb
where cover_cards is null;
