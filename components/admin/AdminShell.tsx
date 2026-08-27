import Link from "next/link";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { t, type Locale } from "@/lib/i18n/locale";

export function AdminShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const items = [{ href: "/admin", label: t(locale, "admin.dashboard") }, { href: "/admin/leads", label: t(locale, "admin.leads") }, { href: "/admin/partners", label: t(locale, "admin.partners") }];
  return <div className="min-h-screen bg-muted/30"><header className="border-b bg-white"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4"><Link className="font-semibold" href="/admin">{t(locale, "admin.appName")}</Link><div className="flex items-center"><LanguageSwitcher locale={locale} /><SignOutButton label={t(locale, "profile.signOut")} /></div></div></header><div className="mx-auto flex max-w-6xl"><aside className="hidden w-52 shrink-0 border-r bg-white md:block"><nav className="sticky top-0 grid gap-1 p-4">{items.map((item) => <Link className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted" href={item.href} key={item.href}>{item.label}</Link>)}</nav></aside><main className="min-w-0 flex-1 px-4 py-6 pb-24">{children}</main></div><nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden">{items.map((item) => <Link className="flex min-h-11 items-center px-4 text-sm font-medium" href={item.href} key={item.href}>{item.label}</Link>)}</nav></div>;
}
