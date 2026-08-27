import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const hostname = request.nextUrl.hostname.toLowerCase();
  const requestedBrand = request.nextUrl.searchParams.get("brand")?.toLowerCase();
  if (["localhost", "127.0.0.1", "::1"].includes(hostname) && requestedBrand && /^[a-z0-9-]+$/.test(requestedBrand)) {
    response.cookies.set("interventia-brand", requestedBrand, { httpOnly: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return response;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
