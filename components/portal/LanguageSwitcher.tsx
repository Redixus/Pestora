"use client";

import { setLocaleFromForm } from "@/lib/i18n/actions";

export function LanguageSwitcher({ locale }: { locale: "fr-BE" | "nl-BE" }) {
  return (
    <form action={setLocaleFromForm} className="inline-flex items-center gap-1 text-xs font-medium">
      <button className={`min-h-11 min-w-11 rounded-md px-2 ${locale === "fr-BE" ? "bg-[var(--brand-accent)] text-white" : "text-muted-foreground"}`} name="locale" value="fr-BE" type="submit">
        FR
      </button>
      <span className="text-muted-foreground">|</span>
      <button className={`min-h-11 min-w-11 rounded-md px-2 ${locale === "nl-BE" ? "bg-[var(--brand-accent)] text-white" : "text-muted-foreground"}`} name="locale" value="nl-BE" type="submit">
        NL
      </button>
    </form>
  );
}
