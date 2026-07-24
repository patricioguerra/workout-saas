# Blog / Noticias ATHX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public bilingual blog (`/noticias` es / `/news` en) backed by a new `blog_posts` Supabase table, plus a Claude Code skill (`generate-blog-post`) that searches for ATHX Games news and writes new posts unattended.

**Architecture:** New DDD bounded context `src/modules/blog/` (domain/infra/application only — no `ui/`, no admin authoring). App routes read through the application layer. A separate, code-independent skill writes rows directly to Supabase via `curl` with the service-role key, the same way `generate-template-cycle` populates `workout_templates`.

**Tech Stack:** Next.js 16 (App Router, this repo's patched conventions — see `node_modules/next/dist/docs/` for anything that looks off vs. stock Next), next-intl v4, Supabase (`@supabase/ssr` server client for reads, REST+service-role key for the skill's writes), `node --test` (via `tsx`) for unit tests.

## Global Constraints

- DEC-004 governs this work — see `DECISIONS.md` and `docs/superpowers/specs/2026-07-24-blog-design.md`.
- `blog_posts.content` is `{ es: PostContent, en: PostContent }`; both locales are **always** present — no partial-locale rows, no fallback logic needed in app code.
- `PostContent.body` is **HTML**, not markdown — rendered via `dangerouslySetInnerHTML`, same trust model as `workout_templates` and `que-es-athx`.
- `status` defaults to `'published'`; only `'published'` rows are ever readable by the app (enforced both in the repository query and by RLS).
- No admin authoring UI for posts in this plan — out of scope per spec.
- `PAGE_SIZE = 10` for the listing page.
- Routes: `/noticias` (es) / `/news` (en) and `/noticias/[slug]` (es) / `/news/[slug]` (en) — translated-slug pattern like `/que-es-athx` → `/what-is-athx`.
- Cross-context import rule: `app/` routes call `modules/blog/application/*` only, never `infra/` directly.
- Any Supabase schema change applied to the real project (not just the migration file) requires explicit user go-ahead first — this is a shared, hard-to-reverse action.
- Follow existing repo conventions exactly: no test files for thin Supabase repository/application wrappers (there are none anywhere in this codebase — confirmed by grep); only pure domain logic gets `node:test` unit tests.
- i18n: `messages/es.json` and `messages/en.json` must stay key-for-key identical — verify with `npm run check:i18n` after any messages edit.

---

## File Structure

- **Create** `supabase/migrations/011_blog_posts.sql` — table + RLS policy.
- **Create** `src/modules/blog/domain/post.ts` — `PostContent`, `BlogPost` types.
- **Create** `src/modules/blog/domain/pagination.ts` — pure `toSafePage`, `toOffset`, `toTotalPages`, `PAGE_SIZE`.
- **Create** `src/modules/blog/domain/pagination.test.ts` — unit tests for the above.
- **Create** `src/modules/blog/infra/post-repository.ts` — `getPublishedPosts(page)`, `getPostBySlug(slug)`.
- **Create** `src/modules/blog/application/list-posts.ts` — `listPosts(page)`.
- **Create** `src/modules/blog/application/get-post.ts` — `getPost(slug)`.
- **Modify** `src/shared/seo/jsonld.tsx` — add `blogPostingLd`.
- **Modify** `src/shared/i18n/config.ts` — add `/noticias` and `/noticias/[slug]` pathnames.
- **Modify** `messages/es.json`, `messages/en.json` — add `nav.newsLink` + `noticias` namespace.
- **Modify** `app/[locale]/navbar.tsx` — add the "Noticias"/"News" nav link.
- **Create** `app/[locale]/noticias/page.tsx` — listing page.
- **Create** `app/[locale]/noticias/[slug]/page.tsx` — detail page.
- **Create** `.claude/skills/generate-blog-post/SKILL.md` — the content-generation skill.
- **Modify** `AGENTS.md` — dependency graph delta.

---

### Task 1: `blog_posts` table + RLS

