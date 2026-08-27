import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as ingestLead } from "@/app/api/leads/route";
import { POST as createCheckout } from "@/app/api/stripe/checkout/route";
import { POST as stripeWebhook } from "@/app/api/stripe/webhook/route";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const stripe = new Stripe("sk_test_phase4");
const createdLeads: string[] = [];
const createdPartners: string[] = [];
const createdUsers: string[] = [];

async function cleanupFixtures() {
  const errors: unknown[] = [];
  async function attempt(operation: () => PromiseLike<{ error: unknown }>) {
    try {
      const result = await operation();
      if (result.error) errors.push(result.error);
    } catch (error) {
      errors.push(error);
    }
  }
  if (createdPartners.length) {
    await attempt(() => service.from("wallet_transactions").delete().in("partner_id", createdPartners));
    await attempt(() => service.from("lead_purchases").delete().in("partner_id", createdPartners));
    await attempt(() => service.from("partner_wallets").delete().in("partner_id", createdPartners));
    await attempt(() => service.from("partners").delete().in("id", createdPartners));
  }
  if (createdLeads.length) {
    await attempt(() => service.from("lead_purchases").delete().in("lead_id", createdLeads));
    await attempt(() => service.from("lead_contacts").delete().in("lead_id", createdLeads));
    await attempt(() => service.from("lead_photos").delete().in("lead_id", createdLeads));
    await attempt(() => service.from("leads").delete().in("id", createdLeads));
  }
  if (createdUsers.length) {
    await attempt(() => service.from("profiles").delete().in("id", createdUsers));
  }
  for (const userId of createdUsers) {
    await attempt(() => service.auth.admin.deleteUser(userId));
  }
  if (errors.length) throw new AggregateError(errors, "Fixture cleanup failed");
}

type UserFixture = { client: SupabaseClient; partnerId: string; userId: string };

async function createUserPartner(
  brandId: string,
  serviceId: string,
  postalCode: string,
): Promise<UserFixture> {
  const email = `phase4-${randomUUID()}@example.com`;
  const password = "Test-password-123!";
  const { data: userData, error: userError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userData.user) throw userError ?? new Error("User was not created");
  createdUsers.push(userData.user.id);

  const { data: partner, error: partnerError } = await service
    .from("partners")
    .insert({
      profile_id: userData.user.id,
      company_name: `Phase 4 ${randomUUID().slice(0, 8)}`,
      contact_name: "Phase 4 Tester",
      email,
      status: "active",
    })
    .select("id")
    .single();
  if (partnerError || !partner) throw partnerError ?? new Error("Partner was not created");
  createdPartners.push(partner.id);

  const { error: membershipError } = await service
    .from("partner_brand_memberships")
    .insert({ partner_id: partner.id, brand_id: brandId });
  if (membershipError) throw membershipError;
  const { error: serviceError } = await service
    .from("partner_services")
    .insert({ partner_id: partner.id, service_id: serviceId });
  if (serviceError) throw serviceError;
  const { error: postcodeError } = await service
    .from("partner_postcodes")
    .insert({ partner_id: partner.id, brand_id: brandId, postal_code: postalCode });
  if (postcodeError) throw postcodeError;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, partnerId: partner.id, userId: userData.user.id };
}

async function callIngestion(payload: unknown, secret = "pestora-test-secret") {
  return ingestLead(new Request("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-interventia-secret": secret },
    body: JSON.stringify(payload),
  }));
}

function leadPayload(overrides: Record<string, unknown> = {}) {
  return {
    brand: "pestora",
    service: "cockroaches",
    postal_code: "1000",
    city: "Brussels",
    description: "A kitchen needs treatment.",
    name: "Camille Dupont",
    phone: "+32470123456",
    email: "camille@example.com",
    full_address: "Rue de Test 1, 1000 Brussels",
    photos: ["https://example.com/photo.jpg", "data:image/png;base64,AAAA"],
    extra_data: { property_type: "house" },
    consent_at: "2026-08-27T12:00:00.000Z",
    privacy_version: "2026-01",
    ...overrides,
  };
}

