import { Package } from "lucide-react";
import { LaterScreen } from "@/components/app-shell/later-screen";

export default function StockPage() {
  return (
    <LaterScreen title="Zapasy" Icon={Package}>
      Tu będą leki, które się kończą, stan każdego opakowania, „+ opakowanie” i korekta stanu. Ekran powstanie w fazie 4.
    </LaterScreen>
  );
}