**Files:**
- Create: `supabase/migrations/011_blog_posts.sql`

**Interfaces:**
- Produces: table `public.blog_posts(id, slug, content, cover_image_url, source_url, status, published_at, created_at)`, unique on `slug`, RLS enabled with a public-read policy scoped to `status = 'published'`.

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Review the file for correctness**

Run: `cat supabase/migrations/011_blog_posts.sql`
Expected: matches the SQL above exactly; no other migration file already defines `blog_posts`.

- [ ] **Step 3: Ask the user before applying it to the real Supabase project**

This changes live infrastructure — do not run it unattended. Ask: *"Apply migration 011_blog_posts.sql to the linked Supabase project now?"* If yes, run:

```bash
npx supabase db push
```

If the user says no or this isn't the moment, leave the migration file committed but unapplied and move on — later tasks that read the table will simply return empty results until it's applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_blog_posts.sql
git commit -m "feat(blog): add blog_posts table"
```

---

### Task 2: Domain types + pagination helpers (TDD)

**Files:**
- Create: `src/modules/blog/domain/post.ts`
- Create: `src/modules/blog/domain/pagination.ts`
- Test: `src/modules/blog/domain/pagination.test.ts`

**Interfaces:**
- Produces:
  - `type PostContent = { title: string; excerpt: string; body: string }`
  - `type BlogPost = { id: string; slug: string; content: { es: PostContent; en: PostContent }; coverImageUrl: string | null; sourceUrl: string | null; publishedAt: string }`
  - `PAGE_SIZE: number` (10)
  - `toSafePage(page: number): number`
  - `toOffset(page: number, pageSize?: number): number`
  - `toTotalPages(total: number, pageSize?: number): number`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/blog/domain/pagination.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toSafePage, toOffset, toTotalPages, PAGE_SIZE } from './pagination'

test('toSafePage: valid page passes through', () => {
  assert.equal(toSafePage(3), 3)
})

test('toSafePage: zero clamps to 1', () => {
  assert.equal(toSafePage(0), 1)
})

test('toSafePage: negative clamps to 1', () => {
  assert.equal(toSafePage(-5), 1)
})

test('toSafePage: NaN clamps to 1', () => {
  assert.equal(toSafePage(NaN), 1)
})

test('toSafePage: fractional page floors', () => {
  assert.equal(toSafePage(2.9), 2)
})

test('toOffset: page 1 is offset 0', () => {
  assert.equal(toOffset(1), 0)
})

test('toOffset: page 3 with default page size', () => {
  assert.equal(toOffset(3), 2 * PAGE_SIZE)
})

test('toOffset: custom page size', () => {
  assert.equal(toOffset(2, 5), 5)
})

test('toTotalPages: zero total is still 1 page', () => {
  assert.equal(toTotalPages(0), 1)
})

test('toTotalPages: exact multiple', () => {
  assert.equal(toTotalPages(20, 10), 2)
})

test('toTotalPages: rounds up a partial page', () => {
  assert.equal(toTotalPages(21, 10), 3)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/modules/blog/domain/pagination.test.ts`
Expected: FAIL — `Cannot find module './pagination'` (or equivalent module-not-found error).

- [ ] **Step 3: Write the domain types**

```ts
// src/modules/blog/domain/post.ts
export type PostContent = {
  title: string
  excerpt: string
  body: string
}

export type BlogPost = {
  id: string
  slug: string
  content: { es: PostContent; en: PostContent }
  coverImageUrl: string | null
  sourceUrl: string | null
  publishedAt: string
}
```

- [ ] **Step 4: Write the minimal pagination implementation**

