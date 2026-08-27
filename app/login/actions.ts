"use server";

import { redirect } from "next/navigation";
import { getPostAuthPath } from "@/lib/auth/auth";
import { resolveLocale, t, type Locale } from "@/lib/i18n/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = { field: "email" | "password" | "form"; message: string } | null;

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const locale: Locale = await resolveLocale();
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || !email.trim()) return { field: "email", message: t(locale, "auth.emailRequired") };
  if (typeof password !== "string" || !password) return { field: "password", message: t(locale, "auth.passwordRequired") };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { field: "form", message: t(locale, "auth.invalidCredentials") };
  redirect(await getPostAuthPath(supabase, data.user));
}
