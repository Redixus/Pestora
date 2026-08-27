export const TOP_UP_AMOUNTS_CENTS = [10_000, 25_000, 50_000] as const;

export function isTopUpAmount(value: number): value is (typeof TOP_UP_AMOUNTS_CENTS)[number] {
  return TOP_UP_AMOUNTS_CENTS.includes(value as (typeof TOP_UP_AMOUNTS_CENTS)[number]);
}
