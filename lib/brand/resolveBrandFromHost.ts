import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Tables } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Brand = Tables<"brands">;
export type BrandLookup = (criteria: { host?: string; slug?: string }) => Promise<Brand | null>;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type ResolveBrandOptions = {
  hostname?: string;
  url?: string;
  cookieReader?: CookieReader;
  lookup?: BrandLookup;
};

const brandCookieName = "interventia-brand";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

async function databaseBrandLookup(criteria: { host?: string; slug?: string }): Promise<Brand | null> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("brands").select("*").eq("active", true);
  query = criteria.slug ? query.eq("slug", criteria.slug) : query.eq("partner_host", criteria.host ?? "");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export const resolveBrandFromHost = cache(async (options: ResolveBrandOptions = {}): Promise<Brand> => {
  const requestHeaders = options.hostname ? undefined : await headers();
  const rawHost = options.hostname ?? requestHeaders?.get("x-forwarded-host") ?? requestHeaders?.get("host") ?? "";
  const hostname = rawHost.split(":")[0].toLowerCase();
  const requestUrl = options.url ? new URL(options.url) : null;
  const lookup = options.lookup ?? databaseBrandLookup;

  if (localHosts.has(hostname)) {
    const querySlug = requestUrl?.searchParams.get("brand")?.toLowerCase();
    const cookieReader = options.cookieReader ?? (querySlug ? undefined : await cookies());
    const rememberedSlug = cookieReader?.get(brandCookieName)?.value;
    const slug = querySlug ?? rememberedSlug ?? "pestora";
    const brand = await lookup({ slug });
    if (!brand) throw new Error(`Active brand not found: ${slug}`);
    return brand;
  }

  const brand = await lookup({ host: hostname });
  if (!brand) throw new Error(`Active brand not found for host: ${hostname}`);
  return brand;
});
