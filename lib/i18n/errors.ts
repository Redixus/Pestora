import { formatMoney } from "@/lib/money/formatMoney";
import type { Locale, TranslationKey } from "./locale";
import { t } from "./locale";

type DatabaseError = { code?: string; message?: string };

export function mapDatabaseError(
  error: DatabaseError,
  locale: Locale,
  amounts?: { priceCents?: number; balanceCents?: number },
): { code: string; message: string } | null {
  if (!error.code || !["P0001", "P0002", "P0003", "P0004", "A0001", "A0002", "A0003", "A0004", "A0005", "A0006", "A0007"].includes(error.code)) return null;
  if (error.code === "P0001") return { code: error.code, message: t(locale, "purchase.alreadySold") };
  if (error.code === "P0002") {
    const price = amounts?.priceCents === undefined ? "" : formatMoney(amounts.priceCents, locale);
    const balance = amounts?.balanceCents === undefined ? "" : formatMoney(amounts.balanceCents, locale);
    return { code: error.code, message: `${t(locale, "purchase.insufficientBalance")}${price && balance ? ` ${t(locale, "details.insufficientBalance", { price, balance })}` : ""}` };
  }
  if (error.code === "P0003") return { code: error.code, message: t(locale, "errors.notEligible") };
  if (error.code === "P0004") return { code: error.code, message: t(locale, "errors.accountSuspended") };
  const adminMessages: Record<string, TranslationKey> = {
    A0001: "errors.adminRequired",
    A0002: "errors.reasonRequired",
    A0003: "errors.purchaseNotFound",
    A0004: "errors.walletNotFound",
    A0005: "errors.adminInsufficientBalance",
    A0006: "errors.invalidAmount",
    A0007: "errors.stripeEventRequired",
  };
  return { code: error.code, message: t(locale, adminMessages[error.code]) };
}
