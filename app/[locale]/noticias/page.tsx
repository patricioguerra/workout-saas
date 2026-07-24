import type { Metadata } from "next";
import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { SITE_URL } from "@/shared/seo/site";
import { listPosts } from "@/modules/blog/application/list-posts";
import { PAGE_SIZE } from "@/modules/blog/domain/pagination";
import { Reveal } from "../reveal";

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

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
  const format = await getFormatter({ locale });
  const requestedPage = resolvedSearchParams?.page
    ? parseInt(resolvedSearchParams.page, 10)
    : 1;
  const { posts, totalPages, page } = await listPosts(requestedPage);
  const loc = locale === "en" ? "en" : "es";

  return (
    <div>
      <header className="relative isolate px-6 pt-14 pb-10 overflow-hidden">
        <div className="noticias-header-bg">
          <div className="hero-grid" />
        </div>
        <div className="noticias-header-fade" />
        <Reveal>
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="hero-eyebrow">
              <span className="hero-dot" />
              {t("eyebrow")}
            </span>
            <h1 className="text-5xl font-bold leading-[0.95] tracking-tight text-balance">
              {t("title")}
            </h1>
          </div>
        </Reveal>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-20 space-y-10">
        {posts.length === 0 ? (
          <div className="noticias-empty glass rounded-2xl">
            <span className="noticias-empty-dot" />
            <p className="text-muted text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="noticias-feed space-y-8">
            {posts.map((post, i) => {
              const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
              const content = post.content[loc];
              return (
                <Reveal key={post.id} delay={Math.min(i, 4) * 0.05}>
                  <article className="noticias-entry">
                    <span className="noticias-entry-node" />
                    <div className="noticias-meta">
                      <span>N&deg;{String(globalIndex).padStart(2, "0")}</span>
                      <span className="noticias-meta-sep">&middot;</span>
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

                    <h2 className="text-xl font-semibold mt-2 leading-snug">
                      <Link
                        href={{ pathname: "/noticias/[slug]", params: { slug: post.slug } }}
                        className="noticias-title-link"
                      >
                        {content.title}
                      </Link>
                    </h2>

                    <p className="text-muted text-sm mt-2 leading-relaxed">
                      {content.excerpt}
                    </p>

                    <Link
                      href={{ pathname: "/noticias/[slug]", params: { slug: post.slug } }}
                      className="noticias-read-more mt-3"
                    >
                      {t("readMore")}
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M5 12h14M13 5l7 7-7 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-between pt-6 border-t border-white/10">
            {page <= 1 ? (
              <span className="noticias-pager-btn is-disabled">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("pagination.previous")}
              </span>
            ) : (
              <Link
                href={{ pathname: "/noticias", query: { page: String(page - 1) } }}
                className="noticias-pager-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("pagination.previous")}
              </Link>
            )}

            <span className="noticias-pager-index">
              {t("pagination.pageLabel", { page, totalPages })}
            </span>

            {page >= totalPages ? (
              <span className="noticias-pager-btn is-disabled">
                {t("pagination.next")}
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : (
              <Link
                href={{ pathname: "/noticias", query: { page: String(page + 1) } }}
                className="noticias-pager-btn"
              >
                {t("pagination.next")}
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
