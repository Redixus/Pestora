import { t, type Locale, type TranslationKey } from "@/lib/i18n/locale";

export function localizeStatus(status: string, locale: Locale): string {
  const keys: Record<string, TranslationKey> = {
    available: "admin.statusAvailable",
    sold: "admin.statusSold",
    invalid: "admin.statusInvalid",
    archived: "admin.statusArchived",
    active: "profile.active",
    suspended: "profile.suspended",
  };
  return keys[status] ? t(locale, keys[status]) : t(locale, "common.noValue");
}

export function localizeTransactionType(type: string, locale: Locale): string {
  const keys: Record<string, TranslationKey> = {
    top_up: "wallet.types.topUp",
    lead_purchase: "wallet.types.leadPurchase",
    lead_refund: "wallet.types.leadRefund",
    manual_adjustment: "wallet.types.manualAdjustment",
    cash_refund: "wallet.types.cashRefund",
  };
  return keys[type] ? t(locale, keys[type]) : t(locale, "common.noValue");
}
