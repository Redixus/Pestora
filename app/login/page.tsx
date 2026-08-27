import Image from "next/image";
import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitcher } from "@/components/auth/LanguageSwitcher";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const params = await searchParams;
  const [brand, locale] = await Promise.all([
    resolveBrandFromHost({ url: params.brand ? `http://localhost/?brand=${encodeURIComponent(params.brand)}` : undefined }),
    resolveLocale(),
  ]);
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8" style={{ "--brand-accent": brand.accent_color } as React.CSSProperties}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex justify-end"><LanguageSwitcher locale={locale} /></div>
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
          <div className="mb-8 text-center">
            {brand.logo_url ? <Image alt={brand.name} className="mx-auto mb-4 size-14 rounded object-contain" height={56} src={brand.logo_url} width={56} /> : <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-[var(--brand-accent)] text-2xl font-bold text-white">{brand.name.slice(0, 1)}</div>}
            <h1 className="text-2xl font-semibold">{brand.name} <span className="text-muted-foreground">{t(locale, "common.pro")}</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">{t(locale, "auth.login")}</p>
          </div>
          <LoginForm labels={{ email: t(locale, "auth.email"), password: t(locale, "auth.password"), submit: t(locale, "auth.signIn"), loading: t(locale, "auth.signingIn"), emailRequired: t(locale, "auth.emailRequired"), passwordRequired: t(locale, "auth.passwordRequired"), invalid: t(locale, "auth.invalidCredentials") }} />
        </section>
      </div>
    </main>
  );
}
