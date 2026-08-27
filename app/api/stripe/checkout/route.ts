import { z } from "zod";
import { getCurrentPartner, getCurrentUser } from "@/lib/auth/auth";
import { isTopUpAmount } from "@/lib/stripe/constants";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

const checkoutPayloadSchema = z.object({ amountCents: z.number().int() }).strict();

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "The request body must be valid JSON");
  }
  const parsed = checkoutPayloadSchema.safeParse(body);
  if (!parsed.success || !isTopUpAmount(parsed.data?.amountCents ?? Number.NaN)) {
    return errorResponse(400, "INVALID_TOP_UP_AMOUNT", "The top-up amount is not available");
  }

  const user = await getCurrentUser();
  if (!user) return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  const partner = await getCurrentPartner();
  if (!partner) return errorResponse(403, "PARTNER_REQUIRED", "An active partner account is required");
  if (partner.status !== "active") return errorResponse(403, "PARTNER_SUSPENDED", "The partner account is suspended");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return errorResponse(500, "CHECKOUT_NOT_CONFIGURED", "Checkout is not configured");

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return errorResponse(500, "CHECKOUT_NOT_CONFIGURED", "Checkout is not configured");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: "Interventia wallet credit" },
          unit_amount: parsed.data.amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        partner_id: partner.id,
        amount_cents: String(parsed.data.amountCents),
      },
      client_reference_id: partner.id,
      success_url: `${appUrl.replace(/\/$/, "")}/wallet?topup=success`,
      cancel_url: `${appUrl.replace(/\/$/, "")}/wallet?topup=cancelled`,
    });
    if (!session.url) return errorResponse(500, "CHECKOUT_FAILED", "Checkout could not be created");
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error instanceof Error ? error.message : "Unknown error");
    return errorResponse(500, "CHECKOUT_FAILED", "Checkout could not be created");
  }
}
