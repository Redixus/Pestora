import Link from "next/link";
import { Camera, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseButton } from "./PurchaseButton";
import { formatMoney } from "@/lib/money/formatMoney";
import { formatRelativeDate } from "@/lib/i18n/formatDate";
import { t, type Locale } from "@/lib/i18n/locale";
import { formatPhotoCount, getLocalizedExtraData } from "@/lib/portal/extraData";

type Lead = {
  id: string;
  postal_code: string;
  city: string;
  description: string | null;
  price_cents: number;
  photo_count: number;
  extra_data: unknown;
  created_at: string;
  service: { name_fr: string; name_nl: string } | null;
};

export function LeadCard({ lead, locale }: { lead: Lead; locale: Locale }) {
  const extraData = getLocalizedExtraData(lead.extra_data, locale);
  return (
    <Card className="gap-0">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{lead.service ? (locale === "fr-BE" ? lead.service.name_fr : lead.service.name_nl) : t(locale, "common.noValue")}</CardTitle>
          <Badge className="bg-[var(--brand-accent)] text-white">{formatMoney(lead.price_cents, locale)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{lead.postal_code} {lead.city}</span>
          <span>{formatRelativeDate(lead.created_at, locale)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {extraData.map((item) => <p className="text-sm" key={item.label}><span className="font-medium">{item.label}:</span> {item.value}</p>)}
        {lead.description && <p className="line-clamp-3 text-sm text-muted-foreground">{lead.description}</p>}
        {lead.photo_count > 0 && <div className="flex items-center gap-1 text-sm text-muted-foreground"><Camera className="size-4" /> {formatPhotoCount(lead.photo_count, locale)}</div>}
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <PurchaseButton leadId={lead.id} label={t(locale, "purchase.buy")} loading={t(locale, "common.loading")} topUpLabel={t(locale, "wallet.topUp")} refreshLabel={t(locale, "common.refresh")} />
        <Link href={`/leads/${lead.id}`} className="flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium">{t(locale, "common.details")}</Link>
      </CardFooter>
    </Card>
  );
}