describe("lead ingestion API", () => {
  let pestoraId: string;
  let cockroachesId: string;
  let eligible: UserFixture;
  let ineligible: UserFixture;

  beforeAll(async () => {
    process.env.PESTORA_INGESTION_SECRET = "pestora-test-secret";
    process.env.DRENORA_INGESTION_SECRET = "drenora-test-secret";
    process.env.MOVIRA_INGESTION_SECRET = "movira-test-secret";
    const { data: brand, error: brandError } = await service.from("brands").select("id").eq("slug", "pestora").single();
    if (brandError) throw brandError;
    pestoraId = brand.id;
    const { data: serviceRecord, error: serviceError } = await service
      .from("services")
      .select("id")
      .eq("brand_id", pestoraId)
      .eq("slug", "cockroaches")
      .single();
    if (serviceError) throw serviceError;
    cockroachesId = serviceRecord.id;
    eligible = await createUserPartner(pestoraId, cockroachesId, "1000");
    ineligible = await createUserPartner(pestoraId, cockroachesId, "2000");
  });

  it("creates a lead and contact with server-side pricing", async () => {
    const response = await callIngestion(leadPayload());
    expect(response.status).toBe(201);
    const result = await response.json() as { id: string; price_cents: number; status: string };
    expect(result).toMatchObject({ price_cents: 2500, status: "available" });
    createdLeads.push(result.id);

    const { data: lead } = await service.from("leads").select("brand_id, service_id, postal_code, photo_count, price_cents").eq("id", result.id).single();
    const { data: contact } = await service.from("lead_contacts").select("name, phone, email").eq("lead_id", result.id).single();
    expect(lead).toMatchObject({ brand_id: pestoraId, service_id: cockroachesId, postal_code: "1000", photo_count: 2, price_cents: 2500 });
    expect(contact).toMatchObject({ name: "Camille Dupont", phone: "+32470123456", email: "camille@example.com" });
    expect(Object.keys(result).sort()).toEqual(["id", "price_cents", "status"]);
  });

  it("rejects a wrong secret and a secret from another brand", async () => {
    expect((await callIngestion(leadPayload(), "wrong-secret")).status).toBe(401);
    expect((await callIngestion(leadPayload({ brand: "drenora", service: "unblocking" }))).status).toBe(401);
    expect((await callIngestion(leadPayload({ brand: "unknown-brand" }))).status).toBe(401);
  });

  it("rejects unknown services and protected fields", async () => {
    const unknown = await callIngestion(leadPayload({ service: "not-a-service" }));
    expect(unknown.status).toBe(404);
    expect((await callIngestion(leadPayload({ price_cents: 1 }))).status).toBe(400);
    expect((await callIngestion(leadPayload({ status: "sold" }))).status).toBe(400);
    expect((await callIngestion(leadPayload({ partner_id: randomUUID() }))).status).toBe(400);
  });

  it("rejects malformed postal codes and missing required PII", async () => {
    const postal = await callIngestion(leadPayload({ postal_code: "12345" }));
    expect(postal.status).toBe(400);
    const missingName = await callIngestion(leadPayload({ name: "" }));
    expect(missingName.status).toBe(400);
  });

  it("keeps ingested leads behind the same eligibility RLS rules", async () => {
    const response = await callIngestion(leadPayload({ city: "Antwerp" }));
    const result = await response.json() as { id: string };
    expect(response.status).toBe(201);
    createdLeads.push(result.id);
    const { data: visible } = await eligible.client.from("leads").select("id").eq("id", result.id);
    const { data: hidden } = await ineligible.client.from("leads").select("id").eq("id", result.id);
    expect(visible).toEqual([{ id: result.id }]);
    expect(hidden).toEqual([]);
  });
});

