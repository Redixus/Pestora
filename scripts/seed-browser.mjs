import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to seed local browser users`);
  return value;
}

const adminCredentials = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin.browser@interventia.local",
  password: requireEnv("SEED_ADMIN_PASSWORD"),
};
const partnerCredentials = {
  email: process.env.SEED_PARTNER_EMAIL ?? "abc.browser@interventia.local",
  password: requireEnv("SEED_PARTNER_PASSWORD"),
};

async function getOrCreateUser(credentials) {
  const listed = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email === credentials.email);
  if (existing) return existing;
  const created = await supabase.auth.admin.createUser({ ...credentials, email_confirm: true });
  if (created.error) throw created.error;
  return created.data.user;
}

async function main() {
  const admin = await getOrCreateUser(adminCredentials);
  const partnerUser = await getOrCreateUser(partnerCredentials);
  if (!admin || !partnerUser) throw new Error("Could not create seed users");

  const profile = await supabase.from("profiles").update({ role: "admin" }).eq("id", admin.id);
  if (profile.error) throw profile.error;

  const brand = await supabase.from("brands").select("id").eq("slug", "pestora").single();
  if (brand.error) throw brand.error;
  const service = await supabase.from("services").select("id").eq("brand_id", brand.data.id).eq("slug", "cockroaches").single();
  if (service.error) throw service.error;

  const existingPartner = await supabase.from("partners").select("id").eq("profile_id", partnerUser.id).maybeSingle();
  if (existingPartner.error) throw existingPartner.error;
  let partnerId = existingPartner.data?.id;
  if (!partnerId) {
    const inserted = await supabase.from("partners").insert({
      profile_id: partnerUser.id,
      company_name: "ABC Pest Control",
      contact_name: "Alex Bertrand",
      email: partnerCredentials.email,
      phone: "+32 470 12 34 56",
      vat_number: "BE0123456789",
      status: "active",
    }).select("id").single();
    if (inserted.error) throw inserted.error;
    partnerId = inserted.data.id;
  }
  for (const operation of [
    supabase.from("partner_brand_memberships").upsert({ partner_id: partnerId, brand_id: brand.data.id, active: true }, { onConflict: "partner_id,brand_id" }),
    supabase.from("partner_services").upsert({ partner_id: partnerId, service_id: service.data.id }, { onConflict: "partner_id,service_id" }),
    supabase.from("partner_postcodes").upsert({ partner_id: partnerId, brand_id: brand.data.id, postal_code: "1000" }, { onConflict: "partner_id,brand_id,postal_code" }),
    supabase.from("partner_wallets").update({ balance_cents: 10000 }).eq("partner_id", partnerId),
  ]) {
    const result = await operation;
    if (result.error) throw result.error;
  }

  const oldLeads = await supabase.from("leads").select("id").eq("source", "browser-seed");
  if (oldLeads.error) throw oldLeads.error;
  if (oldLeads.data.length) {
    const deleted = await supabase.from("leads").delete().in("id", oldLeads.data.map((lead) => lead.id));
    if (deleted.error) throw deleted.error;
  }
  const leadValues = [
    ["1000", "Brussel", "Dringende bestrijding van kakkerlakken in de keuken.", "apartment", 0],
    ["1000", "Brussel", "Kakkerlakken vastgesteld na renovatiewerken.", "townhouse", 15],
    ["1000", "Brussel", "Regelmatige ongediertebestrijding gevraagd.", "house", 35],
  ];
  for (const [postalCode, city, description, propertyType, minutesAgo] of leadValues) {
    const created = await supabase.from("leads").insert({
      brand_id: brand.data.id,
      service_id: service.data.id,
      postal_code: postalCode,
      city,
      description,
      extra_data: { property_type: propertyType },
      price_cents: 2500,
      source: "browser-seed",
      created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    }).select("id").single();
    if (created.error) throw created.error;
    const contact = await supabase.from("lead_contacts").insert({
      lead_id: created.data.id,
      name: "Samira Peeters",
      phone: "+32 471 23 45 67",
      email: "samira.peeters@example.com",
      full_address: "Rue de la Loi 10, 1000 Bruxelles",
      consent_at: new Date().toISOString(),
      privacy_version: "2026-01",
    });
    if (contact.error) throw contact.error;
  }
  console.log(JSON.stringify({ adminEmail: adminCredentials.email, partnerEmail: partnerCredentials.email, partnerId }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
