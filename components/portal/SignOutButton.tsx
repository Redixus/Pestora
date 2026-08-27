"use client";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" className="min-h-11 min-w-11 px-2" aria-label={label} title={label}><LogOut className="size-4" /><span className="sr-only">{label}</span></Button>
    </form>
  );
}
