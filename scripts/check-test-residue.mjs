import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function getState() {
  const { data: partners, error: partnerError } = await supabase
    .from("partners")
    .select("id, company_name");
  if (partnerError) throw partnerError;

  const { data: users, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (userError) throw userError;

  return {
    partners,
    testPartners: partners.filter((partner) => partner.company_name.startsWith("Phase 4")),
    testUsers: users.users.filter((user) => user.email?.startsWith("phase4-") || user.email?.startsWith("stripe-")),
  };
}

const initial = await getState();
if (process.argv.includes("--cleanup") && initial.testPartners.length) {
  const partnerIds = initial.testPartners.map((partner) => partner.id);
  for (const operation of [
    supabase.from("wallet_transactions").delete().in("partner_id", partnerIds),
    supabase.from("lead_purchases").delete().in("partner_id", partnerIds),
    supabase.from("partner_wallets").delete().in("partner_id", partnerIds),
    supabase.from("partners").delete().in("id", partnerIds),
  ]) {
    const result = await operation;
    if (result.error) throw result.error;
  }
}

if (process.argv.includes("--cleanup") && initial.testUsers.length) {
  const userIds = initial.testUsers.map((user) => user.id);
  const profiles = await supabase.from("profiles").delete().in("id", userIds);
  if (profiles.error) throw profiles.error;
  for (const user of initial.testUsers) {
    const result = await supabase.auth.admin.deleteUser(user.id);
    if (result.error) throw result.error;
  }
}

const state = await getState();
const unexpectedPartners = state.partners.filter((partner) => partner.company_name !== "ABC Pest Control");
if (state.testPartners.length || state.testUsers.length || unexpectedPartners.length || state.partners.length !== 1) {
  console.error(JSON.stringify({ partners: state.partners, users: state.testUsers }, null, 2));
  process.exitCode = 1;
} else {
  console.log("No API/Phase 4 test residue found; ABC Pest Control is the only partner.");
}
