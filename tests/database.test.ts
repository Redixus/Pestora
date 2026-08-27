import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client as PgClient } from "pg";
import WebSocket from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const databaseUrl = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const createdLeadIds: string[] = [];

type UserClient = SupabaseClient;
const realtimeTransport = WebSocket as unknown as import("@supabase/realtime-js").WebSocketLikeConstructor;

type Fixture = {
  admin: UserClient;
  partners: Record<string, UserClient>;
  partnerIds: Record<string, string>;
  partnerUserIds: string[];
  partnerDatabaseIds: string[];
  runners: Array<{ client: UserClient; partnerId: string; userId: string }>;
  adminUserId: string;
  brands: Record<string, string>;
  services: Record<string, string>;
  leads: Record<string, string>;
};

const adminClient = () =>
  createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    realtime: { transport: realtimeTransport },
  });

async function createUserClient(
  service: SupabaseClient,
  role: "admin" | "partner" = "partner",
): Promise<{ client: UserClient; userId: string }> {
  const email = `${role}-${randomUUID()}@example.com`;
  const password = "Test-password-123!";
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("User was not created");
  if (role === "admin") {
    const { error: profileError } = await service
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (profileError) throw profileError;
  }
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: realtimeTransport },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, userId: data.user.id };
}

async function createPartner(
  service: SupabaseClient,
  brandId: string,
  serviceId: string,
  userClient: UserClient,
  userId: string,
  options: { status?: "active" | "suspended"; postalCode?: string; balance?: number },
) {
  const { data: partner, error: partnerError } = await service
    .from("partners")
    .insert({
      profile_id: userId,
      company_name: `Company ${userId.slice(0, 8)}`,
      contact_name: "Test Partner",
      email: `${userId}@example.com`,
      status: options.status ?? "active",
    })
    .select("id")
    .single();
  if (partnerError || !partner) throw partnerError ?? new Error("Partner was not created");

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
    .insert({ partner_id: partner.id, brand_id: brandId, postal_code: options.postalCode ?? "1000" });
  if (postcodeError) throw postcodeError;
  const { error: walletError } = await service
    .from("partner_wallets")
    .update({ balance_cents: options.balance ?? 10_000 })
    .eq("partner_id", partner.id);
  if (walletError) throw walletError;

  return { id: partner.id, client: userClient };
}

async function createLead(
  service: SupabaseClient,
  brandId: string,
  serviceId: string,
  options: { postalCode?: string; priceCents?: number } = {},
) {
  const { data: lead, error: leadError } = await service
    .from("leads")
    .insert({
      brand_id: brandId,
      service_id: serviceId,
      postal_code: options.postalCode ?? "1000",
      city: "Brussels",
      description: "Fixture lead",
      price_cents: options.priceCents ?? 2_500,
      source: "test",
    })
    .select("id")
    .single();
  if (leadError || !lead) throw leadError ?? new Error("Lead was not created");
  const { error: contactError } = await service.from("lead_contacts").insert({
    lead_id: lead.id,
    name: "Customer Name",
    phone: "+3212345678",
    email: "customer@example.com",
    full_address: "Rue de Test 1, 1000 Brussels",
    consent_at: new Date().toISOString(),
    privacy_version: "v1",
  });
  if (contactError) throw contactError;
  createdLeadIds.push(lead.id);
  return lead.id as string;
}

