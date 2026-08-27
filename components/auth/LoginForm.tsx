"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "@/app/login/actions";

export function LoginForm({ labels }: { labels: { email: string; password: string; submit: string; loading: string; emailRequired: string; passwordRequired: string; invalid: string } }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={state?.field === "email"} />
        {state?.field === "email" && <p className="text-sm text-destructive">{state.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={state?.field === "password"} />
        {state?.field === "password" && <p className="text-sm text-destructive">{state.message}</p>}
      </div>
      {state?.field === "form" && <p className="text-sm text-destructive">{state.message}</p>}
      <Button className="min-h-11 w-full bg-[var(--brand-accent)] text-white hover:opacity-90" disabled={pending} type="submit">
        {pending ? labels.loading : labels.submit}
      </Button>
    </form>
  );
}
