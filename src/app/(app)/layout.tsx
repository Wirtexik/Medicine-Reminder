import { OfflineBanner } from "@/components/app-shell/offline-banner";
import { TabBar } from "@/components/app-shell/tab-bar";
import { ToastProvider } from "@/components/ui/toast";
import { StoreProvider } from "@/lib/data/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <OfflineBanner />
        <div className="mx-auto max-w-lg pb-[calc(4.5rem+env(safe-area-inset-bottom))]">{children}</div>
        <TabBar />
      </ToastProvider>
    </StoreProvider>
  );
}
