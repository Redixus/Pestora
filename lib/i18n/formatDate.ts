import type { Locale } from "./locale";

const relativeUnits = [
  { unit: "day" as const, milliseconds: 86_400_000 },
  { unit: "hour" as const, milliseconds: 3_600_000 },
  { unit: "minute" as const, milliseconds: 60_000 },
  { unit: "second" as const, milliseconds: 1_000 },
];

export function formatRelativeDate(value: string | Date, locale: Locale, now = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const difference = now.getTime() - date.getTime();
  const absoluteDifference = Math.abs(difference);
  if (difference >= 86_400_000 && difference < 172_800_000) {
    return locale === "fr-BE" ? "Hier" : "Gisteren";
  }
  const selected = relativeUnits.find((candidate) => absoluteDifference >= candidate.milliseconds) ?? relativeUnits.at(-1);
  if (!selected) return "";
  const amount = Math.round(-difference / selected.milliseconds);
  const result = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "short" })
    .format(amount, selected.unit)
    .replaceAll("\u00a0", " ")
    .replaceAll("min.", "min");
  return locale === "fr-BE" ? result.charAt(0).toUpperCase() + result.slice(1) : result;
}

export function formatAbsoluteDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    value instanceof Date ? value : new Date(value),
  );
}