```ts
// src/modules/blog/domain/pagination.ts
export const PAGE_SIZE = 10

export function toSafePage(page: number): number {
  const parsed = Math.floor(page)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export function toOffset(page: number, pageSize: number = PAGE_SIZE): number {
  return (toSafePage(page) - 1) * pageSize
}

export function toTotalPages(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/modules/blog/domain/pagination.test.ts`
Expected: PASS — all 11 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/blog/domain/post.ts src/modules/blog/domain/pagination.ts src/modules/blog/domain/pagination.test.ts
git commit -m "feat(blog): add domain types and pagination helpers"
```

---

### Task 3: Repository + application use cases

**Files:**
- Create: `src/modules/blog/infra/post-repository.ts`
- Create: `src/modules/blog/application/list-posts.ts`
- Create: `src/modules/blog/application/get-post.ts`

**Interfaces:**
- Consumes: `BlogPost` (Task 2, `../domain/post`), `toOffset`, `toTotalPages`, `PAGE_SIZE` (Task 2, `../domain/pagination`), `createSupabaseServerClient` (`@/shared/infra/supabase/server`).
- Produces:
  - `getPublishedPosts(page: number): Promise<{ posts: BlogPost[]; total: number }>`
  - `getPostBySlug(slug: string): Promise<BlogPost | null>`
  - `listPosts(page: number): Promise<{ posts: BlogPost[]; totalPages: number; page: number }>`
  - `getPost(slug: string): Promise<BlogPost | null>`

- [ ] **Step 1: Write the repository**

```ts
// src/modules/blog/infra/post-repository.ts
import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { toOffset, PAGE_SIZE } from '../domain/pagination'
import type { BlogPost, PostContent } from '../domain/post'

type BlogPostRow = {
  id: string
  slug: string
  content: { es: PostContent; en: PostContent }
  cover_image_url: string | null
  source_url: string | null
  published_at: string
}

const SELECT_COLUMNS = 'id, slug, content, cover_image_url, source_url, published_at'

function toBlogPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    content: row.content,
    coverImageUrl: row.cover_image_url,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
  }
}

