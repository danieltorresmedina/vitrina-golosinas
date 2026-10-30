// Pruebas automáticas del cálculo de precios. Se ejecutan con: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrecio, calcularGananciaUnitaria, redondearHaciaArribaA10 } from '../src/utilidades/precios.js';

test('costo neto + 40 % de margen + IVA 19 %, redondeado hacia arriba a $10', () => {
  const r = calcularPrecio({ costoUnitario: 1000, incluyeIva: false, ivaPct: 19, margenPct: 40 });
  assert.equal(r.costoNeto, 1000);
  assert.equal(r.precioNeto, 1400);
  assert.equal(Math.round(r.montoIva), 266);
  assert.equal(Math.round(r.precioExacto), 1666);
  assert.equal(r.precio, 1670);
});

test('si el costo ya incluye IVA, primero se le quita', () => {
  const r = calcularPrecio({ costoUnitario: 1190, incluyeIva: true, ivaPct: 19, margenPct: 40 });
  assert.ok(Math.abs(r.costoNeto - 1000) < 1e-9);
  assert.equal(r.precio, 1670);
});

test('margen 0 con IVA exacto no sube de más por error de punto flotante', () => {
  const r = calcularPrecio({ costoUnitario: 1000, incluyeIva: false, ivaPct: 19, margenPct: 0 });
  assert.equal(r.precio, 1190);
});

test('la ganancia por unidad usa el precio ya redondeado y sin IVA', () => {
  const r = calcularPrecio({ costoUnitario: 1000, incluyeIva: false, ivaPct: 19, margenPct: 40 });
  assert.ok(Math.abs(r.ganancia - (1670 / 1.19 - 1000)) < 1e-9);
  assert.equal(r.ganancia, calcularGananciaUnitaria({ precio: 1670, ivaPct: 19, costoNeto: 1000 }));
});

test('campos vacíos del formulario no producen NaN', () => {
  const r = calcularPrecio({ costoUnitario: '', incluyeIva: false, ivaPct: '', margenPct: '' });
  assert.equal(r.precio, 0);
  assert.ok(Number.isFinite(r.ganancia));
});

test('redondearHaciaArribaA10', () => {
  assert.equal(redondearHaciaArribaA10(1), 10);
  assert.equal(redondearHaciaArribaA10(10), 10);
  assert.equal(redondearHaciaArribaA10(10.01), 20);
});
