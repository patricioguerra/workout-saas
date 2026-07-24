import { getTranslations } from "next-intl/server";
import { Link } from "@/shared/i18n/routing";
import { createSupabaseServerClient } from "@/shared/infra/supabase/server";
import { isUserSubscribed } from "@/modules/billing/application/get-subscription-status";
import { LanguageSwitcher } from "@/shared/i18n/components/language-switcher";
import { NavMenu } from "./components/nav-menu";
import { AdminBell } from "./components/admin-bell";
import { BrandMark } from "./components/brand-mark";

export async function Navbar() {
  const t = await getTranslations("nav");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let isSubscribed = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
    isSubscribed = await isUserSubscribed(user.id);
  }

  return (
    <nav className="px-4 py-3 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-white" aria-label={t("brandAriaLabel")}>
          <BrandMark className="h-8 w-auto" />
        </Link>
        <Link
          href="/entrenamiento"
          className="text-sm text-muted hover:text-white transition-colors"
        >
          {t("programLink")}
        </Link>
        <Link
          href="/noticias"
          className="text-sm text-muted hover:text-white transition-colors"
        >
          {t("newsLink")}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <LanguageSwitcher variant="inline" />
        </div>
        {user ? (
          <>
            {isAdmin && <AdminBell />}
            <NavMenu
              avatarUrl={user.user_metadata?.avatar_url ?? null}
              emailInitial={user.email?.[0] ?? "?"}
              isAdmin={isAdmin}
              isSubscribed={isSubscribed}
            />
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-2.5 rounded-lg btn-gradient"
          >
            {t("signInButton")}
          </Link>
        )}
      </div>
    </nav>
  );
}
