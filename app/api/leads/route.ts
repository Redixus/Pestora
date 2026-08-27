import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const photoSchema = z.string().refine(
  (value) => value.startsWith("data:image/") || /^https?:\/\/\S+$/i.test(value),
  "Each photo must be an image data URL or an HTTP(S) URL",
);

const leadPayloadSchema = z.object({
  brand: z.string().trim().min(1),
  service: z.string().trim().min(1),
  postal_code: z.string().trim().transform((value) => value.replace(/\s+/g, "")).pipe(z.string().regex(/^\d{4}$/, "postal_code must contain exactly four digits")),
  city: z.string().trim().min(1),
  description: z.string().trim().max(10_000).nullable().optional(),
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().nullable().optional(),
  full_address: z.string().trim().min(1).nullable().optional(),
  photos: z.array(photoSchema).max(20).optional(),
  extra_data: z.record(z.string(), z.json()).optional(),
  consent_at: z.string().datetime({ offset: true }),
  privacy_version: z.string().trim().min(1),
}).strict();

type LeadPayload = z.output<typeof leadPayloadSchema>;

const secretByBrand: Record<string, string> = {
  pestora: "PESTORA_INGESTION_SECRET",
  drenora: "DRENORA_INGESTION_SECRET",
  movira: "MOVIRA_INGESTION_SECRET",
};

function errorResponse(status: number, error: string, message: string, details?: unknown) {
  return Response.json(details === undefined ? { error, message } : { error, message, details }, { status });
}

function hasMatchingSecret(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  const length = Math.max(providedBytes.length, expectedBytes.length);
  const providedPadded = Buffer.alloc(length);
  const expectedPadded = Buffer.alloc(length);
  providedBytes.copy(providedPadded);
  expectedBytes.copy(expectedPadded);
  return timingSafeEqual(providedPadded, expectedPadded) && providedBytes.length === expectedBytes.length;
}

function validationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path, code: issue.code, message: issue.message }));
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "The request body must be valid JSON");
  }

  const parsed = leadPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "The lead payload is invalid", validationDetails(parsed.error));
  }
  const payload: LeadPayload = parsed.data;
  const brandSlug = payload.brand.toLowerCase();
  const secretName = secretByBrand[brandSlug];
  const expectedSecret = secretName ? process.env[secretName] : undefined;
  if (!hasMatchingSecret(request.headers.get("x-interventia-secret"), expectedSecret)) {
    return errorResponse(401, "INVALID_SECRET", "The ingestion secret is invalid");
  }

  const service = createServiceSupabaseClient();
  const { data: brand, error: brandError } = await service
    .from("brands")
    .select("id, slug")
    .eq("slug", brandSlug)
    .eq("active", true)
    .maybeSingle();
  if (brandError) {
    console.error("Lead ingestion brand lookup failed", brandError.message);
    return errorResponse(500, "INGESTION_FAILED", "The lead could not be created");
  }
  if (!brand) return errorResponse(404, "UNKNOWN_BRAND", `Unknown active brand: ${payload.brand}`);

  const serviceSlug = payload.service.toLowerCase();
  const { data: serviceRecord, error: serviceError } = await service
    .from("services")
    .select("id, default_price_cents")
    .eq("brand_id", brand.id)
    .eq("slug", serviceSlug)
    .eq("active", true)
    .maybeSingle();
  if (serviceError) {
    console.error("Lead ingestion service lookup failed", serviceError.message);
    return errorResponse(500, "INGESTION_FAILED", "The lead could not be created");
  }
  if (!serviceRecord) return errorResponse(404, `UNKNOWN_SERVICE`, `Unknown active service for ${brand.slug}: ${payload.service}`);

  const { data: leadId, error: ingestError } = await service.rpc("ingest_lead", {
    p_brand_id: brand.id,
    p_service_id: serviceRecord.id,
    p_postal_code: payload.postal_code,
    p_city: payload.city,
    p_description: payload.description as unknown as string,
    p_price_cents: serviceRecord.default_price_cents,
    p_photo_count: payload.photos?.length ?? 0,
    p_extra_data: (payload.extra_data ?? {}) as Json,
    p_source: "landing-page",
    p_name: payload.name,
    p_phone: payload.phone,
    p_email: payload.email as unknown as string,
    p_full_address: payload.full_address as unknown as string,
    p_consent_at: payload.consent_at,
    p_privacy_version: payload.privacy_version,
  });
  if (ingestError || !leadId) {
    console.error("Lead ingestion insert failed", ingestError?.message ?? "Missing lead id");
    return errorResponse(500, "INGESTION_FAILED", "The lead could not be created");
  }

  return Response.json(
    { id: leadId, price_cents: serviceRecord.default_price_cents, status: "available" },
    { status: 201 },
  );
}
