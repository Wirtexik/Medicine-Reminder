import { Suspense } from "react";
import { Skeleton } from "@/components/app-shell/load-state";
import { PeriodScreen } from "@/components/meds/period-screen";

type Props = PageProps<"/leki/[id]/okres/[periodId]">;

export default function PeriodPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <PeriodPageContent params={params} />
    </Suspense>
  );
}

async function PeriodPageContent({ params }: { params: Props["params"] }) {
  const { id, periodId } = await params;
  return <PeriodScreen medId={id} periodId={periodId} />;
}
