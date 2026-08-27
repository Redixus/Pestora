import Stripe from "stripe";
import { isTopUpAmount } from "@/lib/stripe/constants";
import { getStripe } from "@/lib/stripe/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

function ignoredResponse(reason: string) {
  console.warn("Ignoring Stripe checkout event", reason);
  return Response.json({ received: true, ignored: reason });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return errorResponse(400, "INVALID_SIGNATURE", "The Stripe signature is invalid");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return errorResponse(400, "INVALID_SIGNATURE", "The Stripe signature is invalid");
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const partnerId = session.metadata?.partner_id;
  const amountCents = session.amount_total;
  if (!partnerId) return ignoredResponse("missing_partner_id");
  if (session.payment_status !== "paid") return ignoredResponse("payment_not_paid");
  if (session.currency !== "eur") return ignoredResponse("unsupported_currency");
  if (!amountCents || !isTopUpAmount(amountCents)) return ignoredResponse("unsupported_amount");

  const service = createServiceSupabaseClient();
  const { error } = await service.rpc("credit_wallet_from_stripe", {
    p_partner_id: partnerId,
    p_amount_cents: amountCents,
    p_stripe_event_id: event.id,
  });
  if (error) {
    console.error("Stripe wallet credit failed", error.message);
    return errorResponse(500, "WALLET_CREDIT_FAILED", "The wallet credit could not be completed");
  }

  return Response.json({ received: true });
}
