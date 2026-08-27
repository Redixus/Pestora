"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { frBE } from "@/lib/i18n/locales/fr-BE";
import { nlBE } from "@/lib/i18n/locales/nl-BE";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useSyncExternalStore(
    () => () => undefined,
    () => document.cookie.includes("interventia-locale=nl-BE") ? "nl-BE" : "fr-BE",
    () => "fr-BE",
  );
  const dictionary = locale === "fr-BE" ? frBE : nlBE;
  return <main className="mx-auto max-w-md space-y-4 py-12"><h1 className="text-xl font-semibold">{dictionary.errors.generic}</h1><Button type="button" onClick={reset}>{dictionary.common.retry}</Button></main>;
}
