import { describe, expect, it } from "vitest";
import { activePeriod, buildChecklist, dayMode, dayStatus } from "../checklist";
import { appData, dose, med, period, pkg } from "./fixtures";

const today = "2026-11-12";

describe("dayMode", () => {
  it("dziś i wczoraj można edytować", () => {
    expect(dayMode(today, today)).toBe("editable");
    expect(dayMode("2026-11-11", today)).toBe("editable");
  });

  it("starsze dni tylko do podglądu, przyszłe osobno", () => {
    expect(dayMode("2026-11-10", today)).toBe("readonly-past");
    expect(dayMode("2025-11-12", today)).toBe("readonly-past");
    expect(dayMode("2026-11-13", today)).toBe("future");
  });

  it("wczoraj przez granicę miesiąca i roku", () => {
    expect(dayMode("2026-11-30", "2026-12-01")).toBe("editable");
    expect(dayMode("2026-12-31", "2027-01-01")).toBe("editable");
    expect(dayMode("2026-12-30", "2027-01-01")).toBe("readonly-past");
  });

  it("zmiana czasu (ostatnia niedziela października) nie przesuwa dni", () => {
    expect(dayMode("2026-10-25", "2026-10-26")).toBe("editable");
    expect(dayMode("2026-03-29", "2026-03-30")).toBe("editable");
  });
});

describe("activePeriod", () => {
  const m = med("A", {
    periods: [period("p1", "2026-11-01", "2026-11-14", []), period("p2", "2026-11-15", null, [])],
  });

  it("granice okresu są włączne", () => {
    expect(activePeriod(m, "2026-11-01")?.id).toBe("p1");
    expect(activePeriod(m, "2026-11-14")?.id).toBe("p1");
    expect(activePeriod(m, "2026-11-15")?.id).toBe("p2");
  });

  it("okres otwarty trwa bez końca, przed pierwszym nie ma nic", () => {
    expect(activePeriod(m, "2030-01-01")?.id).toBe("p2");
    expect(activePeriod(m, "2026-10-31")).toBeUndefined();
  });
});

describe("buildChecklist", () => {
  const a = med("Azor", {
    packages: [pkg("a1")],
    periods: [
      period("pa", "2026-11-01", null, [dose("a-rano", "rano", [["a1", 1]]), dose("a-wieczor", "wieczor", [["a1", 1]])]),
    ],
  });
  const b = med("Ąpirin", {
    packages: [pkg("b1")],
    periods: [period("pb", "2026-11-01", null, [dose("b-rano", "rano", [["b1", 1]])])],
  });
  const c = med("Biotyna", {
    packages: [pkg("c1")],
    periods: [period("pc", "2026-11-01", null, [dose("c-rano", "rano", [["c1", 1]], { sortOrder: -1 })])],
  });

  it("pory w kolejności, bez pustych; w porze kolejność dawki, potem nazwa po polsku", () => {
    const groups = buildChecklist(appData([b, a, c]), today);
    expect(groups.map((g) => g.slot.id)).toEqual(["rano", "wieczor"]);
    expect(groups[0].items.map((i) => i.med.name)).toEqual(["Biotyna", "Azor", "Ąpirin"]);
  });

  it("odhaczenia liczą się tylko z tego dnia", () => {
    const data = appData(
      [a, b],
      [
        { doseId: "a-rano", date: today },
        { doseId: "b-rano", date: "2026-11-11" },
        { doseId: "a-wieczor", date: today },
      ],
    );
    const [rano, wieczor] = buildChecklist(data, today);
    expect(rano.takenCount).toBe(1);
    expect(rano.done).toBe(false);
    expect(rano.items.find((i) => i.dose.id === "a-rano")?.taken).toBe(true);
    expect(wieczor.done).toBe(true);
  });

  it("pomija leki zarchiwizowane i bez okresu w tym dniu", () => {
    const archived = { ...b, isArchived: true };
    const later = med("Później", {
      packages: [pkg("l1")],
      periods: [period("pl", "2026-11-20", null, [dose("l-rano", "rano", [["l1", 1]])])],
    });
    expect(buildChecklist(appData([archived, later]), today)).toEqual([]);
  });

  it("zmiana dawkowania: lista z okresu aktywnego w danym dniu", () => {
    const m = med("M", {
      packages: [pkg("m1")],
      periods: [
        period("old", "2026-11-01", "2026-11-12", [dose("old-rano", "rano", [["m1", 1]])]),
        period("new", "2026-11-13", null, [dose("new-wieczor", "wieczor", [["m1", 1]])]),
      ],
    });
    expect(buildChecklist(appData([m]), "2026-11-12")[0].items[0].dose.id).toBe("old-rano");
    expect(buildChecklist(appData([m]), "2026-11-13")[0].items[0].dose.id).toBe("new-wieczor");
  });
});

describe("dayStatus", () => {
  const m = med("M", {
    packages: [pkg("m1")],
    periods: [period("p", "2026-11-01", null, [dose("d1", "rano", [["m1", 1]]), dose("d2", "wieczor", [["m1", 1]])])],
  });

  it("empty / none / some / all", () => {
    expect(dayStatus(appData([m]), "2026-10-31")).toBe("empty");
    expect(dayStatus(appData([m]), today)).toBe("none");
    expect(dayStatus(appData([m], [{ doseId: "d1", date: today }]), today)).toBe("some");
    const all = appData(
      [m],
      [
        { doseId: "d1", date: today },
        { doseId: "d2", date: today },
      ],
    );
    expect(dayStatus(all, today)).toBe("all");
  });
});
