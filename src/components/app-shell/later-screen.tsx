import type { LucideIcon } from "lucide-react";

/** Ekran, który powstanie w kolejnej fazie (docs/PROJEKT.md §8). */
export function LaterScreen({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-[max(3.25rem,calc(env(safe-area-inset-top)+2.75rem))]">
      <h1 className="font-rounded text-title font-bold tracking-[-0.02em]">{title}</h1>
      <div className="mt-6 rounded-[var(--radius-card)] bg-card-muted px-5 py-6">
        <Icon aria-hidden className="size-7 text-text-3" />
        <div className="mt-3 max-w-[40ch] text-body text-text-2">{children}</div>
      </div>
    </div>
  );
}
