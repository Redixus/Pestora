"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePartner } from "@/lib/auth/auth";
import { mapDatabaseError } from "@/lib/i18n/errors";
import { formatMoney } from "@/lib/money/formatMoney";
import { resolveLocale, t } from "@/lib/i18n/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWallet } from "./data";

export type PurchaseState = { message: string; code?: string } | null;

export async function purchaseLead(_previous: PurchaseState, formData: FormData): Promise<PurchaseState> {
  const leadId = formData.get("leadId");
  const locale = await resolveLocale();
  if (typeof leadId !== "string" || !leadId) return { message: t(locale, "common.invalidInput") };
  const partner = await requirePartner();
  const supabase = await createServerSupabaseClient();
  const { data: lead } = await supabase.from("leads").select("price_cents").eq("id", leadId).maybeSingle();
  const wallet = await getWallet(supabase, partner.id);
  const result = await supabase.rpc("purchase_lead", { p_lead_id: leadId });
  if (result.error) {
    if (result.error.code === "P0001") revalidatePath("/leads");
    const mapped = mapDatabaseError(result.error, locale, { priceCents: lead?.price_cents, balanceCents: wallet.balance_cents });
    return mapped ?? { message: t(locale, "errors.generic") };
  }
  redirect(`/my-leads/${leadId}`);
}

export type TopUpState = { message: string } | null;

export async function requestTopUp(_previous: TopUpState, formData: FormData): Promise<TopUpState> {
  const locale = await resolveLocale();
  const amount = Number(formData.get("amountCents"));
  if (![10_000, 25_000, 50_000].includes(amount)) return { message: t(locale, "errors.generic") };
  return { message: t(locale, "wallet.topUpPending", { amount: formatMoney(amount, locale) }) };
}
