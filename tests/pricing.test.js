import test from 'node:test';
import assert from 'node:assert/strict';
import { calcPrice, roundUpTo10 } from '../src/lib/pricing.js';

test('costo neto + 40% + IVA 19%, redondeado hacia arriba a $10', () => {
  const r = calcPrice({ unitCost: 1000, includesIva: false, ivaPct: 19, marginPct: 40 });
  assert.equal(r.netCost, 1000);
  assert.equal(r.netPrice, 1400);
  assert.equal(Math.round(r.ivaAmount), 266);
  assert.equal(Math.round(r.exactPrice), 1666);
  assert.equal(r.price, 1670);
});

test('si el costo ya incluye IVA, primero se le quita', () => {
  const r = calcPrice({ unitCost: 1190, includesIva: true, ivaPct: 19, marginPct: 40 });
  assert.ok(Math.abs(r.netCost - 1000) < 1e-9);
  assert.equal(r.price, 1670);
});

test('margen 0 con IVA exacto no sube de más por error de punto flotante', () => {
  const r = calcPrice({ unitCost: 1000, includesIva: false, ivaPct: 19, marginPct: 0 });
  assert.equal(r.price, 1190);
});

test('ganancia por unidad usa el precio ya redondeado, sin IVA', () => {
  const r = calcPrice({ unitCost: 1000, includesIva: false, ivaPct: 19, marginPct: 40 });
  assert.ok(Math.abs(r.profit - (1670 / 1.19 - 1000)) < 1e-9);
});

test('entradas vacías no producen NaN', () => {
  const r = calcPrice({ unitCost: '', includesIva: false, ivaPct: '', marginPct: '' });
  assert.equal(r.price, 0);
  assert.ok(Number.isFinite(r.profit));
});

test('roundUpTo10', () => {
  assert.equal(roundUpTo10(1), 10);
  assert.equal(roundUpTo10(10), 10);
  assert.equal(roundUpTo10(10.01), 20);
});
