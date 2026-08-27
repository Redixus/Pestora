import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopUpButton } from "@/components/portal/TopUpButton";
import { formatMoney } from "@/lib/money/formatMoney";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { getPortalContext, getTransactions, getWallet } from "@/lib/portal/data";

export default async function WalletPage() {
  const locale = await resolveLocale();
  const context = await getPortalContext(locale);
  const [wallet, transactions] = await Promise.all([getWallet(context.supabase, context.partner.id), getTransactions(context)]);
  const labels = { top_up: t(locale, "wallet.types.topUp"), lead_purchase: t(locale, "wallet.types.leadPurchase"), lead_refund: t(locale, "wallet.types.leadRefund"), manual_adjustment: t(locale, "wallet.types.manualAdjustment"), cash_refund: t(locale, "wallet.types.cashRefund") };
  return (
    <div className="space-y-6">
      <div><p className="text-sm text-muted-foreground">{context.brand.name}</p><h1 className="text-2xl font-semibold">{t(locale, "nav.balance")}</h1></div>
      <Card><CardContent className="py-7"><p className="text-sm text-muted-foreground">{t(locale, "wallet.yourBalance")}</p><p className="mt-1 text-4xl font-semibold tracking-tight">{formatMoney(wallet.balance_cents, locale)}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>{t(locale, "wallet.addFunds")}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{[10000, 25000, 50000].map((amount) => <TopUpButton key={amount} amountCents={amount} label={t(locale, "wallet.topUpAmount", { amount: formatMoney(amount, locale) })} pendingLabel={t(locale, "common.loading")} errorLabel={t(locale, "errors.generic")} />)}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t(locale, "wallet.recentTransactions")}</CardTitle></CardHeader><CardContent>{transactions.length === 0 ? <p className="text-sm text-muted-foreground">{t(locale, "wallet.noTransactions")}</p> : <div className="divide-y">{transactions.map((transaction) => <div key={transaction.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{labels[transaction.type as keyof typeof labels] ?? transaction.type}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(transaction.created_at))}</p></div><p className={transaction.amount_cents >= 0 ? "font-medium text-emerald-700" : "font-medium"}>{transaction.amount_cents >= 0 ? "+" : ""}{formatMoney(transaction.amount_cents, locale)}</p></div>)}</div>}</CardContent></Card>
    </div>
  );
}
