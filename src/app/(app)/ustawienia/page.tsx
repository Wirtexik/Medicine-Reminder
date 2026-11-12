import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AccountSection, AccountSectionSkeleton } from "@/components/settings/account-section";
import { SlotsSection } from "@/components/settings/slots-section";
import { ThresholdSection } from "@/components/settings/threshold-section";

export default function SettingsPage() {
  return (
    <div className="px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-6">
      <div className="-mx-2 flex h-11 items-center">
        <Link href="/" className="flex h-11 items-center gap-1 rounded-full px-2 text-body font-medium">
          <ChevronLeft aria-hidden className="size-6" />
          Dziś
        </Link>
      </div>
      <h1 className="mt-2 font-rounded text-title font-bold tracking-[-0.02em]">Ustawienia</h1>

      <SlotsSection />
      <ThresholdSection />

      <Suspense fallback={<AccountSectionSkeleton />}>
        <AccountSection />
      </Suspense>
    </div>
  );
}
