-- 011_blog_posts.sql
-- Public blog for SEO/content marketing + ATHX Games news (DEC-004).
-- Populated by the generate-blog-post skill, which writes via the
-- service-role key and therefore bypasses RLS. No app-level writer exists.

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content jsonb not null,
  cover_image_url text,
  source_url text,
  status text not null default 'published' check (status in ('published', 'draft')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on column public.blog_posts.content is
  'JSONB shape: { es: { title, excerpt, body }, en: { title, excerpt, body } }. body is HTML. Both locales always present.';

alter table public.blog_posts enable row level security;

create policy "Anyone can read published posts"
  on blog_posts for select using (status = 'published');