describe("lead engine database", () => {
  let fixture: Fixture;
  let service: SupabaseClient;

  beforeAll(async () => {
    service = adminClient();
    const { data: brands, error: brandsError } = await service
      .from("brands")
      .select("id, slug")
      .in("slug", ["pestora", "drenora"]);
    if (brandsError || !brands || brands.length !== 2) throw brandsError ?? new Error("Brands missing");
    const brandBySlug = Object.fromEntries(brands.map((brand) => [brand.slug, brand.id]));

    const { data: services, error: servicesError } = await service
      .from("services")
      .select("id, slug, brand_id")
      .in("slug", ["cockroaches", "unblocking"]);
    if (servicesError || !services || services.length !== 2) {
      throw servicesError ?? new Error("Services missing");
    }
    const cockroaches = services.find((item) => item.slug === "cockroaches");
    const unblocking = services.find((item) => item.slug === "unblocking");
    if (!cockroaches || !unblocking) throw new Error("Fixture services missing");

    const admin = await createUserClient(service, "admin");
    const partnerUsers = await Promise.all(
      ["a", "b", "c", "d", "e", "f", "g"].map(() => createUserClient(service)),
    );
    const partnerA = await createPartner(
      service,
      brandBySlug.pestora,
      cockroaches.id,
      partnerUsers[0].client,
      partnerUsers[0].userId,
      { balance: 1_000 },
    );
    const partnerB = await createPartner(
      service,
      brandBySlug.pestora,
      cockroaches.id,
      partnerUsers[1].client,
      partnerUsers[1].userId,
      { balance: 10_000 },
    );
    const partnerC = await createPartner(
      service,
      brandBySlug.pestora,
      cockroaches.id,
      partnerUsers[2].client,
      partnerUsers[2].userId,
      { status: "suspended", balance: 10_000 },
    );
    const partnerD = await createPartner(
      service,
      brandBySlug.pestora,
      cockroaches.id,
      partnerUsers[3].client,
      partnerUsers[3].userId,
      { postalCode: "2000", balance: 10_000 },
    );
    const partnerE = await createPartner(
      service,
      brandBySlug.pestora,
      unblocking.id,
      partnerUsers[4].client,
      partnerUsers[4].userId,
      { balance: 10_000 },
    );
    const partnerF = await createPartner(
      service,
      brandBySlug.drenora,
      cockroaches.id,
      partnerUsers[5].client,
      partnerUsers[5].userId,
      { balance: 10_000 },
    );
    const partnerG = await createPartner(
      service,
      brandBySlug.pestora,
      cockroaches.id,
      partnerUsers[6].client,
      partnerUsers[6].userId,
      { balance: 10_000 },
    );
    const runnerUsers = await Promise.all(
      Array.from({ length: 8 }, () => createUserClient(service)),
    );
    const runners = await Promise.all(
      runnerUsers.map((user) =>
        createPartner(
          service,
          brandBySlug.pestora,
          cockroaches.id,
          user.client,
          user.userId,
          { balance: 10_000 },
        ).then((partner) => ({ client: partner.client, partnerId: partner.id, userId: user.userId })),
      ),
    );

    fixture = {
      admin: admin.client,
      partners: {
        a: partnerA.client,
        b: partnerB.client,
        c: partnerC.client,
        d: partnerD.client,
        e: partnerE.client,
        f: partnerF.client,
        g: partnerG.client,
      },
      partnerIds: {
        a: partnerA.id,
        b: partnerB.id,
        c: partnerC.id,
        d: partnerD.id,
        e: partnerE.id,
        f: partnerF.id,
        g: partnerG.id,
      },
      partnerUserIds: [...partnerUsers.map((user) => user.userId), ...runnerUsers.map((user) => user.userId)],
      partnerDatabaseIds: [
        partnerA.id,
        partnerB.id,
        partnerC.id,
        partnerD.id,
        partnerE.id,
        partnerF.id,
        partnerG.id,
        ...runners.map((runner) => runner.partnerId),
      ],
      runners,
      adminUserId: admin.userId,
      brands: brandBySlug,
      services: { cockroaches: cockroaches.id, unblocking: unblocking.id },
      leads: {},
    };
  });

  afterAll(async () => {
    if (!service || !fixture) return;
    if (createdLeadIds.length > 0) {
      await service.from("wallet_transactions").delete().in("lead_id", createdLeadIds);
      await service.from("lead_purchases").delete().in("lead_id", createdLeadIds);
      await service.from("leads").delete().in("id", createdLeadIds);
    }
    await service.from("partners").delete().in("id", fixture.partnerDatabaseIds);
    await Promise.all([
      ...fixture.partnerUserIds,
      fixture.adminUserId,
    ].map((userId) => service.auth.admin.deleteUser(userId)));
    await service.removeAllChannels();
  });

  it("purchases normally, debits cents, and reveals contact PII", async () => {
    const leadId = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const { data: purchase, error } = await fixture.partners.b.rpc("purchase_lead", { p_lead_id: leadId });
    expect(error).toBeNull();
    expect(purchase).toMatchObject({ lead_id: leadId, price_paid_cents: 2_500 });

    const { data: wallet } = await fixture.partners.b
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.b)
      .single();
    expect(wallet?.balance_cents).toBe(7_500);
    const { data: contact } = await fixture.partners.b
      .from("lead_contacts")
      .select("phone")
      .eq("lead_id", leadId)
      .single();
    expect(contact?.phone).toBe("+3212345678");
    fixture.leads.normal = leadId;
  });

  it("rejects insufficient balance without changing any rows", async () => {
    const leadId = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const { error } = await fixture.partners.a.rpc("purchase_lead", { p_lead_id: leadId });
    expect(error?.code).toBe("P0002");
    expect(error?.message).toContain("INSUFFICIENT_BALANCE");
    const { data: purchase } = await service
      .from("lead_purchases")
      .select("id")
      .eq("lead_id", leadId);
    expect(purchase).toHaveLength(0);
    const { data: wallet } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    expect(wallet?.balance_cents).toBe(1_000);
  });

  it("rejects sold, suspended, and ineligible leads with stable errors", async () => {
    const soldLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    expect((await fixture.partners.b.rpc("purchase_lead", { p_lead_id: soldLead })).error).toBeNull();
    const soldAttempt = await fixture.partners.g.rpc("purchase_lead", { p_lead_id: soldLead });
    expect(soldAttempt.error?.code).toBe("P0001");
    const noPartnerAttempt = await fixture.admin.rpc("purchase_lead", { p_lead_id: soldLead });
    expect(noPartnerAttempt.error?.code).toBe("P0003");

    const suspendedLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const suspendedAttempt = await fixture.partners.c.rpc("purchase_lead", { p_lead_id: suspendedLead });
    expect(suspendedAttempt.error?.code).toBe("P0004");

    const postalLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    expect((await fixture.partners.d.rpc("purchase_lead", { p_lead_id: postalLead })).error?.code).toBe("P0003");
    const serviceLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    expect((await fixture.partners.e.rpc("purchase_lead", { p_lead_id: serviceLead })).error?.code).toBe("P0003");
    const brandLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    expect((await fixture.partners.f.rpc("purchase_lead", { p_lead_id: brandLead })).error?.code).toBe("P0003");
  });

  it("settles concurrent eligible purchases exactly once", async () => {
    const leadId = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const balances = new Map<string, number>();
    for (const runner of fixture.runners) {
      const { data: wallet } = await service
        .from("partner_wallets")
        .select("balance_cents")
        .eq("partner_id", runner.partnerId)
        .single();
      balances.set(runner.partnerId, wallet?.balance_cents ?? 0);
    }
    const results = await Promise.all(
      fixture.runners.map((runner) => runner.client.rpc("purchase_lead", { p_lead_id: leadId })),
    );
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(results.filter((result) => result.error?.code === "P0001")).toHaveLength(7);

    const { data: purchases } = await service
      .from("lead_purchases")
      .select("partner_id")
      .eq("lead_id", leadId);
    expect(purchases).toHaveLength(1);
    const winner = purchases?.[0]?.partner_id;
    expect(winner).toBeDefined();
    const { data: lead } = await service.from("leads").select("status").eq("id", leadId).single();
    expect(lead?.status).toBe("sold");
    const { data: transactions } = await service
      .from("wallet_transactions")
      .select("id, partner_id, type, amount_cents")
      .eq("lead_id", leadId)
      .eq("type", "lead_purchase");
    expect(transactions).toHaveLength(1);
    expect(transactions?.[0]?.partner_id).toBe(winner);
    expect(transactions?.[0]?.amount_cents).toBe(-2_500);
    for (const runner of fixture.runners) {
      const { data: wallet } = await service
        .from("partner_wallets")
        .select("balance_cents")
        .eq("partner_id", runner.partnerId)
        .single();
      if (runner.partnerId === winner) {
        expect(wallet?.balance_cents).toBe((balances.get(runner.partnerId) ?? 0) - 2_500);
      } else {
        expect(wallet?.balance_cents).toBe(balances.get(runner.partnerId));
        const { data: loserContact } = await runner.client
          .from("lead_contacts")
          .select("phone")
          .eq("lead_id", leadId);
        expect(loserContact).toEqual([]);
      }
    }
  });

  it("blocks a raw PostgreSQL purchase behind the lead row lock", async () => {
    const leadId = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const first = new PgClient({ connectionString: databaseUrl });
    const second = new PgClient({ connectionString: databaseUrl });
    await first.connect();
    await second.connect();
    try {
      await first.query("begin");
      await first.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: fixture.runners[0].userId, role: "authenticated" }),
      ]);
      await first.query("select * from public.leads where id = $1 for update", [leadId]);

      await second.query("begin");
      await second.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: fixture.runners[1].userId, role: "authenticated" }),
      ]);
      let settled = false;
      const purchase = second
        .query("select public.purchase_lead($1)", [leadId])
        .then(() => {
          settled = true;
          return null;
        })
        .catch((error: unknown) => {
          settled = true;
          return error;
        });
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(settled).toBe(false);

      await first.query("update public.leads set status = 'sold' where id = $1", [leadId]);
      await first.query("commit");
      const error = await purchase;
      expect(error).toMatchObject({ code: "P0001" });
      const pgError = error as { message?: string };
      expect(pgError.message).toContain("LEAD_NOT_AVAILABLE");
      await second.query("rollback");

      const { data: purchases } = await service
        .from("lead_purchases")
        .select("id")
        .eq("lead_id", leadId);
      expect(purchases).toEqual([]);
      const { data: transactions } = await service
        .from("wallet_transactions")
        .select("id")
        .eq("lead_id", leadId);
      expect(transactions).toEqual([]);
    } finally {
      await first.query("rollback").catch(() => undefined);
      await second.query("rollback").catch(() => undefined);
      await first.end();
      await second.end();
    }
  });

  it("rejects admin wallet functions for partners and validates adjustment reasons", async () => {
    const { data: before } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    const refund = await fixture.partners.a.rpc("refund_purchase", {
      p_purchase_id: randomUUID(),
      p_reason: "Unauthorized",
    });
    const adjustment = await fixture.partners.a.rpc("admin_adjust_wallet", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 100,
      p_reason: "Unauthorized",
    });
    const stripe = await fixture.partners.a.rpc("credit_wallet_from_stripe", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 100,
      p_stripe_event_id: `evt_${randomUUID()}`,
    });
    expect(refund.error?.code).toBe("A0001");
    expect(adjustment.error?.code).toBe("A0001");
    expect(stripe.error?.code).toBe("A0001");
    const { data: after } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    expect(after?.balance_cents).toBe(before?.balance_cents);

    const emptyReason = await fixture.admin.rpc("admin_adjust_wallet", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 100,
      p_reason: "   ",
    });
    expect(emptyReason.error?.code).toBe("A0002");

    const reason = `Manual test ${randomUUID()}`;
    const successful = await fixture.admin.rpc("admin_adjust_wallet", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 100,
      p_reason: reason,
    });
    expect(successful.error).toBeNull();
    const { data: ledger } = await service
      .from("wallet_transactions")
      .select("type, amount_cents, reason")
      .eq("partner_id", fixture.partnerIds.a)
      .eq("type", "manual_adjustment")
      .eq("reason", reason)
      .single();
    expect(ledger).toMatchObject({ type: "manual_adjustment", amount_cents: 100, reason });
  });

  it("refunds exactly once and credits the wallet once", async () => {
    const leadId = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const { data: purchase, error: purchaseError } = await fixture.partners.b.rpc("purchase_lead", {
      p_lead_id: leadId,
    });
    expect(purchaseError).toBeNull();
    const { data: beforeRefund } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.b)
      .single();
    const first = await fixture.admin.rpc("refund_purchase", {
      p_purchase_id: purchase.id,
      p_reason: "Customer requested refund",
    });
    expect(first.error).toBeNull();
    const { data: afterFirst } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.b)
      .single();
    expect(afterFirst?.balance_cents).toBe((beforeRefund?.balance_cents ?? 0) + 2_500);
    const second = await fixture.admin.rpc("refund_purchase", {
      p_purchase_id: purchase.id,
      p_reason: "Repeated request",
    });
    expect(second.error).toBeNull();
    const { data: afterSecond } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.b)
      .single();
    expect(afterSecond?.balance_cents).toBe(afterFirst?.balance_cents);
    const { data: refundTransactions } = await service
      .from("wallet_transactions")
      .select("id")
      .eq("purchase_id", purchase.id)
      .eq("type", "lead_refund");
    expect(refundTransactions).toHaveLength(1);
  });

  it("credits a Stripe event once when replayed", async () => {
    const eventId = `evt_${randomUUID()}`;
    const { data: before } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    const first = await fixture.admin.rpc("credit_wallet_from_stripe", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 4_000,
      p_stripe_event_id: eventId,
    });
    expect(first.error).toBeNull();
    const second = await fixture.admin.rpc("credit_wallet_from_stripe", {
      p_partner_id: fixture.partnerIds.a,
      p_amount_cents: 4_000,
      p_stripe_event_id: eventId,
    });
    expect(second.error).toBeNull();
    const { data: wallet } = await service
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    expect(wallet?.balance_cents).toBe((before?.balance_cents ?? 0) + 4_000);
    const { data: transactions } = await service
      .from("wallet_transactions")
      .select("id")
      .eq("partner_id", fixture.partnerIds.a)
      .eq("stripe_event_id", eventId);
    expect(transactions).toHaveLength(1);
  });

  it("enforces partner RLS and the PII gate", async () => {
    const { data: otherWallet } = await fixture.partners.a
      .from("partner_wallets")
      .select("*")
      .eq("partner_id", fixture.partnerIds.b);
    expect(otherWallet).toEqual([]);
    const { data: otherTransactions } = await fixture.partners.a
      .from("wallet_transactions")
      .select("*")
      .eq("partner_id", fixture.partnerIds.b);
    expect(otherTransactions).toEqual([]);
    const { data: otherPurchases } = await fixture.partners.a
      .from("lead_purchases")
      .select("*")
      .eq("partner_id", fixture.partnerIds.b);
    expect(otherPurchases).toEqual([]);

    const unpurchasedLead = await createLead(service, fixture.brands.pestora, fixture.services.cockroaches);
    const { data: hiddenContact } = await fixture.partners.a
      .from("lead_contacts")
      .select("*")
      .eq("lead_id", unpurchasedLead);
    expect(hiddenContact).toEqual([]);
    const { data: availableForSuspended } = await fixture.partners.c.from("leads").select("id");
    expect(availableForSuspended).toEqual([]);

    const visibilityCases = [
      ["d", await createLead(service, fixture.brands.pestora, fixture.services.cockroaches)],
      ["e", await createLead(service, fixture.brands.pestora, fixture.services.cockroaches)],
      ["f", await createLead(service, fixture.brands.pestora, fixture.services.cockroaches)],
    ] as const;
    for (const [partner, leadId] of visibilityCases) {
      const { data: visibleLeads } = await fixture.partners[partner]
        .from("leads")
        .select("id")
        .eq("id", leadId);
      expect(visibleLeads).toEqual([]);
    }

    const { data: ownMembership } = await fixture.partners.a
      .from("partner_brand_memberships")
      .select("active")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    const { data: ownService } = await fixture.partners.a
      .from("partner_services")
      .select("service_id")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    const { data: ownPostcode } = await fixture.partners.a
      .from("partner_postcodes")
      .select("postal_code")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    const { data: ownWallet } = await fixture.partners.a
      .from("partner_wallets")
      .select("balance_cents")
      .eq("partner_id", fixture.partnerIds.a)
      .single();
    expect((await fixture.partners.a.from("partner_brand_memberships").update({ active: false }).eq("partner_id", fixture.partnerIds.a).select()).data).toEqual([]);
    expect((await fixture.partners.a.from("partner_services").update({ service_id: fixture.services.unblocking }).eq("partner_id", fixture.partnerIds.a).select()).data).toEqual([]);
    expect((await fixture.partners.a.from("partner_postcodes").update({ postal_code: "2000" }).eq("partner_id", fixture.partnerIds.a).select()).data).toEqual([]);
    expect((await fixture.partners.a.from("partner_wallets").update({ balance_cents: 0 }).eq("partner_id", fixture.partnerIds.a).select()).data).toEqual([]);
    expect((await fixture.partners.a.from("leads").update({ price_cents: 1 }).eq("id", unpurchasedLead).select()).data).toEqual([]);
    const { data: afterWallet } = await service.from("partner_wallets").select("balance_cents").eq("partner_id", fixture.partnerIds.a).single();
    expect(ownMembership?.active).toBe(true);
    expect(ownService?.service_id).toBe(fixture.services.cockroaches);
    expect(ownPostcode?.postal_code).toBe("1000");
    expect(afterWallet?.balance_cents).toBe(ownWallet?.balance_cents);
  });
});
