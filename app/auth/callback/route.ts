import { NextResponse, type NextRequest } from "next/server";
import { getPostAuthPath } from "@/lib/auth/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let requiresPasswordSetup = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login", request.url));
  } else if (tokenHash && (type === "invite" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return NextResponse.redirect(new URL("/login", request.url));
    requiresPasswordSetup = true;
  } else {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const destination = requiresPasswordSetup ? "/auth/set-password" : await getPostAuthPath(supabase);
  return NextResponse.redirect(new URL(destination, request.url));
}
