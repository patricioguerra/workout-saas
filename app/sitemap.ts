import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/seo/site";

type Entry = {
  esPath: string;
  enPath: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const PUBLIC_ROUTES: Entry[] = [
  { esPath: "/", enPath: "/en", priority: 1.0, changeFrequency: "weekly" },
  { esPath: "/que-es-athx", enPath: "/en/what-is-athx", priority: 0.9, changeFrequency: "monthly" },
  { esPath: "/embajadores", enPath: "/en/ambassadors", priority: 0.5, changeFrequency: "monthly" },
  { esPath: "/privacidad", enPath: "/en/privacy", priority: 0.3, changeFrequency: "yearly" },
  { esPath: "/terminos", enPath: "/en/terms", priority: 0.3, changeFrequency: "yearly" },
  { esPath: "/cookies", enPath: "/en/cookies", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const { esPath, enPath, priority, changeFrequency } of PUBLIC_ROUTES) {
    const languages = {
      es: `${SITE_URL}${esPath}`,
      en: `${SITE_URL}${enPath}`,
      "x-default": `${SITE_URL}${esPath}`,
    };

    entries.push({
      url: `${SITE_URL}${esPath}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    });

    entries.push({
      url: `${SITE_URL}${enPath}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    });
  }

  return entries;
}
