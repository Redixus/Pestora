import { describe, expect, it } from "vitest";
import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { frBE, nlBE } from "@/lib/i18n/locale";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/i18n/formatDate";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { formatMoney } from "@/lib/money/formatMoney";
import { normalizePhoneForHref } from "@/lib/phone/normalizePhone";
import { formatPhotoCount, getLocalizedExtraData } from "@/lib/portal/extraData";

function leafPaths(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" && child !== null
      ? leafPaths(child, path)
      : [path];
  });
}

describe("shared layers", () => {
  it("formats integer cents as EUR in both supported locales", () => {
    expect(formatMoney(2_500, "fr-BE")).toBe("25,00 €");
    expect(formatMoney(2_500, "nl-BE")).toBe("€ 25,00");
  });

  it("formats relative and absolute dates for each locale", () => {
    const now = new Date("2026-08-27T12:08:00.000Z");
    const eightMinutesAgo = "2026-08-27T12:00:00.000Z";
    expect(formatRelativeDate(eightMinutesAgo, "fr-BE", now)).toBe("Il y a 8 min");
    expect(formatRelativeDate(eightMinutesAgo, "nl-BE", now)).toBe("8 min geleden");
    expect(formatRelativeDate("2026-08-26T12:00:00.000Z", "fr-BE", now)).toBe("Hier");
    expect(formatRelativeDate("2026-08-26T12:00:00.000Z", "nl-BE", now)).toBe("Gisteren");
    expect(formatAbsoluteDate("2026-08-27T12:00:00.000Z", "fr-BE")).toBe("27 août 2026");
    expect(formatAbsoluteDate("2026-08-27T12:00:00.000Z", "nl-BE")).toBe("27 augustus 2026");
  });

  it("resolves an explicit cookie before Accept-Language and defaults Dutch", async () => {
    await expect(resolveLocale({ cookieLocale: "fr-BE", acceptLanguage: "nl-BE" })).resolves.toBe("fr-BE");
    await expect(resolveLocale({ acceptLanguage: "nl-BE,nl;q=0.9,fr;q=0.8" })).resolves.toBe("nl-BE");
    await expect(resolveLocale({ acceptLanguage: "fr-BE,fr;q=0.9" })).resolves.toBe("fr-BE");
    await expect(resolveLocale({ acceptLanguage: "en-US,de" })).resolves.toBe("fr-BE");
    await expect(resolveLocale({ acceptLanguage: null })).resolves.toBe("fr-BE");
  });

  it("resolves local brand query and remembered cookie through a mocked lookup", async () => {
    const lookup = async (criteria: { host?: string; slug?: string }) => ({
      id: "brand-id",
      slug: criteria.slug ?? "host-brand",
      name: "Pestora",
      logo_url: null,
      accent_color: "#000000",
      partner_host: criteria.host ?? "pro.pestora.be",
      active: true,
      created_at: "2026-08-27T00:00:00.000Z",
    });
    await expect(resolveBrandFromHost({
      hostname: "localhost",
      url: "http://localhost:3000/?brand=pestora",
      lookup,
    })).resolves.toMatchObject({ slug: "pestora" });
    await expect(resolveBrandFromHost({
      hostname: "localhost",
      cookieReader: { get: () => ({ value: "drenora" }) },
      lookup,
    })).resolves.toMatchObject({ slug: "drenora" });
    await expect(resolveBrandFromHost({
      hostname: "pro.pestora.be",
      lookup,
    })).resolves.toMatchObject({ partner_host: "pro.pestora.be" });
  });

  it("keeps locale dictionary key sets identical", () => {
    expect(leafPaths(frBE).sort()).toEqual(leafPaths(nlBE).sort());
    expect(t("fr-BE", "nav.myLeads")).toBe("Mes leads");
    expect(t("nl-BE", "nav.myLeads")).toBe("Mijn leads");
  });

  it("sanitizes phone links and localizes photo and whitelisted extra data", () => {
    expect(normalizePhoneForHref("+32 (0) 470-00.00 00")).toBe("+320470000000");
    expect(formatPhotoCount(1, "fr-BE")).toBe("1 photo");
    expect(formatPhotoCount(2, "fr-BE")).toBe("2 photos");
    expect(formatPhotoCount(1, "nl-BE")).toBe("1 foto");
    expect(formatPhotoCount(2, "nl-BE")).toBe("2 foto's");
    expect(getLocalizedExtraData({ property_type: "house", secret: "hidden" }, "fr-BE")).toEqual([{ label: "Type de bien", value: "Maison" }]);
    expect(getLocalizedExtraData({ property_type: "Rijhuis" }, "nl-BE")).toEqual([]);
  });
});
