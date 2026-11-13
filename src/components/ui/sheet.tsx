"use client";

import { X } from "lucide-react";
import { Drawer } from "vaul";

/** Bottom sheet (vaul), w języku ciepłych kart. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[var(--scrim)]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-lg flex-col rounded-t-[1.75rem] bg-card outline-none"
        >
          {/* Uchwyt do przesunięcia i jawne zamknięcie: z VoiceOverem gest ani stuknięcie w tło nie zawsze działa. */}
          <div className="relative flex h-11 shrink-0 items-start justify-center">
            <div aria-hidden className="mt-2.5 h-1.5 w-10 rounded-full bg-line" />
            <Drawer.Close
              aria-label="Zamknij"
              className="absolute top-1.5 right-3 grid size-11 place-items-center rounded-full text-text-2 transition-transform duration-150 active:scale-90"
            >
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-card-muted">
                <X className="size-[1.1rem]" strokeWidth={2.5} />
              </span>
            </Drawer.Close>
          </div>
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          {description ? (
            <Drawer.Description className="sr-only">{description}</Drawer.Description>
          ) : (
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          )}
          <div className="overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