export async function getPublishedPosts(page: number): Promise<{ posts: BlogPost[]; total: number }> {
  const supabase = await createSupabaseServerClient()
  const offset = toOffset(page)
  const { data, count } = await supabase
    .from('blog_posts')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  return {
    posts: ((data as BlogPostRow[] | null) ?? []).map(toBlogPost),
    total: count ?? 0,
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('blog_posts')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return null
  return toBlogPost(data as BlogPostRow)
}
```

- [ ] **Step 2: Write the use cases**

```ts
// src/modules/blog/application/list-posts.ts
import { getPublishedPosts } from '../infra/post-repository'
import { toSafePage, toTotalPages } from '../domain/pagination'
import type { BlogPost } from '../domain/post'

export async function listPosts(
  page: number
): Promise<{ posts: BlogPost[]; totalPages: number; page: number }> {
  const safePage = toSafePage(page)
  const { posts, total } = await getPublishedPosts(safePage)
  return { posts, totalPages: toTotalPages(total), page: safePage }
}
```

```ts
// src/modules/blog/application/get-post.ts
import { getPostBySlug } from '../infra/post-repository'
import type { BlogPost } from '../domain/post'

export async function getPost(slug: string): Promise<BlogPost | null> {
  return getPostBySlug(slug)
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/modules/blog/*`. (No dedicated test file for this task — matches this codebase's existing convention of leaving thin Supabase repository/application wrappers untested, e.g. `training/infra/template-repository.ts` and `training/application/get-current-week-workout.ts` have no test files either. This will be exercised live in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/modules/blog/infra/post-repository.ts src/modules/blog/application/list-posts.ts src/modules/blog/application/get-post.ts
git commit -m "feat(blog): add post repository and list/get use cases"
```

---

### Task 4: `blogPostingLd` JSON-LD builder

**Files:**
- Modify: `src/shared/seo/jsonld.tsx`

**Interfaces:**
- Produces: `blogPostingLd(post: { title: string; excerpt: string; url: string; imageUrl?: string | null; publishedAt: string }, locale?: 'es' | 'en'): object`

- [ ] **Step 1: Add the builder**

Add to the end of `src/shared/seo/jsonld.tsx` (after `faqPageLd`):

```tsx
export function blogPostingLd(
  post: { title: string; excerpt: string; url: string; imageUrl?: string | null; publishedAt: string },
  locale?: 'es' | 'en'
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: post.url,
    datePublished: post.publishedAt,
    ...(post.imageUrl ? { image: post.imageUrl } : {}),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    inLanguage: locale ?? 'es',
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (No test file exists for `jsonld.tsx` today — consistent with the rest of this file's existing builders, none of which are unit-tested.)

- [ ] **Step 3: Commit**

```bash
git add src/shared/seo/jsonld.tsx
git commit -m "feat(seo): add blogPostingLd JSON-LD builder"
```

---

### Task 5: i18n — routing config + messages

**Files:**
- Modify: `src/shared/i18n/config.ts`
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: pathnames `/noticias` and `/noticias/[slug]`; message namespace `noticias.*`; `nav.newsLink`.

- [ ] **Step 1: Add the pathnames**

In `src/shared/i18n/config.ts`, add to the `pathnames` object (after the `/embajadores` entry):

```ts
  '/embajadores': {
    es: '/embajadores',
    en: '/ambassadors',
  },
  '/noticias': {
    es: '/noticias',
    en: '/news',
  },
  '/noticias/[slug]': {
    es: '/noticias/[slug]',
    en: '/news/[slug]',
  },
```

(Replace the existing `'/embajadores': { ... },` line with the block above — same content, just followed by the two new entries.)

- [ ] **Step 2: Add `nav.newsLink` to both message files**

In `messages/es.json`, inside the `"nav"` object:

```json
  "nav": {
    "brandAriaLabel": "ATHLEX training",
    "programLink": "Programación",
    "newsLink": "Noticias",
    "signInButton": "Entrar",
```

In `messages/en.json`, inside the `"nav"` object:

```json
  "nav": {
    "brandAriaLabel": "ATHLEX training",
    "programLink": "Programming",
    "newsLink": "News",
    "signInButton": "Sign in",
```

- [ ] **Step 3: Add the `noticias` namespace to both message files**

In `messages/es.json`, append as the new last top-level key (after `"ambassadors"`, changing its closing `  }` to `  },`):

```json
  },
  "noticias": {
    "pageTitle": "Noticias ATHX™: novedades de ATHX Games 2026",
    "pageDescription": "Últimas noticias, anuncios y novedades de ATHX Games 2026 y la comunidad ATHLEX.",
    "eyebrow": "Noticias",
    "title": "Noticias",
    "empty": "Todavía no hay noticias publicadas. Vuelve pronto.",
    "readMore": "Leer más",
    "backToList": "Volver a noticias",
    "sourceLabel": "Fuente",
    "pagination": {
      "previous": "Anterior",
      "next": "Siguiente",
      "pageLabel": "Página {page} de {totalPages}"
    }
  }
```

In `messages/en.json`, same position:

```json
  },
  "noticias": {
    "pageTitle": "ATHX News: ATHX Games 2026 updates",
    "pageDescription": "Latest news, announcements, and updates about ATHX Games 2026 and the ATHLEX community.",
    "eyebrow": "News",
    "title": "News",
    "empty": "No news posted yet. Check back soon.",
    "readMore": "Read more",
    "backToList": "Back to news",
    "sourceLabel": "Source",
    "pagination": {
      "previous": "Previous",
      "next": "Next",
      "pageLabel": "Page {page} of {totalPages}"
    }
  }
```

- [ ] **Step 4: Verify key parity**

Run: `npm run check:i18n`
Expected: `✓ messages/{es,en}.json keys match (N keys)` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/shared/i18n/config.ts messages/es.json messages/en.json
git commit -m "feat(blog): add /noticias routing config and i18n messages"
```

---

### Task 6: Navbar link

**Files:**
- Modify: `app/[locale]/navbar.tsx`

- [ ] **Step 1: Add the link**

In `app/[locale]/navbar.tsx`, add a second link next to the existing "Mi programa" link:

```tsx
        <Link
          href="/entrenamiento"
          className="text-sm text-muted hover:text-white transition-colors"
        >
          {t("programLink")}
        </Link>
        <Link
          href="/noticias"
          className="text-sm text-muted hover:text-white transition-colors"
        >
          {t("newsLink")}
        </Link>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/navbar.tsx
git commit -m "feat(blog): add Noticias/News link to navbar"
```

(Full visual verification of this link happens in Task 7's browser QA, once `/noticias` exists to navigate to.)

---

### Task 7: Public pages — listing + detail

**Files:**
- Create: `app/[locale]/noticias/page.tsx`
- Create: `app/[locale]/noticias/[slug]/page.tsx`

**Interfaces:**
- Consumes: `listPosts(page)` (Task 3), `getPost(slug)` (Task 3), `blogPostingLd` (Task 4), `SITE_URL` (`@/shared/seo/site`), `JsonLd` (`@/shared/seo/jsonld`), `Link` (`@/shared/i18n/routing`).

- [ ] **Step 1: Write the listing page**

```tsx
// app/[locale]/noticias/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { SITE_URL } from "@/shared/seo/site";
import { listPosts } from "@/modules/blog/application/list-posts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "noticias" });
  const isEn = locale === "en";
  const esPath = "/noticias";
  const enPath = "/en/news";
  const selfPath = isEn ? enPath : esPath;

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SITE_URL}${selfPath}`,
      languages: {
        es: `${SITE_URL}${esPath}`,
        en: `${SITE_URL}${enPath}`,
        "x-default": `${SITE_URL}${esPath}`,
      },
    },
  };
}

export default async function NoticiasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations({ locale, namespace: "noticias" });
  const requestedPage = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page, 10)
    : 1;
  const { posts, totalPages, page } = await listPosts(requestedPage);
  const loc = locale === "en" ? "en" : "es";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-widest text-accent">{t("eyebrow")}</p>
        <h1 className="text-4xl font-bold leading-tight">{t("title")}</h1>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">{t("empty")}</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="glass rounded-xl p-5 space-y-2">
              <h2 className="text-xl font-semibold">
                <Link href={{ pathname: "/noticias/[slug]", params: { slug: post.slug } }}>
                  {post.content[loc].title}
                </Link>
              </h2>
              <p className="text-muted text-sm">{post.content[loc].excerpt}</p>
              <Link
                href={{ pathname: "/noticias/[slug]", params: { slug: post.slug } }}
                className="text-sm text-accent"
              >
                {t("readMore")}
              </Link>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between pt-6 border-t border-white/10">
          <Link
            href={{ pathname: "/noticias", query: { page: String(Math.max(1, page - 1)) } }}
            aria-disabled={page <= 1}
            className={`text-sm ${page <= 1 ? "pointer-events-none text-muted/40" : "text-accent"}`}
          >
            {t("pagination.previous")}
          </Link>
          <span className="text-sm text-muted">
            {t("pagination.pageLabel", { page, totalPages })}
          </span>
          <Link
            href={{ pathname: "/noticias", query: { page: String(Math.min(totalPages, page + 1)) } }}
            aria-disabled={page >= totalPages}
            className={`text-sm ${page >= totalPages ? "pointer-events-none text-muted/40" : "text-accent"}`}
          >
            {t("pagination.next")}
          </Link>
        </nav>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the detail page**

```tsx
// app/[locale]/noticias/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { JsonLd, blogPostingLd } from "@/shared/seo/jsonld";
import { SITE_URL } from "@/shared/seo/site";
import { getPost } from "@/modules/blog/application/get-post";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const loc = locale === "en" ? "en" : "es";
  const content = post.content[loc];
  const isEn = locale === "en";
  const esPath = `/noticias/${post.slug}`;
  const enPath = `/en/news/${post.slug}`;
  const selfPath = isEn ? enPath : esPath;

  return {
    title: content.title,
    description: content.excerpt,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SITE_URL}${selfPath}`,
      languages: {
        es: `${SITE_URL}${esPath}`,
        en: `${SITE_URL}${enPath}`,
        "x-default": `${SITE_URL}${esPath}`,
      },
    },
    openGraph: {
      type: "article",
      title: content.title,
      description: content.excerpt,
      url: `${SITE_URL}${selfPath}`,
      locale: isEn ? "en_US" : "es_ES",
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function NoticiaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const loc = locale === "en" ? "en" : "es";
  const content = post.content[loc];
  const t = await getTranslations({ locale, namespace: "noticias" });
  const format = await getFormatter({ locale });
  const selfPath = locale === "en" ? `/en/news/${post.slug}` : `/noticias/${post.slug}`;

  return (
    <article className="mx-auto max-w-2xl px-6 py-16 space-y-8">
      <JsonLd
        data={blogPostingLd(
          {
            title: content.title,
            excerpt: content.excerpt,
            url: `${SITE_URL}${selfPath}`,
            imageUrl: post.coverImageUrl,
            publishedAt: post.publishedAt,
          },
          loc
        )}
      />

      <Link href="/noticias" className="text-sm text-accent">
        {t("backToList")}
      </Link>

      <header className="space-y-3">
        <h1 className="text-4xl font-bold leading-tight">{content.title}</h1>
        <p className="text-sm text-muted">
          {format.dateTime(new Date(post.publishedAt), {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt={content.title} className="w-full rounded-xl" />
      )}

      <div
        className="space-y-4 leading-relaxed [&_a]:text-accent [&_a]:underline [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: content.body }}
      />

      {post.sourceUrl && (
        <p className="text-sm text-muted border-t border-white/10 pt-6">
          {t("sourceLabel")}:{" "}
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent">
            {post.sourceUrl}
          </a>
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

If either the `href={{ pathname, params }}` or `notFound()`/`Metadata` usage doesn't type-check, check `node_modules/next/dist/docs/` and the next-intl types under `node_modules/next-intl/dist/types/navigation/` before changing the approach — this repo runs a patched Next.js with breaking changes vs. stock.

- [ ] **Step 4: Seed one temporary post for QA**

Requires migration from Task 1 to already be applied to the real project. Source env and insert a bilingual test row via `curl`:

```bash
set -a; source .env.local; set +a
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "slug": "post-de-prueba-qa",
    "content": {
      "es": {"title": "Post de prueba", "excerpt": "Prueba de QA para las páginas de noticias.", "body": "<p>Contenido de prueba para verificar el render.</p>"},
      "en": {"title": "Test post", "excerpt": "QA test for the news pages.", "body": "<p>Test content to verify rendering.</p>"}
    },
    "source_url": "https://example.com"
  }'
```

- [ ] **Step 5: Run the dev server and check both pages in the browser**

Run: `npm run dev`

Visit:
- `http://localhost:3000/noticias` — expect the test post card, title/excerpt in Spanish, "Leer más" link, no pagination controls (only 1 post).
- `http://localhost:3000/noticias/post-de-prueba-qa` — expect title, date, body paragraph, source link, "Volver a noticias" link.
- `http://localhost:3000/en/news` and `http://localhost:3000/en/news/post-de-prueba-qa` — same content in English.
- Confirm the navbar shows "Noticias" (es) / "News" (en) and clicking it lands on the listing page.
- Confirm `/noticias/no-existe` returns a 404 page.

- [ ] **Step 6: Remove the temporary QA post**

```bash
set -a; source .env.local; set +a
curl -s -X DELETE "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?slug=eq.post-de-prueba-qa" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/noticias"
git commit -m "feat(blog): add /noticias listing and detail pages"
```

---

### Task 8: `generate-blog-post` skill

**Files:**
- Create: `.claude/skills/generate-blog-post/SKILL.md`

- [ ] **Step 1: Write the skill file**

```markdown
---
name: generate-blog-post
description: Search for ATHX Games news and generate one bilingual blog post, upserting it to Supabase blog_posts. Cleanly no-ops when there's nothing new — safe to run manually or on a schedule.
user_invocable: true
---

# Generate Blog Post

Searches for real news about ATHX Games (the competition), drafts one bilingual
post if something genuinely new turns up, and upserts it to the `blog_posts`
table. Designed to run **unattended** — never ask the user a question mid-run;
if something is ambiguous, make the more conservative choice (when in doubt
about whether news is "new enough," skip and no-op rather than force a post).

An optional free-text argument may suggest a topic/angle to look for. If none
is given, decide the angle from whatever search results turn up.

## Steps

1. Read env vars from `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`.

2. Fetch existing posts to build a dedupe list:
   ```bash
   curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?select=slug,content,source_url&order=published_at.desc" \
     -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
   ```
   Note every existing `slug`, ES `title`, and `source_url`.

3. Web-search for recent ATHX Games news — official announcements, event
   dates, results, competition updates. Try several queries (e.g. "ATHX Games
   2026 noticias", "ATHX Games competition news", "ATHX Games results"). This
   is about the competition itself, not general CrossFit/fitness news.

4. Judge whether any result is genuinely new: not already covered by an
   existing post (compare `source_url` and topic against the dedupe list from
   step 2), not stale/rehashed, and substantive enough for a real post (a
   throwaway mention doesn't count). If nothing qualifies, **stop here** and
   report: "Sin noticias nuevas de ATHX Games — no se publicó nada." This is a
   successful run, not an error — required for unattended/scheduled use.

5. If something qualifies, draft one bilingual post:
   - `slug`: kebab-case, ASCII-only, derived from the ES title (e.g. "ATHX
     Games anuncia fechas 2026" → `athx-games-anuncia-fechas-2026`).
   - `content.es` / `content.en`: each `{ title, excerpt, body }`.
     - `title`: concise headline.
     - `excerpt`: 1-2 plain-text sentences (no HTML) — used for
       `<meta description>` and the listing card.
     - `body`: HTML, `<p>` paragraphs only (plus `<strong>`/`<a>` where
       natural) — no markdown, no arbitrary tags, no scripts/styles.
   - Both locales must have identical structure — same facts, translated
     prose. Sanity check before upserting:
     `Object.keys(content.es).sort()` equals `Object.keys(content.en).sort()`.
   - `cover_image_url`: only if the search result itself surfaced a usable
     image URL (e.g. an og:image from the source article). Never fabricate,
     generate, or stock-photo-search one — leave it `null` if none was found.
   - `source_url`: the original news source's URL. Required — never publish
     without attribution.

6. Upsert via `curl`:
   ```bash
   curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts" \
     -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Content-Type: application/json" \
     -H "Prefer: resolution=merge-duplicates,return=representation" \
     -d @- <<'EOF'
   {
     "slug": "<slug>",
     "content": { "es": { ... }, "en": { ... } },
     "cover_image_url": null,
     "source_url": "<source>",
     "status": "published"
   }
   EOF
   ```
   The unique constraint is `slug`.

7. Report the result: either "Publicado: <title> (<slug>), fuente: <source_url>"
   or the no-news message from step 4. Never claim success without having
   actually confirmed the upsert response (HTTP 2xx / returned row).

## Out of scope

- Editing or retiring existing posts.
- Any image generation or stock-photo search.
- Any interactive back-and-forth with the user — this must complete in a
  single unattended pass so it can later be wired to `/schedule`.
```

- [ ] **Step 2: Review the file**

Run: `cat .claude/skills/generate-blog-post/SKILL.md`
Expected: matches the content above; front matter has `name`, `description`, `user_invocable: true`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/generate-blog-post/SKILL.md
git commit -m "feat(blog): add generate-blog-post skill"
```

(Optionally, once this is merged, the user may want to actually invoke the skill for the first time to publish a real post — that's a live web-search + production-DB write, so treat it as a separate, explicitly-requested action, not something to run automatically as part of "finishing" this plan.)

---

### Task 9: AGENTS.md dependency graph + final verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add the `/noticias` routes to the `app/` tree**

In `AGENTS.md`, find:

```
├─ entrenamiento/subscribe-button.tsx ─→ POST /api/stripe/checkout
├─ perfil/page.tsx               ─→ identity.{get-current-user, sign-out} + billing.get-active-subscription
```

Replace with:

```
├─ entrenamiento/subscribe-button.tsx ─→ POST /api/stripe/checkout
├─ noticias/
│  ├─ page.tsx                   ─→ blog.application.list-posts
│  └─ [slug]/page.tsx            ─→ blog.application.get-post
├─ perfil/page.tsx               ─→ identity.{get-current-user, sign-out} + billing.get-active-subscription
```

- [ ] **Step 2: Mark the navbar as updated**

Find:

```
├─ navbar.tsx                    ─→ shared.supabase.server + components.{nav-menu, admin-bell}
```

Replace with:

```
├─ navbar.tsx                    UPDATED: ─→ shared.supabase.server + components.{nav-menu, admin-bell} (+ link to /noticias)
```

- [ ] **Step 3: Add the `blog` module block**

Find:

```
└─ ambassadors/
   ├─ domain/validators.ts       (validateName, validateEmail, validateMessage — pure)
   ├─ infra/email-client.ts      ─→ resend (sendApplicationToAdmin)
   ├─ application/apply.ts       ─→ ambassadors.{domain.validators, infra.email-client}
   └─ ui/application-form.tsx    ─→ ambassadors.application.apply
```

Replace with:

```
├─ ambassadors/
│  ├─ domain/validators.ts       (validateName, validateEmail, validateMessage — pure)
│  ├─ infra/email-client.ts      ─→ resend (sendApplicationToAdmin)
│  ├─ application/apply.ts       ─→ ambassadors.{domain.validators, infra.email-client}
│  └─ ui/application-form.tsx    ─→ ambassadors.application.apply
│
└─ blog/
   ├─ domain/
   │  ├─ post.ts                 (PostContent, BlogPost)
   │  └─ pagination.ts           (PAGE_SIZE, toSafePage, toOffset, toTotalPages — pure)
   ├─ infra/post-repository.ts   ─→ shared.supabase.server (getPublishedPosts, getPostBySlug)
   └─ application/
      ├─ list-posts.ts           ─→ blog.{infra.post-repository, domain.pagination}
      └─ get-post.ts             ─→ blog.infra.post-repository
```

- [ ] **Step 4: Mark `jsonld.tsx` as updated**

Find:

```
│  └─ jsonld.tsx                 (JsonLd component + organization/webSite/softwareApplication/faqPage builders)
```

Replace with:

```
│  └─ jsonld.tsx                 UPDATED: (JsonLd component + organization/webSite/softwareApplication/faqPage/blogPosting builders)
```

- [ ] **Step 5: Add `blog_posts` to the DB tables line**

Find:

```
DB tables: `profiles` (incl. `is_admin`), `subscriptions`, `workout_templates` (unique on category+week_number, 12 rows = 6 weeks × 2 categories), `support_threads` (incl. `last_read_by_user`, `last_read_by_admin`), `support_messages`.
```

Replace with:

```
DB tables: `profiles` (incl. `is_admin`), `subscriptions`, `workout_templates` (unique on category+week_number, 12 rows = 6 weeks × 2 categories), `support_threads` (incl. `last_read_by_user`, `last_read_by_admin`), `support_messages`, `blog_posts` (unique on `slug`, `status` published/draft, RLS public-read on published only).
```

- [ ] **Step 6: Full verification suite**

Run, in order:

```bash
npm run check:i18n
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: every command exits 0. `npm test` should show all `pagination.test.ts` cases plus the pre-existing domain tests passing (no regressions).

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md dependency graph for blog module"
```

- [ ] **Step 8: Close out DEC-004**

Once this branch is ready to merge to `main`, use the `/dec-close` skill to mark DEC-004 as `Done` and record the merge commit — mirroring how DEC-003 was closed.
