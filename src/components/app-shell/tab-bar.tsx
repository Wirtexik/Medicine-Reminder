"use client";

import { CalendarCheck, Package, Pill } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Dziś", Icon: CalendarCheck },
  { href: "/leki", label: "Leki", Icon: Pill },
  { href: "/zapasy", label: "Zapasy", Icon: Package },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Główna nawigacja"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[var(--bar)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-[3.4rem] flex-col items-center justify-center gap-0.5 text-caption font-semibold transition-colors",
                  active ? "text-action-ink" : "text-text-2",
                ].join(" ")}
              >
                <Icon aria-hidden strokeWidth={active ? 2.4 : 2} className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
