import { describe, expect, it } from "vitest";
import { currentDosing, periodPhase, periodRange, periodSummary } from "../summary";
import { dose, med, period, pkg, slots } from "./fixtures";

const NBSP = " ";
const today = "2026-11-12";
const packages = [pkg("p20", { strengthValue: 20 }), pkg("p10", { strengthValue: 10 })];

describe("periodSummary", () => {
  it("jedna dawka: dawka i pora", () => {
    const m = med("M", { packages });
    const p = period("p", "2026-11-01", null, [
      dose("d", "rano", [
        ["p20", 1],
        ["p10", 1],
      ]),
    ]);
    expect(periodSummary(m, p, slots)).toBe(`30${NBSP}mg · rano`);
  });

  it("kilka równych dawek", () => {
    const m = med("M", { packages });
    const p = period("p", "2026-11-01", null, [dose("a", "wieczor", [["p10", 1]]), dose("b", "rano", [["p10", 1]])]);
    expect(periodSummary(m, p, slots)).toBe(`10${NBSP}mg · 2${NBSP}×${NBSP}dziennie`);
  });

  it("różne dawki w kolejności pór", () => {
    const m = med("M", { packages });
    const p = period("p", "2026-11-01", null, [dose("a", "wieczor", [["p10", 1]]), dose("b", "rano", [["p20", 1]])]);
    expect(periodSummary(m, p, slots)).toBe(`2${NBSP}×${NBSP}dziennie: 20${NBSP}mg, 10${NBSP}mg`);
  });

  it("bez dawek", () => {
    expect(periodSummary(med("M"), period("p", today, null, []), slots)).toBe("bez dawek");
  });
});

describe("currentDosing", () => {
  it("przyszły okres i brak dawkowania", () => {
    const m = med("M", {
      packages,
      periods: [period("p", "2026-11-15", null, [dose("d", "rano", [["p10", 1]])])],
    });
    expect(currentDosing(m, slots, today)).toBe(`od 15.11: 10${NBSP}mg · rano`);
    expect(currentDosing(med("M"), slots, today)).toBe("bez dawkowania");
  });
});

describe("okresy", () => {
  it("zakres i faza", () => {
    const closed = period("a", "2026-11-01", "2026-11-12", []);
    const open = period("b", "2026-11-13", null, []);
    expect(periodRange(closed)).toBe("01.11 – 12.11");
    expect(periodRange(open)).toBe("od 13.11");
    expect(periodPhase(closed, today)).toBe("current");
    expect(periodPhase(closed, "2026-11-13")).toBe("past");
    expect(periodPhase(open, today)).toBe("future");
  });
});
