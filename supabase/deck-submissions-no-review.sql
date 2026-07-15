-- 把新投稿默认状态改成 approved
alter table public.deck_submissions
alter column status set default 'approved';

-- 让目前仍在等待审核的投稿直接公开
update public.deck_submissions
set
  status = 'approved',
  reviewed_at = coalesce(reviewed_at, now())
where status = 'pending';
