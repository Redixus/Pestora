import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { requireAdmin } from "@/lib/auth/auth";
import { resolveLocale, type Locale } from "@/lib/i18n/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminContext = {
  profile: Tables<"profiles">;
  supabase: SupabaseClient<Database>;
  locale: Locale;
};

export async function getAdminContext(): Promise<AdminContext> {
  const [profile, supabase, locale] = await Promise.all([
    requireAdmin(),
    createServerSupabaseClient(),
    resolveLocale(),
  ]);
  return { profile, supabase, locale };
}

export async function getAdminDashboardData(supabase: SupabaseClient<Database>) {
  const [{ data: leads, error: leadsError }, { data: purchases, error: purchasesError }, { data: partners, error: partnersError }, { data: wallets, error: walletsError }, { data: services, error: servicesError }] =
    await Promise.all([
      supabase.from("leads").select("id, status, price_cents"),
      supabase.from("lead_purchases").select("id, price_paid_cents, purchased_at"),
      supabase.from("partners").select("id, status"),
      supabase.from("partner_wallets").select("partner_id, balance_cents"),
      supabase.from("services").select("default_price_cents").eq("active", true),
    ]);
  if (leadsError) throw leadsError;
  if (purchasesError) throw purchasesError;
  if (partnersError) throw partnersError;
  if (walletsError) throw walletsError;
  if (servicesError) throw servicesError;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const cheapest = Math.min(...services.map((service) => service.default_price_cents), Number.MAX_SAFE_INTEGER);
  return {
    availableLeads: leads.filter((lead) => lead.status === "available").length,
    soldToday: purchases.filter((purchase) => now - new Date(purchase.purchased_at).getTime() < day).length,
    soldWeek: purchases.filter((purchase) => now - new Date(purchase.purchased_at).getTime() < 7 * day).length,
    grossRevenueCents: purchases.reduce((sum, purchase) => sum + purchase.price_paid_cents, 0),
    activePartners: partners.filter((partner) => partner.status === "active").length,
    suspendedPartners: partners.filter((partner) => partner.status === "suspended").length,
    lowBalancePartners: wallets.filter((wallet) => wallet.balance_cents < cheapest).length,
  };
}

