import { describe, expect, it } from "vitest";
import { forecastMedication, lowStock } from "../forecast";
import { appData, dose, med, period, pkg } from "./fixtures";

const today = "2026-11-12";

function daily(stock: number, qty = 1) {
  return med("M", {
    packages: [pkg("p", { stock })],
    periods: [period("per", "2026-11-01", null, [dose("d", "rano", [["p", qty]])])],
  });
}

describe("forecastMedication", () => {
  it("1 dziennie, 10 sztuk: starczy na 10 dni (do 21.11 włącznie)", () => {
    const m = daily(10);
    const f = forecastMedication(appData([m]), m, today);
    expect(f.weakest?.lastDay).toBe("2026-11-21");
    expect(f.weakest?.daysLeft).toBe(10);
    expect(f.isLow).toBe(false);
  });

  it("dawka odhaczona dziś nie jest odejmowana drugi raz", () => {
    const m = daily(10);
    const f = forecastMedication(appData([m], [{ doseId: "d", date: today }]), m, today);
    expect(f.weakest?.lastDay).toBe("2026-11-22");
    expect(f.weakest?.daysLeft).toBe(11);
  });

  it("odhaczenie z wczoraj nie wpływa na prognozę", () => {
    const m = daily(10);
    const f = forecastMedication(appData([m], [{ doseId: "d", date: "2026-11-11" }]), m, today);
    expect(f.weakest?.daysLeft).toBe(10);
  });

  it("uwzględnia zmianę dawki w przyszłym okresie", () => {
    const m = med("M", {
      packages: [pkg("p", { stock: 10 })],
      periods: [
        period("now", "2026-11-01", "2026-11-14", [dose("d1", "rano", [["p", 1]])]),
        period("next", "2026-11-15", null, [dose("d2", "rano", [["p", 1]]), dose("d3", "wieczor", [["p", 1]])]),
      ],
    });
    // 12–14.11 po 1 (zostaje 7), od 15.11 po 2: 15, 16, 17 (zostaje 1), 18.11 brakuje.
    const f = forecastMedication(appData([m]), m, today);
    expect(f.weakest?.lastDay).toBe("2026-11-17");
    expect(f.weakest?.daysLeft).toBe(6);
  });

  it("przerwa w dawkowaniu nie zużywa zapasu", () => {
    const m = med("M", {
      packages: [pkg("p", { stock: 3 })],
      periods: [
        period("now", "2026-11-01", "2026-11-12", [dose("d1", "rano", [["p", 1]])]),
        period("later", "2026-11-20", null, [dose("d2", "rano", [["p", 1]])]),
      ],
    });
    // 12.11: 1 (zostają 2), przerwa 13–19, potem 20 i 21.11; 22.11 brakuje.
    const f = forecastMedication(appData([m]), m, today);
    expect(f.weakest?.lastDay).toBe("2026-11-21");
    expect(f.weakest?.daysLeft).toBe(10);
  });

  it("ułamki tabletek", () => {
    const m = daily(2, 0.5);
    expect(forecastMedication(appData([m]), m, today).weakest?.daysLeft).toBe(4);
  });

  it("pusty zapas: 0 dni, poniżej progu", () => {
    const m = daily(0);
    const f = forecastMedication(appData([m]), m, today);
    expect(f.weakest?.lastDay).toBe("2026-11-11");
    expect(f.weakest?.daysLeft).toBe(0);
    expect(f.isLow).toBe(true);
  });

  it("kilka mocy: liczy się najsłabsze ogniwo", () => {
    const m = med("M", {
      packages: [pkg("p20", { strengthValue: 20, stock: 5 }), pkg("p10", { stock: 100 })],
      periods: [
        period("per", "2026-11-01", null, [
          dose("d", "rano", [
            ["p20", 1],
            ["p10", 1],
          ]),
        ]),
      ],
    });
    const f = forecastMedication(appData([m]), m, today);
    expect(f.weakest?.pkg.id).toBe("p20");
    expect(f.weakest?.daysLeft).toBe(5);
    expect(f.packages.find((p) => p.pkg.id === "p10")?.daysLeft).toBe(100);
    expect(f.isLow).toBe(true);
  });

  it("opakowanie spoza dawkowania: used = false, bez daty", () => {
    const m = med("M", {
      packages: [pkg("p", { stock: 100 }), pkg("spare", { stock: 1 })],
      periods: [period("per", "2026-11-01", null, [dose("d", "rano", [["p", 1]])])],
    });
    const spare = forecastMedication(appData([m]), m, today).packages.find((p) => p.pkg.id === "spare")!;
    expect(spare.used).toBe(false);
    expect(spare.lastDay).toBeNull();
    expect(spare.daysLeft).toBeNull();
  });

  it("zapas poza horyzontem: used = true, bez daty, nie jest niski", () => {
    const m = daily(10_000);
    const f = forecastMedication(appData([m]), m, today);
    expect(f.packages[0].used).toBe(true);
    expect(f.packages[0].daysLeft).toBeNull();
    expect(f.weakest).toBeNull();
    expect(f.isLow).toBe(false);
  });

  it("próg leku zastępuje domyślny; równość progu to już niski zapas", () => {
    const m = daily(5);
    const own = { ...m, lowStockDays: 3 };
    expect(forecastMedication(appData([m], [], 7), m, today).isLow).toBe(true);
    expect(forecastMedication(appData([own]), own, today).isLow).toBe(false);
    expect(forecastMedication(appData([m], [], 5), m, today).isLow).toBe(true);
    expect(forecastMedication(appData([m], [], 4), m, today).isLow).toBe(false);
  });
});

describe("lowStock", () => {
  it("tylko niskie, bez zarchiwizowanych, od najpilniejszego", () => {
    const a = { ...daily(5), id: "a" };
    const b = { ...daily(2), id: "b" };
    const c = { ...daily(50), id: "c" };
    const archived = { ...daily(1), id: "x", isArchived: true };
    expect(lowStock(appData([a, b, c, archived]), today).map((f) => f.med.id)).toEqual(["b", "a"]);
  });
});
