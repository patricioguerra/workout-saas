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
