# Blog / Noticias ATHX — Design

Date: 2026-07-24
Status: Approved
DEC: DEC-004

## Goal

Public blog for two purposes at once: SEO/content-marketing traffic, and real
news/updates about ATHX Games. Content is produced by a Claude Code skill that
searches for ATHX Games news and drafts bilingual posts — not hand-written per
post. This spec covers the read path (module + public pages) and the write
path (the generation skill). No admin UI for authoring/editing posts.

## Database — `blog_posts` table (Supabase)

```
id               uuid, pk, default gen_random_uuid()
slug             text, unique, not null
content          jsonb, not null   -- { es: PostContent, en: PostContent }
cover_image_url  text, nullable
source_url       text, nullable    -- link to the original news source
status           text, not null, default 'published'  -- 'published' | 'draft'
published_at     timestamptz, not null, default now()
created_at       timestamptz, not null, default now()
```

`PostContent` shape (same under `es` and `en`):
```ts
{ title: string, excerpt: string, body: string /* HTML */ }
```

`body` is HTML (not markdown) — same trust model as `workout_templates.content`
and the static copy in `que-es-athx` (rendered via `dangerouslySetInnerHTML`):
only the skill (via service-role key) or a trusted operator writes rows, never
end users, so no sanitization/markdown pipeline is needed.

`status` defaults to `published` per the "publish direct" decision, but the
column exists so a post can be manually flipped to `draft` later without a
schema change. No `updated_at`/versioning — posts are not edited via app UI.

Sanity check mirroring `generate-template-cycle`:
`Object.keys(content.es).sort()` must equal `Object.keys(content.en).sort()`.

## Module — `src/modules/blog/`

Read-only from the app side. The skill writes directly to Supabase via REST
(see below), bypassing this module entirely — same split as
`training/infra/template-repository.ts` (app reads) vs. `generate-template-cycle`
(skill writes via curl).

### `domain/post.ts`
```ts
type PostContent = { title: string; excerpt: string; body: string };
type BlogPost = {
  id: string;
  slug: string;
  content: { es: PostContent; en: PostContent };
  coverImageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string;
};
```
Pure types only — no validators needed (no user input on this context).

### `infra/post-repository.ts`
- `getPublishedPosts(page: number, pageSize = 10): Promise<{ posts: BlogPost[]; total: number }>`
  — `status = 'published'`, ordered by `published_at desc`, via
  `shared.supabase.server` (anon key is fine, RLS allows public read of
  published rows).
- `getPostBySlug(slug: string): Promise<BlogPost | null>` — `status = 'published'`
  filter included (a draft row is 404 to visitors regardless of slug guess).

### `application/list-posts.ts`
- `listPosts(page: number): Promise<{ posts: BlogPost[]; totalPages: number }>`
  — thin wrapper computing `totalPages` from `total`/`pageSize`.

### `application/get-post.ts`
- `getPost(slug: string): Promise<BlogPost | null>`.

## Routes

- `app/[locale]/noticias/page.tsx` — listing, `?page=` query param (default 1),
  10 posts/page, "anterior/siguiente" pager. Metadata: indexable, canonical +
  `alternates.languages`, same shape as `que-es-athx/page.tsx`. No JSON-LD on
  the listing page (YAGNI) — only the detail page gets `BlogPosting` JSON-LD.
- `app/[locale]/noticias/[slug]/page.tsx` — detail. Metadata: `openGraph.type:
  'article'`, `alternates.canonical`, uses `cover_image_url` as `og:image` when
  present. JSON-LD: `BlogPosting` (new builder in `shared/seo/jsonld.tsx`) with
  headline/image/datePublished/url. 404 (`notFound()`) when `getPost` returns
  null.
- Both pages render `content[locale]`, falling back to nothing else (both
  locales are always present per the sanity check above).
