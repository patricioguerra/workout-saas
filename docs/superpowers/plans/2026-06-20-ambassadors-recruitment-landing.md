# Ambassadors Recruitment Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, indexable `/embajadores` (es) / `/ambassadors` (en) page that explains the ambassador program and ends in an application form that emails the admin — no auth, no DB write, no payments.

**Architecture:** New minimal DDD bounded context `src/modules/ambassadors/` (domain validators → infra email sender → application use case → UI form), wired into a new `app/[locale]/embajadores/page.tsx` route that follows the existing `que-es-athx` article-page pattern (no new visual style, no hero background asset).

**Tech Stack:** Next.js (App Router, `app/[locale]`), next-intl (i18n), Resend (email), Node's built-in `node:test` + `tsx` (testing — no mocking library exists in this repo; tests rely on `RESEND_API_KEY`/`ADMIN_EMAIL` being unset in the test process, same as Next env vars are never loaded by `node --test`).

## Global Constraints

- DDD layering: `domain` is pure TS (no I/O), `infra` is data/email access only, `application` is one exported function per file (`'use server'` for the action), `app/` route only parses input and calls the use case. (AGENTS.md)
- Path aliases: `@/modules/*`, `@/shared/*`. Never `@/lib/*`. (AGENTS.md)
- Cross-context imports only via another context's `application/` or `domain/`, never its `infra/`. (AGENTS.md)
- No payments, no separate auth, no separate Supabase/Stripe — those are DEC-002, out of scope here. (spec)
- Route: `/embajadores` (es) / `/ambassadors` (en), indexable, canonical + `alternates.languages` (es/en/x-default). (spec)
- Not linked from nav/footer/home yet. (spec)
- `messages/es.json` and `messages/en.json` must have identical key sets — verified by `npm run check:i18n`. (codebase)
- Update the dependency graph in `AGENTS.md` in the same commit as the feature. (AGENTS.md / DEC-003 tasks)
- Commit messages: Conventional Commits, subject only, no AI co-author trailer. (AGENTS.md)

---

### Task 1: Domain validators

**Files:**
- Create: `src/modules/ambassadors/domain/validators.ts`
- Test: `src/modules/ambassadors/domain/validators.test.ts`

**Interfaces:**
- Produces: `validateName(name: string): string | null`, `validateEmail(email: string): string | null`, `validateMessage(message: string): string | null` — all pure, all take the raw (already-trimmed-by-caller) string and return an error string or `null`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/ambassadors/domain/validators.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateName, validateEmail, validateMessage } from './validators'

test('validateName: empty fails', () => {
  assert.match(validateName('') ?? '', /nombre/)
})

test('validateName: single char fails', () => {
  assert.match(validateName('A') ?? '', /nombre/)
})

test('validateName: valid passes', () => {
  assert.equal(validateName('Ana Pérez'), null)
})

test('validateEmail: missing @ fails', () => {
  assert.match(validateEmail('not-an-email') ?? '', /email/)
})

test('validateEmail: missing domain fails', () => {
  assert.match(validateEmail('ana@') ?? '', /email/)
})

test('validateEmail: valid passes', () => {
  assert.equal(validateEmail('ana@example.com'), null)
})

test('validateMessage: empty fails', () => {
  assert.match(validateMessage('') ?? '', /mensaje/)
})

test('validateMessage: too long fails', () => {
  assert.match(validateMessage('a'.repeat(2001)) ?? '', /mensaje/)
})

