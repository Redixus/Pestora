export type SupportedLocale = "fr-BE" | "nl-BE";

export function formatMoney(cents: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
  }).format(cents / 100);
}
