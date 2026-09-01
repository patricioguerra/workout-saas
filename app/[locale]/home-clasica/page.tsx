import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { Reveal } from "../reveal";
import { JsonLd, softwareApplicationLd, faqPageLd } from "@/shared/seo/jsonld";
import { SITE_URL } from "@/shared/seo/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const esPath = "/home-clasica";
  const enPath = "/en/classic-home";
  const selfPath = isEn ? enPath : esPath;
  return {
    alternates: {
      canonical: `${SITE_URL}${selfPath}`,
      languages: {
        es: `${SITE_URL}${esPath}`,
        en: `${SITE_URL}${enPath}`,
        "x-default": `${SITE_URL}${esPath}`,
      },
    },
    // Archived version — kept for reference, not for indexing.
    robots: { index: false, follow: true },
  };
}

export default async function HomeClasica({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("homeClasica");
  // Build FAQ items from translations
  const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;
  const faqItems = faqKeys.map((k) => ({
    question: t(`faq.items.${k}.question`),
    answer: t(`faq.items.${k}.answer`),
  }));

  return (
    <div className="flex flex-col">
      <link
        rel="preload"
        as="image"
        href="/backgroundhero.webp"
        fetchPriority="high"
      />
      <JsonLd data={softwareApplicationLd(locale as "es" | "en")} />
      <JsonLd data={faqPageLd(faqItems, locale as "es" | "en")} />
      {/* Hero */}
      <section className="hero-shell">
        <p className="sr-only">{t("hero.srOnlyDesc")}</p>
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-image" />
          <div className="hero-vignette" />
          <div className="hero-grid" />
          <div className="hero-grain" />
          <div className="hero-fade" />
        </div>

        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="hero-dot" />
            {t("hero.eyebrow")}
          </span>

          <div className="hero-title">
            {t("hero.title")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i < 2 && <br />}
                </span>
              ))}
            <span className="hero-title-accent font-extrabold">
              {t("hero.titleAccent")}
            </span>
          </div>

          <div className="hero-sub">
            <h1 className="inline m-0 p-0 [font:inherit]">
              <strong>{t("hero.h1title")}</strong>
            </h1>
            {t("hero.subtitle")}
          </div>

          <Link href="/login" className="hero-cta-primary">
            {t("hero.ctaPrimary")}
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
          </Link>
          <p className="hero-cta-fineprint">{t("hero.fineprint")}</p>
        </div>

        <a href="#programa" className="hero-scroll-cue">
          <span>{t("hero.scrollCue")}</span>
          <span className="hero-scroll-arrow" aria-hidden="true">
            ↓
          </span>
        </a>
      </section>

      {/* Tools — phone mockups */}
      <section className="tools-shell">
        <Reveal className="tools-intro">
          <p className="tools-intro-tag">{t("tools.intro")}</p>
          <h2 className="tools-intro-title">
            {t("tools.title")}
            <br />
            <em className="tools-intro-em">{t("tools.titleEm")}</em>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="tool-row">
            <div className="tool-copy">
              <span className="tool-tag">{t("tools.chat.tag")}</span>
              <h3 className="tool-title">{t("tools.chat.title")}</h3>
              <p className="tool-body">{t("tools.chat.body")}</p>
            </div>
            <div className="phone-frame" aria-hidden="true">
              <div className="phone-notch" />
              <div className="phone-screen phone-screen--chat">
                <div className="phone-chat-head">
                  <div className="phone-chat-avatar">A</div>
                  <div>
                    <p className="phone-chat-name">
                      {t("tools.chat.coachName")}
                    </p>
                    <p className="phone-chat-status">
                      {t("tools.chat.coachStatus")}
                    </p>
                  </div>
                </div>
                <div className="phone-chat-body">
                  <div className="phone-bubble phone-bubble--theirs">
                    {t("tools.chat.bubble1")}
                  </div>
                  <div className="phone-bubble phone-bubble--mine">
                    {t("tools.chat.bubble2")}
                  </div>
                  <div className="phone-bubble phone-bubble--theirs">
                    {t("tools.chat.bubble3")}
                  </div>
                  <div className="phone-bubble phone-bubble--mine">
                    {t("tools.chat.bubble4")}
                  </div>
                </div>
                <div className="phone-chat-input">
                  <span>{t("tools.chat.inputPlaceholder")}</span>
                  <span className="phone-send">→</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="tool-row tool-row--reverse">
            <div className="tool-copy">
              <span className="tool-tag">{t("tools.timer.tag")}</span>
              <h3 className="tool-title">{t("tools.timer.title")}</h3>
              <p className="tool-body">{t("tools.timer.body")}</p>
            </div>
            <div className="phone-frame" aria-hidden="true">
              <div className="phone-notch" />
              <div className="phone-screen phone-screen--timer">
                <p className="phone-timer-mode">{t("tools.timer.mode")}</p>
                <div className="phone-timer-ring">
                  <svg viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="var(--accent-green)"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray="339"
                      strokeDashoffset="100"
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="phone-timer-time">
                    <span className="phone-timer-big">
                      {t("tools.timer.time")}
                    </span>
                    <span className="phone-timer-small">
                      {t("tools.timer.round")}
                    </span>
                  </div>
                </div>
                <div className="phone-timer-ctrl">
                  <span>▐▐</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Features — sticky stack */}
      <section id="programa" className="features-shell">
        <Reveal className="features-intro">
          <p className="features-intro-tag">{t("features.intro")}</p>
          <h2 className="features-intro-title">
            {t("features.title")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </h2>
        </Reveal>

        <div className="features-stack">
          {t.raw("features.items").map((f: any, idx: number) => (
            <article
              key={idx}
              className={`feature-card feature-card-${idx + 1}`}
            >
              <div>
                <div className="feature-num">{`0${idx + 1}`} / 03</div>
                <span className="feature-tag">{f.tag}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-body">{f.body}</p>
              </div>
              <div className="feature-icon" aria-hidden="true">
                {idx === 0 && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 18h6" />
                    <path d="M10 21h4" />
                    <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.5 1.2 2.5h5.6c0-1 .4-1.7 1.2-2.5A6 6 0 0 0 12 3z" />
                  </svg>
                )}
                {idx === 1 && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 21h18" />
                    <path d="M3 17h4v4" />
                    <path d="M8 13h4v8" />
                    <path d="M13 9h4v12" />
                    <path d="M18 4h3v17" />
                  </svg>
                )}
                {idx === 2 && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="5" />
                    <circle
                      cx="12"
                      cy="12"
                      r="1.5"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-shell">
        <div className="pricing-bg" aria-hidden="true" />

        <Reveal>
          <p className="pricing-eyebrow">{t("pricing.eyebrow")}</p>
          <h2 className="pricing-headline">
            {t("pricing.headline")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="pricing-card">
            <span className="pricing-badge">{t("pricing.badge")}</span>

            <p className="pricing-tag">{t("pricing.tag")}</p>

            <div className="pricing-price-row">
              <span className="pricing-price">
                {t("pricing.price")}
                <sup className="text-sm align-super">
                  {t("pricing.priceDecimal")}
                </sup>
                €
              </span>
              <span className="pricing-price-unit">{t("pricing.unit")}</span>
            </div>
            <p className="pricing-sub">{t("pricing.sub")}</p>

            <div className="pricing-divider" />

            <div>
              {t.raw("pricing.features").map((b: string) => (
                <div key={b} className="pricing-feature">
                  <span className="pricing-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <polyline points="5 12 10 17 19 8" />
                    </svg>
                  </span>
                  <span className="pricing-feature-text">{b}</span>
                </div>
              ))}
            </div>

            <Link href="/login" className="pricing-cta">
              {t("pricing.cta")}
            </Link>
            <p className="pricing-fineprint">{t("pricing.fineprint")}</p>
          </div>
        </Reveal>
      </section>

      {/* Why choose */}
      <section className="px-6 py-20">
        <div className="max-w-md mx-auto space-y-8">
          <Reveal>
            <h2 className="text-3xl font-bold leading-tight text-center">
              {t("whyChoose.title")}
            </h2>
          </Reveal>
          <ul className="space-y-5">
            {t.raw("whyChoose.items").map((why: string, i: number) => (
              <Reveal key={why} delay={i * 0.08} y={24}>
                <li className="flex items-start gap-3 border-l-2 border-accent/40 pl-4">
                  <span className="text-base leading-snug">{why}</span>
                </li>
              </Reveal>
            ))}
          </ul>
          <p className="text-center text-sm text-muted">
            {t("whyChoose.intro")}{" "}
            <Link href="/que-es-athx" className="text-accent underline">
              {t("whyChoose.introLink")}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="max-w-md mx-auto space-y-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center">{t("faq.title")}</h2>
          </Reveal>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <Reveal key={item.question} delay={i * 0.06} y={20}>
                <details className="glass rounded-xl px-5 py-4 group">
                  <summary className="text-sm font-medium list-none flex items-center justify-between cursor-pointer">
                    <span>{item.question}</span>
                    <span className="text-accent transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="text-muted text-sm mt-3 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-20">
        <Reveal className="max-w-md mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            {t("footer.cta")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
          </h2>
          <Link
            href="/login"
            className="inline-block w-full py-3.5 rounded-xl text-base font-semibold btn-gradient"
          >
            {t("footer.ctaButton")}
          </Link>
          <p className="text-muted text-xs">{t("footer.ctaFineprint")}</p>
        </Reveal>
      </section>

      {/* Legal footer */}
      <footer className="px-6 pt-6 pb-10 border-t border-white/5">
        <div className="max-w-md mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
          <Link
            href="/privacidad"
            className="hover:text-white transition-colors"
          >
            {t("footer.privacy")}
          </Link>
          <Link href="/terminos" className="hover:text-white transition-colors">
            {t("footer.terms")}
          </Link>
          <Link href="/cookies" className="hover:text-white transition-colors">
            {t("footer.cookiePolicy")}
          </Link>
          <a
            href="mailto:soporte@athlextraining.com"
            className="hover:text-white transition-colors"
          >
            {t("footer.support")}
          </a>
          <span className="w-full text-center text-[10px] uppercase tracking-widest opacity-60 mt-2">
            {t("footer.copyright")}
          </span>
        </div>
      </footer>
    </div>
  );
}
