"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/auth";
import { mapDatabaseError } from "@/lib/i18n/errors";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminActionState = { message: string; code?: string } | null;

export async function adjustWallet(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const locale = await resolveLocale();
  const partnerId = formData.get("partnerId");
  const amount = Number(formData.get("amountCents"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (typeof partnerId !== "string" || !partnerId || !Number.isInteger(amount) || !reason) return { message: !reason ? t(locale, "errors.reasonRequired") : t(locale, "common.invalidInput") };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_adjust_wallet", { p_partner_id: partnerId, p_amount_cents: amount, p_reason: reason });
  if (error) return mapDatabaseError(error, locale) ?? { message: t(locale, "errors.generic") };
  revalidatePath(`/admin/partners/${partnerId}`);
  return { message: t(locale, "admin.adjustmentSuccess") };
}

export async function refundPurchase(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const locale = await resolveLocale();
  const purchaseId = formData.get("purchaseId");
  const reason = String(formData.get("reason") ?? "").trim();
  if (typeof purchaseId !== "string" || !purchaseId || !reason) return { message: !reason ? t(locale, "errors.reasonRequired") : t(locale, "common.invalidInput") };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("refund_purchase", { p_purchase_id: purchaseId, p_reason: reason });
  if (error) return mapDatabaseError(error, locale) ?? { message: t(locale, "errors.generic") };
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${formData.get("leadId")}`);
  return { message: t(locale, "admin.refundSuccess") };
}

export async function setPartnerStatus(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const locale = await resolveLocale();
  const partnerId = formData.get("partnerId");
  const status = formData.get("status");
  if (typeof partnerId !== "string" || !partnerId || (status !== "active" && status !== "suspended")) return { message: t(locale, "common.invalidInput") };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("partners").update({ status }).eq("id", partnerId);
  if (error) return { message: t(locale, "errors.generic") };
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { message: t(locale, "admin.statusSuccess") };
}
