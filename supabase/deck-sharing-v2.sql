alter table public.deck_submissions
  add column if not exists slug text,
  add column if not exists author_name text,
  add column if not exists color text,
  add column if not exists deck_type text,
  add column if not exists description text,
  add column if not exists published_at timestamptz;

update public.deck_submissions
set
  author_name = coalesce(author_name, submitter_name),
  description = coalesce(description, notes),
  published_at = coalesce(published_at, reviewed_at, created_at)
where author_name is null or description is null or published_at is null;

update public.deck_submissions
set slug = 'deck-' || substr(id::text, 1, 8)
where slug is null or slug = '';

create unique index if not exists deck_submissions_slug_unique
on public.deck_submissions (slug);

create index if not exists deck_submissions_published_at_idx
on public.deck_submissions (published_at desc);

notify pgrst, 'reload schema';
