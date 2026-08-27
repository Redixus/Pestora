import Link from "next/link";
import { ArrowRight, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LeadCard } from "@/components/portal/LeadCard";
import { formatMoney } from "@/lib/money/formatMoney";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getAvailableLeads, getPortalContext, getWallet } from "@/lib/portal/data";

export default async function LeadsPage() {
  const locale = await resolveLocale();
  const context = await getPortalContext(locale);
  const [leads, wallet] = await Promise.all([getAvailableLeads(context), getWallet(context.supabase, context.partner.id)]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-muted-foreground">{context.brand.name}</p><h1 className="text-2xl font-semibold">{t(locale, "leads.available")}</h1></div>
        <Link href="/wallet" className="flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium"><WalletCards className="size-4" /><span>{formatMoney(wallet.balance_cents, locale)}</span><ArrowRight className="size-4" /></Link>
      </div>
      {leads.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">{t(locale, "leads.empty")}</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{leads.map((lead) => <LeadCard key={lead.id} lead={lead} locale={locale} />)}</div>}
    </div>
  );
}
