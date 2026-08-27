import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getPortalContext, getProfileData } from "@/lib/portal/data";

export default async function ProfilePage() {
  const locale = await resolveLocale();
  const context = await getPortalContext(locale);
  const profile = await getProfileData(context);
  const partner = context.partner;
  const serviceNames = profile.services.map((service) => locale === "fr-BE" ? service.name_fr : service.name_nl);
  const brandNames = profile.brands.map((brand) => brand.name);
  const postalCodes = profile.postcodes.map((postcode) => postcode.postal_code);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{context.brand.name}</p><h1 className="text-2xl font-semibold">{t(locale, "nav.profile")}</h1></div><LanguageSwitcher locale={locale} /></div>
      <Card><CardHeader><CardTitle>{t(locale, "profile.company")}</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2">{[[t(locale, "profile.company"), partner.company_name], [t(locale, "profile.contact"), partner.contact_name], [t(locale, "profile.email"), partner.email], [t(locale, "profile.phone"), partner.phone ?? t(locale, "common.noValue")], [t(locale, "profile.vatNumber"), partner.vat_number ?? t(locale, "common.noValue")], [t(locale, "profile.status"), partner.status === "active" ? t(locale, "profile.active") : t(locale, "profile.suspended")]].map(([label, value]) => <div key={label}><p className="text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t(locale, "profile.brands")}</CardTitle></CardHeader><CardContent><p className="text-sm">{brandNames.join(", ") || t(locale, "common.noValue")}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>{t(locale, "profile.services")}</CardTitle></CardHeader><CardContent><p className="text-sm">{serviceNames.join(", ") || t(locale, "common.noValue")}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>{t(locale, "profile.postalCodes")}</CardTitle></CardHeader><CardContent><p className="text-sm">{postalCodes.join(", ") || t(locale, "common.noValue")}</p></CardContent></Card>
      <SignOutButton label={t(locale, "profile.signOut")} />
    </div>
  );
}
