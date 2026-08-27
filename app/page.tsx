import { getPostAuthPath } from "@/lib/auth/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const destination = await getPostAuthPath(await createServerSupabaseClient());
  redirect(destination);
}
