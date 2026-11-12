import { describe, expect, it } from "vitest";
import { doseBreakdown, doseTotal, formatNumber, formatQuantity, pluralDni, pluralKrople, pluralLeki, unitFor } from "../format";
import { packageName, packageSizeLabel, parseNumber } from "../forms";
import { dose, pkg } from "./fixtures";

const NBSP = " ";

describe("formatQuantity", () => {
  it.each([
    [1, "1"],
    [2, "2"],
    [0.5, "½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [1.5, "1½"],
    [2.25, "2¼"],
    [7.5, "7½"],
    [0.3, "0,3"],
  ])("%s → %s", (q, text) => expect(formatQuantity(q)).toBe(text));
});

describe("odmiana", () => {
  it.each([
    [0, "leków"],
    [1, "lek"],
    [2, "leki"],
    [4, "leki"],
    [5, "leków"],
    [11, "leków"],
    [12, "leków"],
    [14, "leków"],
    [21, "leków"],
    [22, "leki"],
    [104, "leki"],
    [112, "leków"],
  ])("%s %s", (n, word) => expect(pluralLeki(n)).toBe(word));

  it.each([
    [1, "kropla"],
    [2, "krople"],
    [5, "kropli"],
    [12, "kropli"],
    [22, "krople"],
    [1.5, "kropli"],
  ])("%s %s", (n, word) => expect(pluralKrople(n)).toBe(word));

  it("dni", () => {
    expect(pluralDni(1)).toBe("dzień");
    expect(pluralDni(2)).toBe("dni");
    expect(pluralDni(0)).toBe("dni");
  });
});

describe("dawki", () => {
  const med = { packages: [pkg("p20", { strengthValue: 20 }), pkg("p10", { strengthValue: 10 })] };

  it("suma z kilku opakowań", () => {
    const d = dose("d", "rano", [
      ["p20", 1],
      ["p10", 1],
    ]);
    expect(doseTotal(med, d)).toBe(`30${NBSP}mg`);
    expect(doseBreakdown(med, d)).toBe(`1 × 20${NBSP}mg + 1 × 10${NBSP}mg`);
  });

  it("jedno opakowanie: ilość w sztukach, ułamki", () => {
    const d = dose("d", "rano", [["p20", 0.5]]);
    expect(doseTotal(med, d)).toBe(`10${NBSP}mg`);
    expect(doseBreakdown(med, d)).toBe("½ tabl.");
  });

  it("krople liczone w kroplach", () => {
    const drops = { packages: [pkg("k", { strengthValue: 1, strengthUnit: "krople", unitLabel: "krople" })] };
    expect(doseTotal(drops, dose("d", "rano", [["k", 15]]))).toBe(`15${NBSP}kropli`);
    expect(doseBreakdown(drops, dose("d", "rano", [["k", 2]]))).toBe("2 krople");
  });

  it("różne jednostki nie dają sumy", () => {
    const mixed = { packages: [pkg("a"), pkg("b", { strengthUnit: "µg" })] };
    const d = dose("d", "rano", [
      ["a", 1],
      ["b", 1],
    ]);
    expect(doseTotal(mixed, d)).toBe("");
  });
});

describe("formularze", () => {
  it("parseNumber: przecinek dziesiętny, reszta odrzucona", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber(" 20 ")).toBe(20);
    expect(parseNumber("0.25")).toBe(0.25);
    for (const bad of ["", "abc", "1.", ",5", "-1", "1e3", "1,5,0"]) expect(parseNumber(bad)).toBeNaN();
  });

  it("formatNumber po polsku", () => {
    expect(formatNumber(1.5)).toBe("1,5");
    expect(formatNumber(20)).toBe("20");
  });

  it("nazwy opakowań", () => {
    expect(packageName(pkg("a", { strengthValue: 2.5 }))).toBe(`2,5${NBSP}mg`);
    expect(packageName(pkg("b", { unitLabel: "ml", strengthUnit: "ml" }))).toBe("Butelka");
    expect(packageSizeLabel(pkg("a"))).toBe(`opak. 30${NBSP}tabl.`);
    expect(packageSizeLabel(pkg("s", { unitLabel: "ml", packageSize: 150 }))).toBe(`150${NBSP}ml`);
    const drops = pkg("k", { unitLabel: "krople", strengthUnit: "krople", packageSize: 300 });
    expect(packageSizeLabel(drops)).toBe(`300${NBSP}kropli`);
    expect(packageSizeLabel({ ...drops, packageSize: 22 })).toBe(`22${NBSP}krople`);
  });

  it("unitFor: odmienia tylko krople", () => {
    expect(unitFor(1, "krople")).toBe("kropla");
    expect(unitFor(120, "krople")).toBe("kropli");
    expect(unitFor(3, "krople")).toBe("krople");
    expect(unitFor(5, "tabl.")).toBe("tabl.");
    expect(unitFor(7.5, "ml")).toBe("ml");
  });
});
