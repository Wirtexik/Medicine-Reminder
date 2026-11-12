import { Suspense } from "react";
import { Skeleton } from "@/components/app-shell/load-state";
import { PlanScreen } from "@/components/meds/plan-screen";

type Props = PageProps<"/leki/[id]/plan">;

export default function PlanPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <PlanPageContent params={params} />
    </Suspense>
  );
}

async function PlanPageContent({ params }: { params: Props["params"] }) {
  const { id } = await params;
  return <PlanScreen medId={id} />;
}
