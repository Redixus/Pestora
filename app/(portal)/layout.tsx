import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { resolveLocale } from "@/lib/i18n/locale";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const [brand, locale] = await Promise.all([resolveBrandFromHost(), resolveLocale()]);
  return <PortalShell brand={brand} locale={locale}>{children}</PortalShell>;
}
