"use client";

import { useActionState } from "react";
import type { AdminActionState } from "@/lib/admin/actions";

type AdminAction = (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;

export function AdminActionForm({ action, children, submitLabel, pendingLabel }: { action: AdminAction; children: React.ReactNode; submitLabel: string; pendingLabel: string }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, null);
  return <form action={formAction} className="space-y-3">{children}<button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={pending} type="submit">{pending ? pendingLabel : submitLabel}</button>{state?.message && <p className="text-sm text-destructive">{state.message}</p>}</form>;
}
