import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { JsonLd, blogPostingLd } from "@/shared/seo/jsonld";
import { SITE_URL } from "@/shared/seo/site";
import { getPost } from "@/modules/blog/application/get-post";
import { Reveal } from "../../reveal";

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

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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

      <Link href="/noticias" className="noticias-read-more">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5M11 5l-7 7 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("backToList")}
      </Link>

      <Reveal>
        <header className="space-y-4">
          <div className="noticias-meta">
            <span>
              {format.dateTime(new Date(post.publishedAt), {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            {post.sourceUrl && (
              <>
                <span className="noticias-meta-sep">&middot;</span>
                <span>{sourceDomain(post.sourceUrl)}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-balance">
            {content.title}
          </h1>
        </header>
      </Reveal>

      {post.coverImageUrl && (
        <Reveal delay={0.05}>
          <div className="noticias-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImageUrl} alt={content.title} />
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div
          className="noticias-body"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </Reveal>

      {post.sourceUrl && (
        <div className="pt-6 border-t border-white/10">
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="noticias-source-chip glass"
          >
            <span className="noticias-source-label">{t("sourceLabel")}</span>
            <span className="noticias-source-domain">{sourceDomain(post.sourceUrl)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 17L17 7M17 7H9M17 7V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      )}
    </article>
  );
}
