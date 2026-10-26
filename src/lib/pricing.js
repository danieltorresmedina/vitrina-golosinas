// Fórmula de precio: costo neto + margen % (sobre el costo) + IVA.
// El precio final se redondea HACIA ARRIBA a la decena (en Chile la moneda mínima es $10).

export function roundUpTo10(n) {
  const cents = Math.round(n * 100) / 100; // evita 1190.0000001 -> 1200
  return Math.ceil(cents / 10) * 10;
}

/**
 * @param {{unitCost:number, includesIva:boolean, ivaPct:number, marginPct:number}} p
 */
export function calcPrice({ unitCost, includesIva, ivaPct, marginPct }) {
  const cost = Number(unitCost) || 0;
  const iva = Number(ivaPct) || 0;
  const margin = Number(marginPct) || 0;

  const netCost = includesIva ? cost / (1 + iva / 100) : cost;
  const netPrice = netCost * (1 + margin / 100);
  const ivaAmount = (netPrice * iva) / 100;
  const exactPrice = netPrice + ivaAmount;
  const price = roundUpTo10(exactPrice);

  // Ganancia real por unidad: lo que te queda del precio sin IVA (ya redondeado) menos el costo neto.
  const profit = price / (1 + iva / 100) - netCost;

  return { netCost, netPrice, ivaAmount, exactPrice, price, profit };
}
