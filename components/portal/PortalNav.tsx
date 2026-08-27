"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, CreditCard, List, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: "list" | "shopping" | "card" | "user" };

export function PortalNav({ items, ariaLabel }: { items: NavItem[]; ariaLabel: string }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-white md:block">
        <nav className="sticky top-0 flex flex-col gap-1 p-4" aria-label={ariaLabel}>
          {items.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />)}
        </nav>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white/95 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label={ariaLabel}>
        {items.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} mobile />)}
      </nav>
    </>
  );
}

function NavLink({ item, active, mobile = false }: { item: NavItem; active: boolean; mobile?: boolean }) {
  const Icon = { list: List, shopping: ShoppingBag, card: CreditCard, user: CircleUserRound }[item.icon];
  return (
    <Link href={item.href} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium", mobile && "min-w-16 flex-col justify-center gap-0.5 px-1 py-2 text-[10px]", active ? "bg-[var(--brand-accent)] text-white" : "text-muted-foreground hover:bg-muted")}>
      <Icon className={mobile ? "size-5" : "size-4"} />
      <span>{item.label}</span>
    </Link>
  );
}
