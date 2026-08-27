import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Profile = Tables<"profiles">;
export type Partner = Tables<"partners">;

export async function getPostAuthPath(
  supabase: SupabaseClient<Database>,
  user?: User | null,
): Promise<string> {
  const currentUser = user ?? (await supabase.auth.getUser()).data.user;
  if (!currentUser) return "/login";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role === "admin") return "/admin";

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("id")
    .eq("profile_id", currentUser.id)
    .maybeSingle();
  if (partnerError) throw partnerError;
  return partner ? "/leads" : "/account-unavailable";
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  return data.user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrentPartner(): Promise<Partner | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/access-denied");
  return profile;
}

export async function requirePartner(): Promise<Partner> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const partner = await getCurrentPartner();
  if (!partner) redirect("/account-unavailable");
  if (partner.status !== "active") redirect("/account-suspended");
  return partner;
}