- Empty state on `/noticias` when there are zero posts yet ("aún no hay
  noticias" / "no news yet") — the skill may not have run yet.

### Routing config (`src/shared/i18n/config.ts`)
```ts
'/noticias': { es: '/noticias', en: '/news' },
'/noticias/[slug]': { es: '/noticias/[slug]', en: '/news/[slug]' },
```

### Navbar
Add a link next to "Mi programa" in `app/[locale]/navbar.tsx`:
`t("newsLink")` → "Noticias" (es) / "News" (en), `href="/noticias"`. New key
in the existing `nav` i18n namespace.

## i18n

New `noticias` namespace in `messages/es.json`/`messages/en.json` for static
UI chrome only (page title/description, "leer más", pager labels, empty
state) — never post content, which lives in the DB.

## Skill — `generate-blog-post`

New skill at `.claude/skills/generate-blog-post/SKILL.md`, `user_invocable:
true`, following the `generate-template-cycle` shape (reads env from
`.env.local`, upserts via `curl` against Supabase REST with the service-role
key).

**Designed to run unattended** (so it can later be wired to `/schedule`): no
step blocks on a user answer. An optional free-text argument may hint a topic;
if absent, the skill picks its own angle from what it finds.

### Steps

1. Read env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from
   `.env.local`.
2. Fetch existing posts' `slug` + `content->es->title` (curl REST, `select=
   slug,content`) to build a dedupe list.
3. Web-search for recent ATHX Games news (official announcements, event
   dates/results, competition updates — the "own competition" angle, per
   DEC-004). Multiple queries as needed.
4. Judge whether any result is genuinely new (not already covered by an
   existing post, not stale/rehashed). If nothing qualifies: stop and report
   "sin noticias nuevas" — **not an error**, a clean no-op (required for cron
   use).
5. If something qualifies: draft one bilingual post —
   - `slug`: kebab-case from the ES title, ascii-only.
   - `content.es` / `content.en`: `title`, `excerpt` (1-2 sentences), `body`
     (HTML — `<p>` paragraphs, no arbitrary tags beyond basic formatting).
   - `cover_image_url`: an image URL surfaced by the search result if one is
     available (e.g., an og:image from the source), otherwise `null` — never
     fabricate/generate one.
   - `source_url`: link to the original news source.
6. Upsert via `curl` (`Prefer: resolution=merge-duplicates`, conflict target
   `slug`), `status: 'published'`.
7. Report: created post title + slug + source, or the no-op message.

### Out of scope for this skill
- Editing/retiring existing posts.
- Choosing images beyond what's already attached to the source result (no
  image generation, no stock-photo search).
- Any interactive back-and-forth — must be a single unattended pass.

## Testing

- `domain/post.ts`: pure types, no tests needed.
- `application/list-posts.test.ts`, `application/get-post.test.ts`: mock
  `post-repository`, assert pagination math and not-found path.
- No e2e. No tests for the skill itself (same as `generate-template-cycle`,
  which has none — it's an operational script, not app code).

## Out of scope

- Admin authoring/editing UI for posts.
- Comments, likes, tags/categories.
- RSS feed.
- Automatic scheduling (cron) of the skill — this spec only ensures the skill
  *can* run headless later; wiring `/schedule` is a separate follow-up.

## Dependency graph delta (AGENTS.md)

```
app/[locale]/noticias/page.tsx          ─→ blog.application.list-posts
app/[locale]/noticias/[slug]/page.tsx   ─→ blog.application.get-post
app/[locale]/navbar.tsx                 UPDATED: + link to /noticias

src/modules/blog/
├─ domain/post.ts                  (BlogPost, PostContent types)
├─ infra/post-repository.ts        ─→ shared.supabase.server  (getPublishedPosts, getPostBySlug)
└─ application/
   ├─ list-posts.ts                ─→ blog.infra.post-repository
   └─ get-post.ts                  ─→ blog.infra.post-repository

src/shared/seo/jsonld.tsx          UPDATED: + blogPostingLd builder

.claude/skills/generate-blog-post/SKILL.md   (websearch ATHX news, dedupe, bilingual draft, curl upsert to blog_posts)
```
