import { Pill } from "lucide-react";
import { LaterScreen } from "@/components/app-shell/later-screen";

export default function MedsPage() {
  return (
    <LaterScreen title="Leki" Icon={Pill}>
      Tu będzie lista leków z opakowaniami, okresami dawkowania i przyciskiem „Od dnia… nowe dawkowanie”. Ekran powstanie w fazie 2.
    </LaterScreen>
  );
}
