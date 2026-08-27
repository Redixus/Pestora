import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { SignOutButton } from "@/components/portal/SignOutButton";

export default async function AccessDeniedPage() {
  const [brand, locale] = await Promise.all([resolveBrandFromHost(), resolveLocale()]);
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4" style={{ "--brand-accent": brand.accent_color } as React.CSSProperties}>
      <section className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-foreground/10">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[var(--brand-accent)] text-xl font-bold text-white">{brand.name.slice(0, 1)}</div>
        <h1 className="text-xl font-semibold">{t(locale, "errors.adminRequired")}</h1>
        <p className="mt-2 text-muted-foreground">{t(locale, "errors.contactInterventia")}</p>
        <div className="mt-6"><SignOutButton label={t(locale, "profile.signOut")} /></div>
      </section>
    </main>
  );
}
