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
