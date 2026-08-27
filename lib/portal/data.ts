import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { getCurrentProfile, requirePartner } from "@/lib/auth/auth";
import { resolveBrandFromHost } from "@/lib/brand/resolveBrandFromHost";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/locale";

export type PortalContext = {
  partner: Tables<"partners">;
  profile: Tables<"profiles"> | null;
  brand: Tables<"brands">;
  locale: Locale;
  supabase: SupabaseClient<Database>;
};

export async function getPortalContext(locale: Locale): Promise<PortalContext> {
  const [partner, profile, brand, supabase] = await Promise.all([
    requirePartner(),
    getCurrentProfile(),
    resolveBrandFromHost(),
    createServerSupabaseClient(),
  ]);
  return { partner, profile, brand, locale, supabase };
}

export async function getWallet(supabase: SupabaseClient<Database>, partnerId: string) {
  const { data, error } = await supabase
    .from("partner_wallets")
    .select("partner_id, balance_cents, updated_at")
    .eq("partner_id", partnerId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAvailableLeads(context: PortalContext) {
  const { data: leads, error } = await context.supabase
    .from("leads")
    .select("id, service_id, postal_code, city, description, price_cents, photo_count, extra_data, created_at")
    .eq("brand_id", context.brand.id)
    .eq("status", "available")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!leads.length) return [];

  const serviceIds = [...new Set(leads.map((lead) => lead.service_id))];
  const { data: services, error: servicesError } = await context.supabase
    .from("services")
    .select("id, name_fr, name_nl")
    .in("id", serviceIds);
  if (servicesError) throw servicesError;
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  return leads.map((lead) => ({ ...lead, service: serviceMap.get(lead.service_id) ?? null }));
}

export async function getLead(context: PortalContext, id: string) {
  const { data: lead, error } = await context.supabase
    .from("leads")
    .select("id, brand_id, service_id, postal_code, city, description, price_cents, photo_count, extra_data, created_at")
    .eq("id", id)
    .eq("brand_id", context.brand.id)
    .single();
  if (error) return null;
  const [{ data: service }, { data: contact }, { data: photos }] = await Promise.all([
    context.supabase.from("services").select("id, name_fr, name_nl").eq("id", lead.service_id).maybeSingle(),
    context.supabase.from("lead_contacts").select("name, phone, email, full_address").eq("lead_id", id).maybeSingle(),
    context.supabase.from("lead_photos").select("id, storage_path").eq("lead_id", id),
  ]);
  return { ...lead, service: service ?? null, contact: contact ?? null, photos: photos ?? [] };
}

export async function getPurchasedLeads(context: PortalContext) {
  const { data: purchases, error } = await context.supabase
    .from("lead_purchases")
    .select("id, lead_id, price_paid_cents, purchased_at, refunded_at")
    .eq("partner_id", context.partner.id)
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  if (!purchases.length) return [];

  const leadIds = purchases.map((purchase) => purchase.lead_id);
  const [{ data: leads, error: leadsError }, { data: contacts, error: contactsError }] = await Promise.all([
    context.supabase.from("leads").select("id, service_id, postal_code, city, description, photo_count, created_at").in("id", leadIds),
    context.supabase.from("lead_contacts").select("lead_id, name, phone, email, full_address").in("lead_id", leadIds),
  ]);
  if (leadsError) throw leadsError;
  if (contactsError) throw contactsError;
  const servicesResult = await context.supabase
    .from("services")
    .select("id, name_fr, name_nl")
    .in("id", [...new Set((leads ?? []).map((lead) => lead.service_id))]);
  if (servicesResult.error) throw servicesResult.error;
  const leadMap = new Map((leads ?? []).map((lead) => [lead.id, lead]));
  const contactMap = new Map((contacts ?? []).map((contact) => [contact.lead_id, contact]));
  const serviceMap = new Map(servicesResult.data.map((service) => [service.id, service]));
  return purchases.map((purchase) => {
    const lead = leadMap.get(purchase.lead_id);
    return {
      ...purchase,
      lead,
      contact: contactMap.get(purchase.lead_id) ?? null,
      service: lead ? serviceMap.get(lead.service_id) ?? null : null,
    };
  }).filter((purchase) => purchase.lead);
}

export async function getProfileData(context: PortalContext) {
  const [{ data: memberships, error: membershipsError }, { data: partnerServices, error: servicesError }, { data: postcodes, error: postcodesError }] =
    await Promise.all([
      context.supabase.from("partner_brand_memberships").select("brand_id, active").eq("partner_id", context.partner.id),
      context.supabase.from("partner_services").select("service_id").eq("partner_id", context.partner.id),
      context.supabase.from("partner_postcodes").select("brand_id, postal_code").eq("partner_id", context.partner.id),
    ]);
  if (membershipsError) throw membershipsError;
  if (servicesError) throw servicesError;
  if (postcodesError) throw postcodesError;
  const brandIds = memberships.map((membership) => membership.brand_id);
  const serviceIds = partnerServices.map((service) => service.service_id);
  const [{ data: brands, error: brandsError }, { data: services, error: servicesError2 }] = await Promise.all([
    context.supabase.from("brands").select("id, name, slug").in("id", brandIds),
    context.supabase.from("services").select("id, name_fr, name_nl").in("id", serviceIds),
  ]);
  if (brandsError) throw brandsError;
  if (servicesError2) throw servicesError2;
  return { memberships, services: services ?? [], postcodes, brands: brands ?? [] };
}

export async function getTransactions(context: PortalContext) {
  const { data, error } = await context.supabase
    .from("wallet_transactions")
    .select("id, type, amount_cents, balance_after_cents, reason, created_at")
    .eq("partner_id", context.partner.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
