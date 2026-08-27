import Link from "next/link";
import Image from "next/image";
import { getTranslator, type Locale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PortalNav } from "./PortalNav";
import { SignOutButton } from "./SignOutButton";

export async function PortalShell({ children, brand, locale }: { children: React.ReactNode; brand: { name: string; logo_url: string | null; accent_color: string }; locale: Locale }) {
  const t = await getTranslator();
  return (
    <div className="min-h-screen bg-muted/30" style={{ "--brand-accent": brand.accent_color } as React.CSSProperties}>
      <div className="flex min-h-screen">
        <PortalNav ariaLabel={t("common.navigation")} items={[
          { href: "/leads", label: t("nav.leads"), icon: "list" },
          { href: "/my-leads", label: t("nav.myLeads"), icon: "shopping" },
          { href: "/wallet", label: t("nav.balance"), icon: "card" },
          { href: "/profile", label: t("nav.profile"), icon: "user" },
        ]} />
        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          <header className="border-b bg-white">
            <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4">
              <Link href="/leads" className="flex shrink-0 items-center gap-2 font-semibold">
                {brand.logo_url ? <Image alt="" className="size-8 rounded object-contain" height={32} src={brand.logo_url} width={32} /> : <span className="grid size-8 place-items-center rounded bg-[var(--brand-accent)] text-sm text-white">{brand.name.slice(0, 1)}</span>}
                <span className="whitespace-nowrap">{brand.name} <span className="hidden text-muted-foreground sm:inline">{t("common.pro")}</span></span>
              </Link>
              <div className="flex shrink-0 items-center gap-1"><LanguageSwitcher locale={locale} /><SignOutButton label={t("profile.signOut")} /></div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
