"use server";

import { redirect } from "next/navigation";
import { getPostAuthPath } from "@/lib/auth/auth";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PasswordState = { message: string } | null;

export async function setPassword(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const locale = await resolveLocale();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof password !== "string" || !password) return { message: t(locale, "auth.passwordRequired") };
  if (password !== confirmPassword) return { message: t(locale, "auth.passwordsDoNotMatch") };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: t(locale, "errors.generic") };
  redirect(await getPostAuthPath(supabase));
}
