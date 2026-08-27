"use server";

import { cookies } from "next/headers";

const brandCookieName = "interventia-brand";

export async function rememberBrand(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(brandCookieName, slug, { httpOnly: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
}
