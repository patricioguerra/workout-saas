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
