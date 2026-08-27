"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword, type PasswordState } from "@/app/auth/set-password/actions";

export function PasswordForm({ labels }: { labels: { password: string; confirm: string; submit: string; loading: string; required: string; mismatch: string } }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, null);
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{labels.confirm}</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button className="min-h-11 w-full bg-[var(--brand-accent)] text-white hover:opacity-90" disabled={pending} type="submit">
        {pending ? labels.loading : labels.submit}
      </Button>
    </form>
  );
}
