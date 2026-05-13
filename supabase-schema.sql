create extension if not exists "pgcrypto";

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_url text,
  description text,
  published_year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  text text not null,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_books_updated_at on public.books;
create trigger set_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

alter table public.books enable row level security;
alter table public.quotes enable row level security;

drop policy if exists "Anyone can read books" on public.books;
create policy "Anyone can read books"
on public.books for select
using (true);

drop policy if exists "Anyone can read quotes" on public.quotes;
create policy "Anyone can read quotes"
on public.quotes for select
using (true);

drop policy if exists "Admin can insert books" on public.books;
create policy "Admin can insert books"
on public.books for insert
with check (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

drop policy if exists "Admin can update books" on public.books;
create policy "Admin can update books"
on public.books for update
using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true))
with check (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

drop policy if exists "Admin can delete books" on public.books;
create policy "Admin can delete books"
on public.books for delete
using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

drop policy if exists "Admin can insert quotes" on public.quotes;
create policy "Admin can insert quotes"
on public.quotes for insert
with check (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

drop policy if exists "Admin can update quotes" on public.quotes;
create policy "Admin can update quotes"
on public.quotes for update
using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true))
with check (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

drop policy if exists "Admin can delete quotes" on public.quotes;
create policy "Admin can delete quotes"
on public.quotes for delete
using (auth.jwt() ->> 'email' = current_setting('app.admin_email', true));

create index if not exists quotes_book_id_idx on public.quotes(book_id);
create index if not exists quotes_created_at_idx on public.quotes(created_at desc);

-- In Supabase SQL editor, replace the email below and run once:
-- alter database postgres set app.admin_email = 'you@example.com';
