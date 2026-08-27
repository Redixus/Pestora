import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money/formatMoney";
import { formatAbsoluteDate } from "@/lib/i18n/formatDate";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getPortalContext, getPurchasedLeads } from "@/lib/portal/data";
import { normalizePhoneForHref } from "@/lib/phone/normalizePhone";

export default async function PurchasedLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, resolveLocale()]);
  const context = await getPortalContext(locale);
  const purchase = (await getPurchasedLeads(context)).find((item) => item.lead?.id === id);
  if (!purchase?.lead || !purchase.contact) notFound();
  const serviceName = purchase.service ? (locale === "fr-BE" ? purchase.service.name_fr : purchase.service.name_nl) : t(locale, "common.noValue");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/my-leads" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />{t(locale, "common.back")}</Link>
      <div><p className="text-sm text-muted-foreground">{serviceName}</p><h1 className="text-2xl font-semibold">{purchase.lead.postal_code} {purchase.lead.city}</h1></div>
      <Card><CardContent className="space-y-4 py-5"><div><p className="text-sm text-muted-foreground">{t(locale, "profile.contact")}</p><p className="text-xl font-semibold">{purchase.contact.name}</p></div><a href={`tel:${normalizePhoneForHref(purchase.contact.phone)}`} className="flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 text-lg font-semibold text-white"><Phone className="size-5" />{t(locale, "purchase.call")}</a>{purchase.contact.email && <a href={`mailto:${purchase.contact.email}`} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 font-medium"><Mail className="size-4" />{t(locale, "purchase.email")}</a>}<dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">{t(locale, "profile.phone")}</dt><dd>{purchase.contact.phone}</dd></div>{purchase.contact.email && <div><dt className="text-muted-foreground">{t(locale, "profile.email")}</dt><dd className="break-all">{purchase.contact.email}</dd></div>}<div><dt className="text-muted-foreground">{t(locale, "common.details")}</dt><dd className="whitespace-pre-wrap">{purchase.lead.description ?? t(locale, "common.noValue")}</dd></div><div><dt className="text-muted-foreground">{t(locale, "common.status")}</dt><dd>{formatAbsoluteDate(purchase.purchased_at, locale)} · {formatMoney(purchase.price_paid_cents, locale)}</dd></div></dl>{purchase.contact.full_address && <div><p className="text-sm text-muted-foreground">{t(locale, "leads.location")}</p><p>{purchase.contact.full_address}</p></div>}</CardContent></Card>
      <Link href="/leads" className="flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-medium">{t(locale, "nav.leads")}</Link>
    </div>
  );
}
