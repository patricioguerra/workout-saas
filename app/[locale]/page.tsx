import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { Reveal } from "./reveal";
import { Countdown } from "./countdown";
import { JsonLd, softwareApplicationLd, faqPageLd } from "@/shared/seo/jsonld";
import { SITE_URL } from "@/shared/seo/site";
import styles from "./season.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    alternates: {
      canonical: isEn ? `${SITE_URL}/en` : `${SITE_URL}/`,
      languages: {
        es: `${SITE_URL}/`,
        en: `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/`,
      },
    },
    robots: { index: true, follow: true },
  };
}

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12h14M13 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 17 17 7M17 7H9M17 7v8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const t2 = await getTranslations("season2027");

  const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;
  const faqItems = faqKeys.map((k) => ({
    question: t(`faq.items.${k}.question`),
    answer: t(`faq.items.${k}.answer`),
  }));
  const features = t.raw("features.items") as Array<{
    tag: string;
    title: string;
    body: string;
  }>;
  const whyItems = t.raw("whyChoose.items") as string[];

  return (
    <div className={styles.page}>
      <link
        rel="preload"
        as="image"
        href="/backgroundhero.webp"
        fetchPriority="high"
      />
      <JsonLd data={softwareApplicationLd(locale as "es" | "en")} />
      <JsonLd data={faqPageLd(faqItems, locale as "es" | "en")} />

      {/* Hero — ATHX 2027 */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <span className={styles.dot} />
              {t2("hero.eyebrow")}
            </span>

            <h1 className={styles.headline}>
              {t2("hero.titleLine1")}
              <br />
              <span className={styles.headlineAccent}>{t2("hero.titleLine2")}</span>
            </h1>

            <p className={styles.subtitle}>{t2("hero.subtitle")}</p>

            <Link href="/login" className={styles.heroCta}>
              {t2("hero.cta")}
              <ArrowIcon />
            </Link>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroVisualOverlay} />
            <div className={styles.heroGrainGrid} />
          </div>
        </div>

        <a href="#programa" className={styles.heroScrollCue}>
          <span>{t2("hero.scrollCue")}</span>
          <span className={styles.heroScrollArrow} aria-hidden="true">
            ↓
          </span>
        </a>
      </section>

      {/* Tools — phone mockups (unchanged) */}
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

      {/* Program — same 3 pillars, restyled cards */}
      <section id="programa" className={styles.programShell}>
        <Reveal className={styles.programIntro}>
          <p className={styles.programTag}>{t("features.intro")}</p>
          <h2 className={styles.programTitle}>
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

        <div className={styles.programGrid}>
          {features.map((f, idx) => (
            <Reveal key={f.title} delay={idx * 0.08}>
              <div className={styles.programCard}>
                <div className={styles.programIcon} aria-hidden="true">
                  {idx === 0 && (
                    <svg viewBox="0 0 24 24">
                      <path d="M9 18h6" />
                      <path d="M10 21h4" />
                      <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.5 1.2 2.5h5.6c0-1 .4-1.7 1.2-2.5A6 6 0 0 0 12 3z" />
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg viewBox="0 0 24 24">
                      <path d="M3 21h18" />
                      <path d="M3 17h4v4" />
                      <path d="M8 13h4v8" />
                      <path d="M13 9h4v12" />
                      <path d="M18 4h3v17" />
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                </div>
                <span className={styles.programCardTag}>{f.tag}</span>
                <h3 className={styles.programCardTitle}>{f.title}</h3>
                <p className={styles.programCardBody}>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Combo — countdown + subscription */}
      <section className={styles.comboShell}>
        <div className={styles.comboGrid}>
          <Reveal className={styles.comboCountdown}>
            <span className={styles.tickerKicker}>
              <span className={styles.tickerKickerBar} />
              {t2("hero.kicker")}
            </span>
            <p className={styles.tickerLabel}>{t2("countdown.label")}</p>
            <p className={styles.tickerCaption}>{t2("countdown.caption")}</p>
            <Countdown
              labels={{
                days: t2("countdown.days"),
                hours: t2("countdown.hours"),
                minutes: t2("countdown.minutes"),
                seconds: t2("countdown.seconds"),
              }}
            />
          </Reveal>

          <Reveal delay={0.1}>
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
        </div>
      </section>

      {/* Events calendar + movements + why choose */}
      <section className={styles.eventsShell}>
        <div className={styles.eventsGrid}>
          <Reveal>
            <a
              href="https://athxgames.com/events"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.eventsImageCard}
              aria-label={t2("events.cta")}
            >
              <div className={styles.eventsImageInner}>
                <h2 className={styles.eventsImageTitle}>{t2("events.title")}</h2>
                <p className={styles.eventsImageBody}>{t2("events.body")}</p>
                <span className={styles.eventsImageCta}>
                  {t2("events.cta")}
                  <ExternalIcon />
                </span>
              </div>
            </a>
          </Reveal>

          <div className={styles.eventsRightCol}>
            <Reveal>
              <Link href="/movimientos-2027" className={styles.movementsCard}>
                <h2 className={styles.movementsCardTitle}>
                  {t2("movements.title")}
                </h2>
                <p className={styles.movementsCardBody}>{t2("movements.body")}</p>
                <span className={styles.movementsCardCta}>
                  {t2("movements.cta")}
                  <ArrowIcon />
                </span>
              </Link>
            </Reveal>

            <Reveal delay={0.08}>
              <div className={styles.whyCard}>
                <h2 className={styles.whyCardTitle}>{t("whyChoose.title")}</h2>
                <ul className={styles.whyList}>
                  {whyItems.map((why) => (
                    <li key={why} className={styles.whyItem}>
                      {why}
                    </li>
                  ))}
                </ul>
                <p className={styles.whyFootnote}>
                  {t("whyChoose.intro")}{" "}
                  <Link href="/que-es-athx">{t("whyChoose.introLink")}</Link>.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ — unchanged */}
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

      {/* Closing CTA — ATHX 2027 */}
      <section className={styles.closing}>
        <div className={styles.closingVignette} aria-hidden="true" />
        <Reveal className={styles.closingInner}>
          <h2 className={styles.closingTitle}>
            {t2("closing.titleLine1")}
            <br />
            {t2("closing.titleLine2")}
          </h2>
          <p className={styles.closingBody}>{t2("closing.body")}</p>
          <Link href="/login" className={styles.closingCta}>
            {t2("closing.cta")}
          </Link>
          <p className={styles.closingFineprint}>{t2("closing.fineprint")}</p>
        </Reveal>
      </section>

      {/* Legal footer — unchanged */}
      <footer className="px-6 pt-6 pb-10 border-t border-white/5">
        <div className="max-w-md mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
          <Link href="/privacidad" className="hover:text-white transition-colors">
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
