import type { Locale, TranslationKey } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/locale";

const propertyTypes = new Set(["house", "apartment", "townhouse", "studio"]);

export function getLocalizedExtraData(extraData: unknown, locale: Locale): Array<{ label: string; value: string }> {
  if (typeof extraData !== "object" || extraData === null || Array.isArray(extraData)) return [];
  const value = (extraData as Record<string, unknown>).property_type;
  if (typeof value !== "string" || !propertyTypes.has(value)) return [];
  return [{
    label: t(locale, "leads.propertyType"),
    value: t(locale, `leads.propertyTypes.${value}` as TranslationKey),
  }];
}

export function formatPhotoCount(count: number, locale: Locale): string {
  return t(locale, `leads.photoCount.${count === 1 ? "one" : "other"}` as TranslationKey, { count: String(count) });
}