test('validateMessage: valid passes', () => {
  assert.equal(validateMessage('Quiero ser ambajador, entreno hace 5 años.'), null)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/modules/ambassadors/domain/validators.test.ts`
Expected: FAIL with `Cannot find module './validators'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/ambassadors/domain/validators.ts
export const NAME_MIN = 2
export const NAME_MAX = 80
export const MESSAGE_MIN = 1
export const MESSAGE_MAX = 2000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(name: string): string | null {
  const n = name.trim()
  if (n.length < NAME_MIN) return `Nombre demasiado corto (min ${NAME_MIN}).`
  if (n.length > NAME_MAX) return `Nombre demasiado largo (max ${NAME_MAX}).`
  return null
}

export function validateEmail(email: string): string | null {
  const e = email.trim()
  if (!EMAIL_RE.test(e)) return 'Email no válido.'
  return null
}

export function validateMessage(message: string): string | null {
  const m = message.trim()
  if (m.length < MESSAGE_MIN) return 'Mensaje vacío.'
  if (m.length > MESSAGE_MAX) return `Mensaje demasiado largo (max ${MESSAGE_MAX}).`
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/modules/ambassadors/domain/validators.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ambassadors/domain/validators.ts src/modules/ambassadors/domain/validators.test.ts
git commit -m "feat(ambassadors): add domain validators for application form"
```

---

### Task 2: Email client (infra)

**Files:**
- Create: `src/modules/ambassadors/infra/email-client.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `sendApplicationToAdmin(input: { name: string; email: string; socialLink?: string; message: string }): Promise<{ skipped: boolean }>`.

- [ ] **Step 1: Write the implementation**

No test for this file — it only wraps the Resend SDK call, mirrored 1:1 from `src/modules/support/infra/email-client.ts`'s `sendNewMessageToAdmin`. It is exercised indirectly by Task 3's tests (which run with `RESEND_API_KEY` unset, so the guard below short-circuits and no network call happens).

```ts
// src/modules/ambassadors/infra/email-client.ts
import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY
const resend = key ? new Resend(key) : null

const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const ADMIN = process.env.ADMIN_EMAIL || ''

interface ApplicationInput {
  name: string
  email: string
  socialLink?: string
  message: string
}

export async function sendApplicationToAdmin(input: ApplicationInput) {
  if (!resend || !ADMIN) return { skipped: true }
  const lines = [
    `Nombre: ${input.name}`,
    `Email: ${input.email}`,
    input.socialLink ? `Red social: ${input.socialLink}` : null,
    '',
    input.message,
  ].filter((l) => l !== null)
  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    replyTo: input.email,
    subject: `Nueva solicitud de embajador: ${input.name}`,
    text: lines.join('\n'),
  })
  return { skipped: false }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ambassadors/infra/email-client.ts
git commit -m "feat(ambassadors): add email client for ambassador applications"
```

---

### Task 3: Application use case

**Files:**
- Create: `src/modules/ambassadors/application/apply.ts`
- Test: `src/modules/ambassadors/application/apply.test.ts`

**Interfaces:**
- Consumes: `validateName`, `validateEmail`, `validateMessage` from Task 1 (`../domain/validators`); `sendApplicationToAdmin` from Task 2 (`../infra/email-client`).
- Produces: `applyAsAmbassador(input: { name: string; email: string; socialLink?: string; message: string }): Promise<{ error?: string }>`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/ambassadors/application/apply.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAsAmbassador } from './apply'

test('rejects empty name', async () => {
  const res = await applyAsAmbassador({ name: '', email: 'ana@example.com', message: 'Hola, quiero aplicar.' })
  assert.match(res.error ?? '', /nombre/i)
})

test('rejects invalid email', async () => {
  const res = await applyAsAmbassador({ name: 'Ana Pérez', email: 'not-an-email', message: 'Hola, quiero aplicar.' })
  assert.match(res.error ?? '', /email/i)
})

test('rejects empty message', async () => {
  const res = await applyAsAmbassador({ name: 'Ana Pérez', email: 'ana@example.com', message: '' })
  assert.match(res.error ?? '', /mensaje/i)
})

test('accepts valid input with no socialLink (email send is skipped without RESEND_API_KEY in test env)', async () => {
  const res = await applyAsAmbassador({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    message: 'Entreno hace 5 años, tengo 10k seguidores en Instagram.',
  })
  assert.equal(res.error, undefined)
})

test('accepts valid input with socialLink', async () => {
  const res = await applyAsAmbassador({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    socialLink: 'https://instagram.com/anaperez',
    message: 'Entreno hace 5 años.',
  })
  assert.equal(res.error, undefined)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/modules/ambassadors/application/apply.test.ts`
Expected: FAIL with `Cannot find module './apply'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/ambassadors/application/apply.ts
'use server'

import { validateName, validateEmail, validateMessage } from '../domain/validators'
import { sendApplicationToAdmin } from '../infra/email-client'

export async function applyAsAmbassador(input: {
  name: string
  email: string
  socialLink?: string
  message: string
}): Promise<{ error?: string }> {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()
  const socialLink = input.socialLink?.trim() || undefined

  const nameErr = validateName(name)
  if (nameErr) return { error: nameErr }

  const emailErr = validateEmail(email)
  if (emailErr) return { error: emailErr }

  const messageErr = validateMessage(message)
  if (messageErr) return { error: messageErr }

  try {
    await sendApplicationToAdmin({ name, email, socialLink, message })
  } catch (e) {
    console.error('Resend error (ambassador application):', e)
  }

  return {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/modules/ambassadors/application/apply.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ambassadors/application/apply.ts src/modules/ambassadors/application/apply.test.ts
git commit -m "feat(ambassadors): add applyAsAmbassador use case"
```

---

### Task 4: i18n messages

**Files:**
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: a new top-level `ambassadors` namespace, consumed by Task 5 (page) and Task 6 (form) via `useTranslations('ambassadors')` / `getTranslations({ locale, namespace: 'ambassadors' })`.

- [ ] **Step 1: Add the `ambassadors` namespace to `messages/es.json`**

Insert as a new top-level key (alongside `queEsAthx`, `support`, etc — exact placement in the object doesn't matter, JSON key order is not checked):

```json
"ambassadors": {
  "pageTitle": "Sé embajador ATHLEX Training",
  "pageDescription": "Únete al programa de embajadores de ATHLEX Training. Promueve la programación ATHX y forma parte del equipo.",
  "ogTitle": "Programa de embajadores ATHLEX Training",
  "ogDescription": "Cómo funciona el programa de embajadores y cómo aplicar.",
  "eyebrow": "Programa de embajadores",
  "title": "Entrena, comparte, crece con ATHLEX",
  "intro": "Buscamos atletas que ya viven la programación ATHX y quieren representarla. Si entrenas en serio y tienes una comunidad que te escucha, esto es para ti.",
  "sections": {
    "about": {
      "title": "Quiénes somos",
      "body": "ATHLEX Training es la programación ATHX oficial: planes semanales, seguimiento de cargas y chat directo con coach. Los embajadores son la cara visible del programa frente a su comunidad."
    },
    "howItWorks": {
      "title": "Cómo funciona",
      "steps": [
        "Aplica con tus datos y tus redes.",
        "Revisamos tu perfil y entrenamiento actual.",
        "Te incorporamos al programa con acceso y materiales.",
        "Promocionas ATHLEX Training a tu manera, con nuestro apoyo."
      ]
    },
    "criteria": {
      "title": "Qué buscamos",
      "items": [
        "Entrenamiento activo y constante (cualquier disciplina de fuerza/fitness).",
        "Comunidad propia en redes sociales, del tamaño que sea.",
        "Ganas de compartir tu proceso de forma honesta."
      ]
    }
  },
  "form": {
    "title": "Aplica ahora",
    "nameLabel": "Nombre",
    "namePlaceholder": "Tu nombre completo",
    "emailLabel": "Email",
    "emailPlaceholder": "tu@email.com",
    "socialLinkLabel": "Red social (opcional)",
    "socialLinkPlaceholder": "https://instagram.com/tu_usuario",
    "messageLabel": "Cuéntanos sobre ti",
    "messagePlaceholder": "Tu disciplina, tu comunidad, por qué quieres ser embajador...",
    "submit": "Enviar solicitud",
    "submitSending": "Enviando…",
    "successTitle": "¡Solicitud enviada!",
    "successBody": "Gracias por aplicar. Revisaremos tu solicitud y te contactaremos por email."
  }
}
```

- [ ] **Step 2: Add the matching `ambassadors` namespace to `messages/en.json`**

```json
"ambassadors": {
  "pageTitle": "Become an ATHLEX Training ambassador",
  "pageDescription": "Join the ATHLEX Training ambassador program. Promote ATHX programming and become part of the team.",
  "ogTitle": "ATHLEX Training ambassador program",
  "ogDescription": "How the ambassador program works and how to apply.",
  "eyebrow": "Ambassador program",
  "title": "Train, share, grow with ATHLEX",
  "intro": "We're looking for athletes who already live the ATHX programming and want to represent it. If you train seriously and have a community that listens to you, this is for you.",
  "sections": {
    "about": {
      "title": "Who we are",
      "body": "ATHLEX Training is the official ATHX programming: weekly plans, load tracking, and direct chat with your coach. Ambassadors are the visible face of the program to their community."
    },
    "howItWorks": {
      "title": "How it works",
      "steps": [
        "Apply with your details and your socials.",
        "We review your profile and current training.",
        "We onboard you into the program with access and materials.",
        "You promote ATHLEX Training your way, with our support."
      ]
    },
    "criteria": {
      "title": "What we look for",
      "items": [
        "Active, consistent training (any strength/fitness discipline).",
        "Your own community on social media, any size.",
        "Willingness to share your process honestly."
      ]
    }
  },
  "form": {
    "title": "Apply now",
    "nameLabel": "Name",
    "namePlaceholder": "Your full name",
    "emailLabel": "Email",
    "emailPlaceholder": "you@email.com",
    "socialLinkLabel": "Social profile (optional)",
    "socialLinkPlaceholder": "https://instagram.com/your_handle",
    "messageLabel": "Tell us about yourself",
    "messagePlaceholder": "Your discipline, your community, why you want to be an ambassador...",
    "submit": "Send application",
    "submitSending": "Sending…",
    "successTitle": "Application sent!",
    "successBody": "Thanks for applying. We'll review your application and reach out by email."
  }
}
```

- [ ] **Step 3: Verify key parity**

Run: `npm run check:i18n`
Expected: `✓ messages/{es,en}.json keys match (<N> keys)`

- [ ] **Step 4: Commit**

```bash
git add messages/es.json messages/en.json
git commit -m "feat(ambassadors): add ambassadors i18n namespace"
```

---

### Task 5: Application form UI component

**Files:**
- Create: `src/modules/ambassadors/ui/application-form.tsx`

**Interfaces:**
- Consumes: `applyAsAmbassador` from Task 3 (`@/modules/ambassadors/application/apply`); translation keys `ambassadors.form.*` from Task 4.
- Produces: `<ApplicationForm />` (no props), consumed by Task 6 (page).

- [ ] **Step 1: Write the implementation**

```tsx
// src/modules/ambassadors/ui/application-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { applyAsAmbassador } from '../application/apply'

export function ApplicationForm() {
  const t = useTranslations('ambassadors.form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [socialLink, setSocialLink] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await applyAsAmbassador({ name, email, socialLink, message })
      if (res.error) {
        setError(res.error)
        return
      }
      setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="glass rounded-xl px-6 py-8 text-center space-y-2">
        <p className="text-lg font-semibold">{t('successTitle')}</p>
        <p className="text-muted text-sm">{t('successBody')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="name">
          {t('nameLabel')}
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="email">
          {t('emailLabel')}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="socialLink">
          {t('socialLinkLabel')}
        </label>
        <input
          id="socialLink"
          type="url"
          value={socialLink}
          onChange={(e) => setSocialLink(e.target.value)}
          placeholder={t('socialLinkPlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-muted" htmlFor="message">
          {t('messageLabel')}
        </label>
        <textarea
          id="message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('messagePlaceholder')}
          className="input-glass w-full px-4 py-3 rounded-xl text-sm resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim() || !email.trim() || !message.trim()}
        className="w-full py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50"
      >
        {pending ? t('submitSending') : t('submit')}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ambassadors/ui/application-form.tsx
git commit -m "feat(ambassadors): add ApplicationForm component"
```

---

### Task 6: Page route, pathnames, sitemap

**Files:**
- Create: `app/[locale]/embajadores/page.tsx`
- Modify: `src/shared/i18n/config.ts`
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: `<ApplicationForm />` from Task 5 (`@/modules/ambassadors/ui/application-form`); `ambassadors.*` translations from Task 4.
- Produces: the `/embajadores` (es) / `/ambassadors` (en) route.

- [ ] **Step 1: Add the pathname mapping**

In `src/shared/i18n/config.ts`, add to the `pathnames` object (after `'/admin/entrenos/[category]/[week]'`):

```ts
  '/embajadores': {
    es: '/embajadores',
    en: '/ambassadors',
  },
```

- [ ] **Step 2: Write the page**

```tsx
// app/[locale]/embajadores/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApplicationForm } from "@/modules/ambassadors/ui/application-form";
import { SITE_URL } from "@/shared/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ambassadors" });
  const isEn = locale === "en";
  const esPath = "/embajadores";
  const enPath = "/en/ambassadors";
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
    openGraph: {
      type: "article",
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE_URL}${selfPath}`,
      locale: isEn ? "en_US" : "es_ES",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ambassadors" });

  const steps = t.raw("sections.howItWorks.steps") as string[];
  const criteria = t.raw("sections.criteria.items") as string[];

  return (
    <article className="mx-auto max-w-2xl px-6 py-16 space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-widest text-accent">{t("eyebrow")}</p>
        <h1 className="text-4xl font-bold leading-tight">{t("title")}</h1>
        <p className="text-muted text-lg">{t("intro")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("sections.about.title")}</h2>
        <p>{t("sections.about.body")}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("sections.howItWorks.title")}</h2>
        <ol className="space-y-3 list-decimal list-inside">
          {steps.map((step, i) => (
            <li key={i} className="text-base leading-snug">
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t("sections.criteria.title")}</h2>
        <ul className="space-y-3">
          {criteria.map((item, i) => (
            <li key={i} className="flex items-start gap-3 border-l-2 border-accent/40 pl-4">
              <span className="text-base leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-10">
        <h2 className="text-2xl font-semibold">{t("form.title")}</h2>
        <ApplicationForm />
      </section>
    </article>
  );
}
```

- [ ] **Step 3: Register the route in the sitemap**

In `app/sitemap.ts`, add to the `PUBLIC_ROUTES` array (after the `/que-es-athx` entry):

```ts
  { esPath: "/embajadores", enPath: "/en/ambassadors", priority: 0.5, changeFrequency: "monthly" },
```

- [ ] **Step 4: Run the dev server and check both locales manually**

Run: `npm run dev`
Visit `http://localhost:3000/embajadores` — expect the page to render with hero, about, how-it-works, criteria, and the application form.
Visit `http://localhost:3000/en/ambassadors` — expect the same page in English.
Submit the form with an empty name — expect an inline error, no page reload.
Submit the form with valid data — expect the success message to replace the form.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/embajadores/page.tsx src/shared/i18n/config.ts app/sitemap.ts
git commit -m "feat(ambassadors): add /embajadores recruitment landing page"
```

---

### Task 7: Update dependency graph and run full verification

**Files:**
- Modify: `AGENTS.md`

**Interfaces:** none (documentation + verification only).

- [ ] **Step 1: Update the dependency graph in `AGENTS.md`**

Under the `app/` tree, add a new entry (alphabetically near `app/admin/entrenos/`, or simply appended — exact position doesn't matter, the graph isn't parsed by tooling):

```
├─ embajadores/page.tsx          ─→ ambassadors.{application.apply, ui.application-form}
```

Under `src/modules/`, add a new top-level block (after `support/`):

```
├─ ambassadors/
│  ├─ domain/validators.ts       (validateName, validateEmail, validateMessage — pure)
│  ├─ infra/email-client.ts      ─→ resend (sendApplicationToAdmin)
│  ├─ application/apply.ts       ─→ ambassadors.{domain.validators, infra.email-client}
│  └─ ui/application-form.tsx    ─→ ambassadors.application.apply
```

- [ ] **Step 2: Run the full verification suite**

```bash
npm run lint
npm test
npm run check:i18n
npm run build
```

Expected: all four pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update dependency graph for ambassadors module"
```
