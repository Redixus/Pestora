import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminContext, getAdminDashboardData } from "@/lib/admin/data";
import { formatMoney } from "@/lib/money/formatMoney";
import { t } from "@/lib/i18n/locale";

export default async function AdminDashboardPage() {
  const { supabase, locale } = await getAdminContext();
  const data = await getAdminDashboardData(supabase);
  const cards = [
    [t(locale, "admin.availableLeads"), String(data.availableLeads)],
    [t(locale, "admin.soldToday"), String(data.soldToday)],
    [t(locale, "admin.soldWeek"), String(data.soldWeek)],
    [t(locale, "admin.grossRevenue"), formatMoney(data.grossRevenueCents, locale)],
    [t(locale, "admin.activePartners"), String(data.activePartners)],
    [t(locale, "admin.suspendedPartners"), String(data.suspendedPartners)],
    [t(locale, "admin.lowBalance"), String(data.lowBalancePartners)],
  ];
  return <div className="space-y-6"><div><p className="text-sm text-muted-foreground">{t(locale, "admin.title")}</p><h1 className="text-2xl font-semibold">{t(locale, "admin.dashboard")}</h1></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <Card key={label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{value}</p></CardContent></Card>)}</div><div className="flex flex-wrap gap-3"><Link className="flex min-h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium" href="/admin/leads">{t(locale, "admin.leads")}</Link><Link className="flex min-h-11 items-center rounded-lg border bg-white px-4 text-sm font-medium" href="/admin/partners">{t(locale, "admin.partners")}</Link></div></div>;
}
