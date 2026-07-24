import { SITE_NAME, SITE_URL } from "./site";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationLd(locale?: 'es' | 'en') {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    email: "soporte@athlextraining.com",
    sameAs: [] as string[],
    inLanguage: locale ?? 'es',
  };
}

export function webSiteLd(locale?: 'es' | 'en') {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: locale ?? 'es',
  };
}

export function softwareApplicationLd(locale?: 'es' | 'en') {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} — Programación ATHX`,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "Programación y entrenamiento ATHX con plan semanal, seguimiento y chat directo.",
    offers: {
      "@type": "Offer",
      price: "9.80",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/login`,
    },
    inLanguage: locale ?? 'es',
  };
}

export function faqPageLd(items: { question: string; answer: string }[], locale?: 'es' | 'en') {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
    inLanguage: locale ?? 'es',
  };
}

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
