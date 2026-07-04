import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApplicationForm } from "@/modules/ambassadors/ui/application-form";
import { SITE_URL } from "@/shared/seo/site";
import { Reveal } from "../reveal";

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

  const titleWords = t("title").split(" ");
  const titleAccent = titleWords.pop();
  const titleLead = titleWords.join(" ");

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="amb-hero-shell">
        <div className="amb-hero-bg" aria-hidden="true">
          <div className="amb-hero-image" />
          <div className="hero-grid" />
          <div className="amb-hero-shade" />
          <div className="hero-grain" />
          <div className="amb-hero-fade" />
        </div>

        <div className="amb-hero-content">
          <span className="amb-stamp" aria-hidden="true">
            <span className="amb-stamp-line1">ATHLEX</span>
            <span className="amb-stamp-line2">{t("hero.badge")}</span>
          </span>

          <span className="hero-eyebrow">
            <span className="hero-dot" />
            {t("eyebrow")}
          </span>

          <h1 className="amb-hero-title">
            {titleLead}{" "}
            <span className="hero-title-accent font-extrabold">
              {titleAccent}
            </span>
          </h1>

          <p className="amb-hero-sub">{t("intro")}</p>

          <a href="#aplicar" className="hero-cta-primary">
            {t("hero.cta")}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <p className="hero-cta-fineprint">{t("hero.fineprint")}</p>
        </div>
      </section>

      {/* About */}
      <section className="px-6 py-20">
        <Reveal className="max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
            {t("sections.about.title")}
          </h2>
          <p className="text-muted text-base sm:text-lg leading-relaxed">
            {t("sections.about.body")}
          </p>
        </Reveal>
      </section>

      {/* How it works — timeline */}
      <section className="px-6 py-20">
        <Reveal className="max-w-xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t("sections.howItWorks.title")}
          </h2>
        </Reveal>

        <ol className="amb-steps">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.08} y={24}>
              <li className="amb-step">
                <span className="amb-step-num">{`0${i + 1}`}</span>
                <span className="amb-step-body">{step}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Criteria — requirement cards */}
      <section className="px-6 py-20">
        <Reveal className="max-w-xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t("sections.criteria.title")}
          </h2>
        </Reveal>

        <div className="amb-criteria">
          {criteria.map((item, i) => (
            <Reveal key={i} delay={i * 0.07} y={20}>
              <div className="amb-criteria-card">
                <span className="amb-criteria-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <polyline points="5 12 10 17 19 8" />
                  </svg>
                </span>
                <span className="amb-criteria-text">{item}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Apply */}
      <section id="aplicar" className="px-6 py-20">
        <Reveal className="max-w-md mx-auto">
          <div className="glass rounded-2xl px-6 py-8 sm:px-8 sm:py-10 space-y-6">
            <div className="space-y-2 text-center">
              <span className="badge badge--green badge--pill">
                {t("hero.badge")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {t("form.title")}
              </h2>
            </div>
            <ApplicationForm />
          </div>
        </Reveal>
      </section>
    </div>
  );
}
