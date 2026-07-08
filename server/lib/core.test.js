import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBudgetTotal,
  formatRut,
  isValidRut,
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

test("valida RUT chileno con dígito verificador módulo 11", () => {
  assert.equal(isValidRut("11.111.111-1"), true);
  assert.equal(isValidRut("11111111-1"), true);
  assert.equal(isValidRut("111111111"), true);
  assert.equal(isValidRut("7.654.321-6"), true);
  assert.equal(isValidRut("11.111.111-2"), false);
  assert.equal(isValidRut("abc"), false);
  assert.equal(isValidRut(""), false);
});

test("acepta K como dígito verificador y es insensible a mayúsculas", () => {
  assert.equal(isValidRut("9.878.635-k"), true);
  assert.equal(isValidRut("9.878.635-K"), true);
});

test("formatea RUT con puntos y guión", () => {
  assert.equal(formatRut("111111111"), "11.111.111-1");
  assert.equal(formatRut("98786350"), "9.878.635-0");
});
