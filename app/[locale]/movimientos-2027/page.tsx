import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { Reveal } from "../reveal";
import { SITE_URL } from "@/shared/seo/site";
import m from "./movements.module.css";
import s from "../season.module.css";

type Movement = { name: string; standards: string[] };
type Zone = {
  key: string;
  tag: string;
  title: string;
  blurb: string;
  equipmentNote: string;
  movements: Movement[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "movements2027" });
  const isEn = locale === "en";
  const path = "/movimientos-2027";
  const enPath = "/en/movements-2027";
  const selfPath = isEn ? enPath : path;

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SITE_URL}${selfPath}`,
      languages: {
        es: `${SITE_URL}${path}`,
        en: `${SITE_URL}${enPath}`,
        "x-default": `${SITE_URL}${path}`,
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

export default async function Movimientos2027Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "movements2027" });
  const zones = t.raw("zones") as Zone[];

  return (
    <div className={m.page}>
      <section className={m.intro}>
        <Reveal>
          <p className={m.eyebrow}>{t("eyebrow")}</p>
          <h1 className={m.title}>{t("title")}</h1>
          <p className={m.introBody}>{t("intro")}</p>
          <div className={m.introLinks}>
            <a
              href="https://athxgames.com/events"
              target="_blank"
              rel="noopener noreferrer"
              className={m.officialLink}
            >
              {t("officialLink")}
              <ExternalIcon />
            </a>
          </div>
        </Reveal>
      </section>

      {zones.map((zone, zi) => (
        <section key={zone.key} className={m.zone}>
          <div className={m.zoneInner}>
            <Reveal delay={zi * 0.04}>
              <span className={m.zoneTag}>{zone.tag}</span>
              <h2 className={m.zoneTitle}>{zone.title}</h2>
              <p className={m.zoneBlurb}>{zone.blurb}</p>
            </Reveal>

            <div className={m.movementList}>
              {zone.movements.map((movement, i) => (
                <Reveal key={movement.name} delay={i * 0.05} y={16}>
                  <details className="glass rounded-xl px-5 py-4 group">
                    <summary className="text-sm font-medium list-none flex items-center justify-between cursor-pointer">
                      <span>{movement.name}</span>
                      <span className="text-accent transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className={m.movementStandards}>
                      {movement.standards.map((standard) => (
                        <p key={standard} className={m.movementStandard}>
                          {standard}
                        </p>
                      ))}
                    </div>
                  </details>
                </Reveal>
              ))}
            </div>

            {zone.equipmentNote && (
              <Reveal delay={0.1}>
                <p className={m.equipmentNote}>{zone.equipmentNote}</p>
              </Reveal>
            )}
          </div>
        </section>
      ))}

      <section className={s.closing}>
        <div className={s.closingVignette} aria-hidden="true" />
        <Reveal className={s.closingInner}>
          <h2 className={s.closingTitle}>{t("closing.title")}</h2>
          <p className={s.closingBody}>{t("closing.body")}</p>
          <Link href="/login" className={s.closingCta}>
            {t("closing.cta")}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
