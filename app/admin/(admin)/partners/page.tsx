import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminContext, getAdminPartners } from "@/lib/admin/data";
import { formatMoney } from "@/lib/money/formatMoney";
import { t } from "@/lib/i18n/locale";
import { localizeStatus } from "@/lib/admin/presentation";

export default async function AdminPartnersPage() {
  const { supabase, locale } = await getAdminContext();
  const partners = await getAdminPartners(supabase);
  return <div className="space-y-6"><div><p className="text-sm text-muted-foreground">{t(locale, "admin.title")}</p><h1 className="text-2xl font-semibold">{t(locale, "admin.partners")}</h1></div><div className="grid gap-3">{partners.map((partner) => <Card key={partner.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{partner.company_name}</p><p className="text-sm text-muted-foreground">{partner.brands.join(", ") || t(locale, "common.noValue")} · {localizeStatus(partner.status, locale)}</p></div><div className="flex items-center gap-3"><span className="font-medium">{formatMoney(partner.balance_cents, locale)}</span><Link className="flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium" href={`/admin/partners/${partner.id}`}>{t(locale, "common.view")}</Link></div></CardContent></Card>)}</div></div>;
}
