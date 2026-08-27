import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money/formatMoney";
import { formatAbsoluteDate } from "@/lib/i18n/formatDate";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getPortalContext, getPurchasedLeads } from "@/lib/portal/data";

export default async function MyLeadsPage() {
  const locale = await resolveLocale();
  const context = await getPortalContext(locale);
  const purchases = await getPurchasedLeads(context);
  return (
    <div className="space-y-6">
      <div><p className="text-sm text-muted-foreground">{context.brand.name}</p><h1 className="text-2xl font-semibold">{t(locale, "nav.myLeads")}</h1></div>
      {purchases.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">{t(locale, "leads.empty")}</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{purchases.map((purchase) => {
        const lead = purchase.lead;
        if (!lead) return null;
        const serviceName = purchase.service ? (locale === "fr-BE" ? purchase.service.name_fr : purchase.service.name_nl) : t(locale, "common.noValue");
        return <Card key={purchase.id}><CardContent className="space-y-4 py-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{serviceName}</p><p className="text-sm text-muted-foreground">{lead.postal_code} {lead.city}</p></div><p className="font-semibold">{formatMoney(purchase.price_paid_cents, locale)}</p></div><p className="text-sm">{purchase.contact?.name ?? t(locale, "common.noValue")} · {purchase.contact?.phone ?? t(locale, "common.noValue")}</p><p className="text-xs text-muted-foreground">{formatAbsoluteDate(purchase.purchased_at, locale)}</p><Link href={`/my-leads/${lead.id}`} className="flex min-h-11 items-center justify-center rounded-lg border text-sm font-medium">{t(locale, "common.view")}</Link></CardContent></Card>;
      })}</div>}
    </div>
  );
}
