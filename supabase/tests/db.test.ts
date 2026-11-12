import { beforeAll, describe, expect, it } from "vitest";
import { createDb, createUser, pgError, type Db } from "./harness";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

let db: Db;
let today: string;
let medId: string;
let doseId: string;
let pkg20: string;
let pkg10: string;

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const res = await db.query<T>(sql, params);
  return res.rows[0];
}

async function stock(pkgId: string): Promise<number> {
  await db.asAdmin();
  const row = await one<{ stock_cached: string }>("select stock_cached from public.med_packages where id = $1", [pkgId]);
  return Number(row.stock_cached);
}

function day(offset: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

beforeAll(async () => {
  db = await createDb();
  await createUser(db, A, "jan@leki.local");
  await createUser(db, B, "ola@leki.local");
  today = (await one<{ d: string }>("select public.warsaw_today()::text as d")).d;

  await db.as(A);
  const slot = await one<{ id: string }>("select id from public.time_slots order by sort_order limit 1");
  const created = await one<{ id: string }>("select public.create_medication($1::jsonb) as id", [
    JSON.stringify({
      name: "Prednizon",
      form: "tablet",
      packages: [
        { strength_value: 20, strength_unit: "mg", unit_label: "tabl.", package_size: 30, stock: 30 },
        { strength_value: 10, strength_unit: "mg", unit_label: "tabl.", package_size: 20, stock: 20 },
      ],
      periods: [
        {
          valid_from: day(-10),
          valid_to: null,
          doses: [
            {
              slot_id: slot.id,
              exact_time: null,
              parts: [
                { package_index: 0, quantity: 1 },
                { package_index: 1, quantity: 0.5 },
              ],
            },
          ],
        },
      ],
    }),
  ]);
  medId = created.id;
  doseId = (await one<{ id: string }>("select id from public.period_doses")).id;
  pkg20 = (await one<{ id: string }>("select id from public.med_packages where strength_value = 20")).id;
  pkg10 = (await one<{ id: string }>("select id from public.med_packages where strength_value = 10")).id;
}, 60_000);

describe("nowe konto", () => {
  it("trigger zakłada profil i 7 pór dnia", async () => {
    await db.as(B);
    const profile = await one<{ username: string; low_stock_days: number }>("select username, low_stock_days from public.profiles");
    expect(profile).toEqual({ username: "ola", low_stock_days: 7 });
    const slots = await db.query("select 1 from public.time_slots");
    expect(slots.rows).toHaveLength(7);
  });
});

describe("create_medication", () => {
  it("stan początkowy jako ruch correction", async () => {
    expect(await stock(pkg20)).toBe(30);
    expect(await stock(pkg10)).toBe(20);
    const moves = await db.query("select reason from public.stock_movements where package_id = $1", [pkg20]);
    expect(moves.rows).toEqual([{ reason: "correction" }]);
  });

  it("bez opakowania odrzuca", async () => {
    await db.as(A);
    const err = await pgError(db.query("select public.create_medication($1::jsonb)", [JSON.stringify({ name: "X", form: "tablet", packages: [] })]));
    expect(err.hint).toBe("no_packages");
  });
});

describe("odhaczanie i ruchy stanu", () => {
  it("take_dose zapisuje przyjęcie i odejmuje każdy składnik dawki", async () => {
    await db.as(A);
    await db.query("select public.take_dose($1, $2::date)", [doseId, today]);
    expect(await stock(pkg20)).toBe(29);
    expect(await stock(pkg10)).toBe(19.5);

    await db.asAdmin();
    const log = await one<{ user_id: string }>("select user_id from public.intake_log where period_dose_id = $1 and date = $2", [doseId, today]);
    expect(log.user_id).toBe(A);
    const moves = await db.query("select delta::float as delta from public.stock_movements where reason = 'intake' order by delta");
    expect(moves.rows).toEqual([{ delta: -1 }, { delta: -0.5 }]);
  });

  it("drugie odhaczenie tej samej dawki niczego nie odejmuje (idempotentne)", async () => {
    await db.as(A);
    await db.query("select public.take_dose($1, $2::date)", [doseId, today]);
    expect(await stock(pkg20)).toBe(29);
  });

  it("untake_dose usuwa przyjęcie i przywraca stan", async () => {
    await db.as(A);
    await db.query("select public.untake_dose($1, $2::date)", [doseId, today]);
    expect(await stock(pkg20)).toBe(30);
    expect(await stock(pkg10)).toBe(20);
    await db.asAdmin();
    const left = await db.query("select 1 from public.stock_movements where reason = 'intake'");
    expect(left.rows).toHaveLength(0);
  });

  it("take_slot odhacza kilka dawek naraz", async () => {
    await db.as(A);
    await db.query("select public.take_slot($1::uuid[], $2::date)", [[doseId], day(-1)]);
    expect(await stock(pkg20)).toBe(29);
    await db.as(A);
    await db.query("select public.untake_dose($1, $2::date)", [doseId, day(-1)]);
    expect(await stock(pkg20)).toBe(30);
  });

  it("dawka, która jeszcze nie obowiązuje: odrzucone", async () => {
    await db.as(A);
    const slot = await one<{ id: string }>("select id from public.time_slots order by sort_order limit 1");
    const med = await one<{ id: string }>("select public.create_medication($1::jsonb) as id", [
      JSON.stringify({
        name: "Od jutra",
        form: "capsule",
        packages: [{ strength_value: 5, strength_unit: "mg", unit_label: "kaps.", package_size: 10, stock: 10 }],
        periods: [{ valid_from: day(1), valid_to: null, doses: [{ slot_id: slot.id, parts: [{ package_index: 0, quantity: 1 }] }] }],
      }),
    ]);
    const dose = await one<{ id: string }>(
      "select d.id from public.period_doses d join public.dosing_periods p on p.id = d.period_id where p.medication_id = $1",
      [med.id],
    );
    const err = await pgError(db.query("select public.take_dose($1, $2::date)", [dose.id, today]));
    expect(err.hint).toBe("dose_not_active");
  });
});

describe("strażnik daty", () => {
  it("wczoraj można, przedwczoraj i jutro nie", async () => {
    await db.as(A);
    const dose = await one<{ id: string }>(
      "select d.id from public.period_doses d join public.dosing_periods p on p.id = d.period_id where p.valid_from <= $1::date order by p.valid_from desc limit 1",
      [day(-1)],
    );
    await db.query("select public.take_dose($1, $2::date)", [dose.id, day(-1)]);
    await db.query("select public.untake_dose($1, $2::date)", [dose.id, day(-1)]);

    for (const date of [day(-2), day(1)]) {
      const err = await pgError(db.query("select public.take_dose($1, $2::date)", [dose.id, date]));
      expect(err.hint, date).toBe("date_not_editable");
      const undo = await pgError(db.query("select public.untake_dose($1, $2::date)", [dose.id, date]));
      expect(undo.hint, date).toBe("date_not_editable");
    }
  });

  it("trigger na intake_log blokuje też bezpośredni zapis z klienta", async () => {
    await db.as(A);
    const err = await pgError(db.query("insert into public.intake_log (period_dose_id, date) values ($1, $2::date)", [doseId, day(-5)]));
    expect(err.hint).toBe("date_not_editable");
  });

  it("starego wpisu nie da się usunąć ani przenieść", async () => {
    await db.asAdmin(); // administrator (bez auth.uid) omija strażnika: dane historyczne
    await db.query("insert into public.intake_log (user_id, period_dose_id, date) values ($1, $2, $3::date)", [A, doseId, day(-5)]);

    await db.as(A);
    const del = await pgError(db.query("delete from public.intake_log where date = $1::date", [day(-5)]));
    expect(del.hint).toBe("date_not_editable");
    const move = await pgError(db.query("update public.intake_log set date = $1::date where date = $2::date", [today, day(-5)]));
    expect(move.hint).toBe("date_not_editable");
  });
});

describe("ochrona historii", () => {
  it("dawki z odhaczeniem nie da się usunąć przy edycji okresu", async () => {
    await db.as(A);
    const period = await one<{ id: string }>("select period_id as id from public.period_doses where id = $1", [doseId]);
    const err = await pgError(db.query("select public.replace_period_doses($1, '[]'::jsonb)", [period.id]));
    expect(err.hint, `${err.code} ${err.message}`).toBe("dose_has_history");
  });

  it("okresu z odhaczeniem nie da się usunąć", async () => {
    await db.as(A);
    const period = await one<{ id: string }>("select period_id as id from public.period_doses where id = $1", [doseId]);
    const err = await pgError(db.query("select public.delete_period($1)", [period.id]));
    expect(err.hint, `${err.code} ${err.message}`).toBe("period_has_history");
  });

  it("opakowania użytego w dawce nie da się usunąć (kod, który rozpoznaje aplikacja)", async () => {
    await db.as(A);
    const err = await pgError(db.query("delete from public.med_packages where id = $1", [pkg20]));
    expect(["23503", "23001"]).toContain(err.code);
  });

  it("leku z historią nie da się usunąć", async () => {
    await db.as(A);
    const err = await pgError(db.query("select public.delete_medication($1)", [medId]));
    expect(err.hint).toBe("medication_has_history");
  });

  it("okresy jednego leku nie mogą się nakładać", async () => {
    await db.as(A);
    const err = await pgError(
      db.query("insert into public.dosing_periods (medication_id, valid_from, valid_to) values ($1, $2::date, $3::date)", [medId, day(-3), day(3)]),
    );
    expect(err.code).toBe("23P01");
  });
});

describe("korekta stanu", () => {
  it("save_package ustawia stan ruchem correction o różnicę", async () => {
    await db.as(A);
    const before = await stock(pkg10);
    await db.as(A);
    await db.query("select public.save_package($1, $2, 10, 'mg', 'tabl.', 20, 50)", [medId, pkg10]);
    expect(await stock(pkg10)).toBe(50);
    await db.asAdmin();
    const last = await one<{ delta: number }>(
      "select delta::float as delta from public.stock_movements where package_id = $1 order by created_at desc, delta desc limit 1",
      [pkg10],
    );
    expect(last.delta).toBe(50 - before);
  });

  it("zakup (purchase) dopisuje się do stanu", async () => {
    await db.as(A);
    const before = await stock(pkg20);
    await db.as(A);
    await db.query("insert into public.stock_movements (package_id, delta, reason) values ($1, 30, 'purchase')", [pkg20]);
    expect(await stock(pkg20)).toBe(before + 30);
  });
});

describe("RLS: użytkownik B nie widzi danych A", () => {
  it("odczyt: puste wyniki we wszystkich tabelach z danymi A", async () => {
    await db.as(B);
    for (const table of ["medications", "med_packages", "dosing_periods", "period_doses", "period_dose_parts", "intake_log", "stock_movements"]) {
      const res = await db.query(`select 1 from public.${table}`);
      expect(res.rows, table).toHaveLength(0);
    }
    const slots = await db.query("select user_id from public.time_slots where user_id <> $1", [B]);
    expect(slots.rows).toHaveLength(0);
    const profiles = await db.query("select id from public.profiles");
    expect(profiles.rows).toEqual([{ id: B }]);
  });

  it("zmiany i usunięcia danych A nie dotykają żadnego wiersza", async () => {
    await db.as(B);
    const upd = await db.query("update public.medications set name = 'Przejęty' where id = $1", [medId]);
    expect(upd.affectedRows).toBe(0);
    const del = await db.query("delete from public.med_packages where id = $1", [pkg20]);
    expect(del.affectedRows).toBe(0);
    await db.asAdmin();
    expect((await one<{ name: string }>("select name from public.medications where id = $1", [medId])).name).toBe("Prednizon");
  });

  it("nie odhaczy dawki A ani nie zmieni stanu opakowania A", async () => {
    const before = await stock(pkg20);
    await db.as(B);
    const take = await pgError(db.query("select public.take_dose($1, $2::date)", [doseId, today]));
    expect(take.hint).toBe("dose_not_active");
    const move = await pgError(db.query("insert into public.stock_movements (package_id, delta, reason) values ($1, 100, 'purchase')", [pkg20]));
    expect(move.code).toBe("42501");
    const correction = await pgError(db.query("select public.save_package($1, $2, 20, 'mg', 'tabl.', 30, 999)", [medId, pkg20]));
    expect(correction.code).toBe("P0002");
    expect(await stock(pkg20)).toBe(before);
  });

  it("nie doda okresu do leku A", async () => {
    await db.as(B);
    const period = await pgError(
      db.query("insert into public.dosing_periods (medication_id, valid_from) values ($1, $2::date)", [medId, day(100)]),
    );
    expect(period.code).toBe("42501");
  });

  it("nie wstawi wiersza z cudzym user_id", async () => {
    await db.as(B);
    const err = await pgError(db.query("insert into public.medications (user_id, name, form) values ($1, 'X', 'tablet')", [A]));
    expect(err.code).toBe("42501");
  });

  it("anon nie ma dostępu do tabel ani funkcji", async () => {
    await db.as(null);
    const read = await pgError(db.query("select 1 from public.medications"));
    expect(read.code).toBe("42501");
    const rpc = await pgError(db.query("select public.take_dose($1, $2::date)", [doseId, today]));
    expect(rpc.code).toBe("42501");
  });

  it("notification_candidates tylko dla service_role", async () => {
    await db.as(A);
    const err = await pgError(db.query("select * from public.notification_candidates()"));
    expect(err.code).toBe("42501");
  });
});
