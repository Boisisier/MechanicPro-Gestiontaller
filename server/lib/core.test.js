import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBudgetTotal,
  normalizePatente,
  splitServicePrice,
} from "./core.js";

test("normaliza patentes chilenas antiguas y nuevas", () => {
  assert.equal(normalizePatente("pjvz76"), "PJVZ-76");
  assert.equal(normalizePatente("ab1234"), "AB-1234");
});

test("calcula presupuesto con descuento e IVA", () => {
  assert.equal(
    calculateBudgetTotal(
      [{ quantity: 2, unit_price: 10_000 }],
      10,
      19,
    ),
    21_420,
  );
});

test("limita porcentajes comerciales", () => {
  assert.equal(
    calculateBudgetTotal([{ quantity: 1, unit_price: 10_000 }], 150, 19),
    0,
  );
});

test("separa nombre y precio histórico del servicio", () => {
  assert.deepEqual(splitServicePrice("Diagnóstico general ($20.000)"), {
    name: "Diagnóstico general",
    price: "20000",
  });
});
