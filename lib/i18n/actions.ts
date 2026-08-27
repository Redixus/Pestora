"use server";

import { cookies } from "next/headers";
import type { Locale } from "./locale";

export async function setLocale(locale: Locale): Promise<void> {
  if (locale !== "fr-BE" && locale !== "nl-BE") throw new Error("Unsupported locale");
  const cookieStore = await cookies();
  cookieStore.set("interventia-locale", locale, { httpOnly: false, maxAge: 60 * 60 * 24 * 365, path: "/" });
}

export async function setLocaleFromForm(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (locale !== "fr-BE" && locale !== "nl-BE") throw new Error("Unsupported locale");
  await setLocale(locale);
}
