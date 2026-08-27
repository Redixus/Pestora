import { notFound } from "next/navigation";
import { Camera, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseButton } from "@/components/portal/PurchaseButton";
import { formatMoney } from "@/lib/money/formatMoney";
import { formatRelativeDate } from "@/lib/i18n/formatDate";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getLead, getPortalContext } from "@/lib/portal/data";
import { formatPhotoCount, getLocalizedExtraData } from "@/lib/portal/extraData";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, resolveLocale()]);
  const context = await getPortalContext(locale);
  const lead = await getLead(context, id);
  if (!lead) notFound();
  const serviceName = lead.service ? (locale === "fr-BE" ? lead.service.name_fr : lead.service.name_nl) : t(locale, "common.noValue");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{serviceName}</p><h1 className="text-2xl font-semibold">{lead.postal_code} {lead.city}</h1></div><Badge className="bg-[var(--brand-accent)] text-white">{formatMoney(lead.price_cents, locale)}</Badge></div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="size-4" />{lead.postal_code} {lead.city}</span><span>{formatRelativeDate(lead.created_at, locale)}</span>{lead.photo_count > 0 && <span className="inline-flex items-center gap-1"><Camera className="size-4" />{formatPhotoCount(lead.photo_count, locale)}</span>}</div>
      <Card><CardContent className="space-y-4 py-5">{getLocalizedExtraData(lead.extra_data, locale).map((item) => <p className="text-sm" key={item.label}><span className="font-medium">{item.label}:</span> {item.value}</p>)}{lead.description && <p className="whitespace-pre-wrap text-sm">{lead.description}</p>}{lead.photo_count > 0 && <p className="text-sm"><span className="font-medium">{t(locale, "leads.photos")}:</span> {formatPhotoCount(lead.photo_count, locale)}</p>}</CardContent></Card>
      <div className="sticky bottom-20 rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-foreground/10 md:bottom-4"><PurchaseButton leadId={lead.id} label={t(locale, "purchase.buy")} loading={t(locale, "common.loading")} topUpLabel={t(locale, "wallet.topUp")} refreshLabel={t(locale, "common.refresh")} /></div>
    </div>
  );
}
