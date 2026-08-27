import { cookies, headers } from "next/headers";
import { frBE, type Dictionary } from "./locales/fr-BE";
import { nlBE } from "./locales/nl-BE";

export type Locale = "fr-BE" | "nl-BE";
type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${DotPath<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = DotPath<typeof frBE>;

type LocaleOptions = {
  cookieLocale?: string;
  acceptLanguage?: string | null;
};

function supportedLocale(value: string | undefined): Locale | null {
  if (value === "fr-BE" || value === "nl-BE") return value;
  return null;
}

function localeFromAcceptLanguage(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const candidates = value.split(",").map((entry, index) => {
    const [language, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return { language, quality: quality ? Number(quality.trim().slice(2)) : 1, index };
  }).filter((candidate) => candidate.quality > 0);
  candidates.sort((left, right) => right.quality - left.quality || left.index - right.index);
  for (const candidate of candidates) {
    if (candidate.language === "nl" || candidate.language.startsWith("nl-")) return "nl-BE";
    if (candidate.language === "fr" || candidate.language.startsWith("fr-")) return "fr-BE";
  }
  return null;
}

export async function resolveLocale(options: LocaleOptions = {}): Promise<Locale> {
  const explicitLocale = supportedLocale(options.cookieLocale);
  if (explicitLocale) return explicitLocale;
  if (options.acceptLanguage !== undefined) {
    return localeFromAcceptLanguage(options.acceptLanguage) ?? "fr-BE";
  }
  const cookieLocale = (await cookies()).get("interventia-locale")?.value;
  const storedLocale = supportedLocale(cookieLocale);
  if (storedLocale) return storedLocale;
  const accepted = localeFromAcceptLanguage((await headers()).get("accept-language"));
  return accepted ?? "fr-BE";
}

const dictionaries: Record<Locale, Dictionary> = { "fr-BE": frBE, "nl-BE": nlBE };

export function t(locale: Locale, key: TranslationKey, values: Record<string, string> = {}): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, dictionaries[locale]);
  if (typeof value !== "string") throw new Error(`Missing translation: ${locale}.${key}`);
  return Object.entries(values).reduce(
    (result, [name, replacement]) => result.replaceAll(`{${name}}`, replacement),
    value,
  );
}

export async function getTranslator() {
  const locale = await resolveLocale();
  return (key: TranslationKey, values?: Record<string, string>) => t(locale, key, values);
}

export { frBE, nlBE };