export async function getAdminLeads(
  supabase: SupabaseClient<Database>,
  filters: { brand?: string; status?: string; service?: string; postalCode?: string; page?: number },
) {
  const [{ data: brands, error: brandsError }, { data: services, error: servicesError }] = await Promise.all([
    supabase.from("brands").select("id, name, slug").order("name"),
    supabase.from("services").select("id, brand_id, name_fr, name_nl, slug").order("name_fr"),
  ]);
  if (brandsError) throw brandsError;
  if (servicesError) throw servicesError;
  let query = supabase.from("leads").select("id, brand_id, service_id, postal_code, city, description, price_cents, status, photo_count, extra_data, created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (filters.brand) query = query.eq("brand_id", filters.brand);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.service) query = query.eq("service_id", filters.service);
  if (filters.postalCode) query = query.eq("postal_code", filters.postalCode);
  const page = Math.max(filters.page ?? 1, 1);
  const { data: leads, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
  if (error) throw error;
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  return { leads: leads.map((lead) => ({ ...lead, brand: brandMap.get(lead.brand_id), service: serviceMap.get(lead.service_id) })), brands, services, count: count ?? 0, page };
}

export async function getAdminLead(supabase: SupabaseClient<Database>, id: string) {
  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error || !lead) return null;
  const [{ data: brand }, { data: service }, { data: contact }, { data: purchase }] = await Promise.all([
    supabase.from("brands").select("id, name, slug").eq("id", lead.brand_id).maybeSingle(),
    supabase.from("services").select("id, name_fr, name_nl, slug").eq("id", lead.service_id).maybeSingle(),
    supabase.from("lead_contacts").select("*").eq("lead_id", id).maybeSingle(),
    supabase.from("lead_purchases").select("*").eq("lead_id", id).maybeSingle(),
  ]);
  let buyer = null;
  if (purchase) {
    const result = await supabase.from("partners").select("id, company_name, contact_name, email, status").eq("id", purchase.partner_id).maybeSingle();
    buyer = result.data;
  }
  return { lead, brand, service, contact, purchase, buyer };
}

export async function getAdminPartners(supabase: SupabaseClient<Database>) {
  const [{ data: partners, error }, { data: memberships, error: membershipsError }, { data: wallets, error: walletsError }, { data: brands, error: brandsError }] = await Promise.all([
    supabase.from("partners").select("id, company_name, contact_name, email, status, phone, vat_number").order("company_name"),
    supabase.from("partner_brand_memberships").select("partner_id, brand_id, active"),
    supabase.from("partner_wallets").select("partner_id, balance_cents"),
    supabase.from("brands").select("id, name"),
  ]);
  if (error) throw error;
  if (membershipsError) throw membershipsError;
  if (walletsError) throw walletsError;
  if (brandsError) throw brandsError;
  const brandMap = new Map(brands.map((brand) => [brand.id, brand.name]));
  const walletMap = new Map(wallets.map((wallet) => [wallet.partner_id, wallet.balance_cents]));
  return partners.map((partner) => ({
    ...partner,
    balance_cents: walletMap.get(partner.id) ?? 0,
    brands: memberships.filter((membership) => membership.partner_id === partner.id && membership.active).map((membership) => brandMap.get(membership.brand_id)).filter((name): name is string => Boolean(name)),
  }));
}

export async function getAdminPartner(supabase: SupabaseClient<Database>, id: string) {
  const { data: partner, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
  if (error || !partner) return null;
  const [{ data: memberships }, { data: services }, { data: postcodes }, { data: wallet }, { data: transactions }, { data: purchases }, { data: brands }, { data: allServices }] = await Promise.all([
    supabase.from("partner_brand_memberships").select("brand_id, active").eq("partner_id", id),
    supabase.from("partner_services").select("service_id").eq("partner_id", id),
    supabase.from("partner_postcodes").select("brand_id, postal_code").eq("partner_id", id),
    supabase.from("partner_wallets").select("balance_cents, updated_at").eq("partner_id", id).maybeSingle(),
    supabase.from("wallet_transactions").select("id, type, amount_cents, balance_after_cents, reason, created_at").eq("partner_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("lead_purchases").select("id, lead_id, price_paid_cents, purchased_at, refunded_at, refund_reason").eq("partner_id", id).order("purchased_at", { ascending: false }).limit(20),
    supabase.from("brands").select("id, name"),
    supabase.from("services").select("id, name_fr, name_nl"),
  ]);
  const brandMap = new Map((brands ?? []).map((brand) => [brand.id, brand]));
  const serviceMap = new Map((allServices ?? []).map((service) => [service.id, service]));
  const purchaseLeadIds = (purchases ?? []).map((purchase) => purchase.lead_id);
  const { data: purchaseLeads, error: purchaseLeadsError } = purchaseLeadIds.length
    ? await supabase.from("leads").select("id, service_id, city, postal_code").in("id", purchaseLeadIds)
    : { data: [], error: null };
  if (purchaseLeadsError) throw purchaseLeadsError;
  const leadMap = new Map((purchaseLeads ?? []).map((lead) => [lead.id, lead]));
  return {
    partner,
    wallet,
    memberships: (memberships ?? []).map((membership) => ({ ...membership, brand: brandMap.get(membership.brand_id) })),
    services: (services ?? []).map((item) => ({ ...item, service: serviceMap.get(item.service_id) })),
    postcodes: postcodes ?? [],
    transactions: transactions ?? [],
    purchases: (purchases ?? []).map((purchase) => {
      const lead = leadMap.get(purchase.lead_id);
      return { ...purchase, lead, service: lead ? serviceMap.get(lead.service_id) : undefined };
    }),
  };
}
