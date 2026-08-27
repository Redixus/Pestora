import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/auth/LanguageSwitcher";
import { PasswordForm } from "@/components/auth/PasswordForm";

export default async function SetPasswordPage() {
  const [brand, locale] = await Promise.all([resolveBrandFromHost(), resolveLocale()]);
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8" style={{ "--brand-accent": brand.accent_color } as React.CSSProperties}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex justify-end"><LanguageSwitcher locale={locale} /></div>
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
          <h1 className="text-2xl font-semibold">{t(locale, "auth.setPassword")}</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{brand.name}</p>
          <PasswordForm labels={{ password: t(locale, "auth.newPassword"), confirm: t(locale, "auth.confirmPassword"), submit: t(locale, "auth.savePassword"), loading: t(locale, "common.loading"), required: t(locale, "auth.passwordRequired"), mismatch: t(locale, "auth.passwordsDoNotMatch") }} />
        </section>
      </div>
    </main>
  );
}
