"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { purchaseLead, type PurchaseState } from "@/lib/portal/actions";

export function PurchaseButton({ leadId, label, loading, topUpLabel, refreshLabel }: { leadId: string; label: string; loading: string; topUpLabel: string; refreshLabel: string }) {
  const [state, action, pending] = useActionState<PurchaseState, FormData>(purchaseLead, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Button className="min-h-12 w-full bg-[var(--brand-accent)] text-base font-semibold text-white hover:opacity-90" disabled={pending} type="submit">
        {pending ? loading : label}
      </Button>
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state?.code === "P0002" && <Link href="/wallet" className="flex min-h-11 items-center justify-center rounded-lg border text-sm font-medium">{topUpLabel}</Link>}
      {state?.code === "P0001" && <Link href="/leads" className="flex min-h-11 items-center justify-center rounded-lg border text-sm font-medium">{refreshLabel}</Link>}
    </form>
  );
}
