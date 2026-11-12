import { Suspense } from "react";
import { Skeleton } from "@/components/app-shell/load-state";
import { MedDetailScreen } from "@/components/meds/med-detail-screen";

// Parametry trasy są znane dopiero w żądaniu (cacheComponents): odczyt w Suspense.
export default function MedPage({ params }: PageProps<"/leki/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <MedPageContent params={params} />
    </Suspense>
  );
}

async function MedPageContent({ params }: { params: PageProps<"/leki/[id]">["params"] }) {
  const { id } = await params;
  return <MedDetailScreen id={id} />;
}
