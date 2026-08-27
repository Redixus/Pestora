"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TopUpButton({ amountCents, label, pendingLabel, errorLabel }: { amountCents: number; label: string; pendingLabel: string; errorLabel: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function startCheckout() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const result = (await response.json()) as { url?: string };
      if (!response.ok || !result.url) {
        setError(true);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <Button type="button" variant="outline" className="min-h-11 w-full" disabled={pending} onClick={startCheckout}>{pending ? pendingLabel : label}</Button>
      {error && <p className="mt-2 text-xs text-destructive">{errorLabel}</p>}
    </div>
  );
}