describe("Stripe checkout and webhook", () => {
  let partnerId: string;
  let beforeBalance: number;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_phase4";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_phase4";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000";
    const { data: partner, error } = await service.from("partners").insert({
      company_name: "Phase 4 Stripe Tester",
      contact_name: "Phase 4 Tester",
      email: `stripe-${randomUUID()}@example.com`,
      status: "active",
    }).select("id").single();
    if (error || !partner) throw error ?? new Error("Stripe partner was not created");
    partnerId = partner.id;
    createdPartners.push(partner.id);
    const { data: wallet, error: walletError } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", partnerId).single();
    if (walletError) throw walletError;
    beforeBalance = wallet.balance_cents;
  });

  function eventPayload(eventId: string, type = "checkout.session.completed") {
    return JSON.stringify({
      id: eventId,
      object: "event",
      api_version: "2025-03-31.basil",
      created: 1_724_761_200,
      data: {
        object: {
          id: `cs_${eventId}`,
          object: "checkout.session",
          amount_total: 10_000,
          currency: "eur",
          metadata: { partner_id: partnerId, amount_cents: "10000" },
          mode: "payment",
          payment_status: "paid",
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type,
    });
  }

  async function signedWebhook(payload: string, secret = "whsec_phase4") {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return stripeWebhook(new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature, "content-type": "application/json" },
      body: payload,
    }));
  }

  it("rejects arbitrary checkout amounts", async () => {
    const response = await createCheckout(new Request("http://localhost/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: 12_345 }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "INVALID_TOP_UP_AMOUNT" });
  });

  it("credits a valid signed checkout exactly once", async () => {
    const eventId = `evt_${randomUUID()}`;
    const payload = eventPayload(eventId);
    const first = await signedWebhook(payload);
    const second = await signedWebhook(payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const { data: wallet } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", partnerId).single();
    expect(wallet?.balance_cents).toBe(beforeBalance + 10_000);
    const { data: transactions } = await service.from("wallet_transactions").select("type, amount_cents").eq("partner_id", partnerId).eq("stripe_event_id", eventId);
    expect(transactions).toEqual([{ type: "top_up", amount_cents: 10_000 }]);
  });

  it("rejects tampered signatures without crediting", async () => {
    const eventId = `evt_${randomUUID()}`;
    const response = await signedWebhook(eventPayload(eventId), "wrong-secret");
    expect(response.status).toBe(400);
    const { data: wallet } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", partnerId).single();
    expect(wallet?.balance_cents).toBe(beforeBalance + 10_000);
  });

  it("acknowledges unrelated signed events without moving the wallet", async () => {
    const response = await signedWebhook(eventPayload(`evt_${randomUUID()}`, "payment_intent.succeeded"));
    expect(response.status).toBe(200);
    const { data: wallet } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", partnerId).single();
    expect(wallet?.balance_cents).toBe(beforeBalance + 10_000);
  });

  it("ignores signed unpaid checkout events without moving the wallet", async () => {
    const payload = eventPayload(`evt_${randomUUID()}`).replace('"payment_status":"paid"', '"payment_status":"unpaid"');
    const response = await signedWebhook(payload);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, ignored: "payment_not_paid" });
    const { data: wallet } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", partnerId).single();
    expect(wallet?.balance_cents).toBe(beforeBalance + 10_000);
  });
});

afterAll(async () => {
  await cleanupFixtures();
  const residueChecks = [
    createdLeads.length
      ? service.from("leads").select("id").in("id", createdLeads)
      : null,
    createdLeads.length
      ? service.from("lead_contacts").select("lead_id").in("lead_id", createdLeads)
      : null,
    createdLeads.length
      ? service.from("lead_photos").select("id").in("lead_id", createdLeads)
      : null,
    createdLeads.length
      ? service.from("lead_purchases").select("id").in("lead_id", createdLeads)
      : null,
    createdPartners.length
      ? service.from("partners").select("id").in("id", createdPartners)
      : null,
    createdPartners.length
      ? service.from("profiles").select("id").in("id", createdUsers)
      : null,
    createdPartners.length
      ? service.from("partner_wallets").select("partner_id").in("partner_id", createdPartners)
      : null,
    createdPartners.length
      ? service.from("wallet_transactions").select("id").in("partner_id", createdPartners)
      : null,
  ].filter((query): query is NonNullable<typeof query> => query !== null);
  for (const query of residueChecks) {
    const { data, error: residueError } = await query;
    if (residueError) throw residueError;
    expect(data).toEqual([]);
  }
  const { data: residue, error } = await service
    .from("partners")
    .select("id")
    .like("company_name", "Phase 4%");
  if (error) throw error;
  expect(residue).toEqual([]);
  const { data: users, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;
  expect(users.users.filter((user) => user.email?.startsWith("phase4-") || user.email?.startsWith("stripe-"))).toEqual([]);
});
