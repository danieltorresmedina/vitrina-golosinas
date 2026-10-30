/**
 * Cálculo del precio de venta. Son funciones puras (sin pantalla ni base de datos),
 * por eso tienen pruebas automáticas en tests/precios.test.js (`npm test`).
 *
 * Fórmula:
 *   costo neto  = costo ingresado          (si el costo ya incluye IVA: costo ÷ (1 + IVA%))
 *   precio neto = costo neto × (1 + margen%)     ← el margen es SOBRE EL COSTO
 *   precio      = precio neto × (1 + IVA%)       ← luego se redondea hacia arriba a $10
 *   ganancia    = precio ÷ (1 + IVA%) − costo neto
 *
 * Ejemplo: costo $1.000, margen 40 %, IVA 19 %  →  $1.666  →  precio final $1.670.
 */

/** Redondea hacia ARRIBA a la decena (en Chile la moneda mínima es $10). */
export function redondearHaciaArribaA10(monto) {
  // Primero se redondea a 2 decimales para evitar errores de punto flotante
  // (por ejemplo 1190.0000001 subiría a 1200 sin necesidad).
  const montoLimpio = Math.round(monto * 100) / 100;
  return Math.ceil(montoLimpio / 10) * 10;
}

/** Lo que te queda por unidad: precio sin IVA (ya redondeado) menos el costo neto. */
export function calcularGananciaUnitaria({ precio, ivaPct, costoNeto }) {
  return precio / (1 + ivaPct / 100) - costoNeto;
}

/**
 * @param {object} datos
 * @param {number|string} datos.costoUnitario  costo por unidad, tal como lo ingresó el usuario
 * @param {boolean} datos.incluyeIva           true si ese costo ya trae IVA
 * @param {number|string} datos.ivaPct         IVA en porcentaje (19)
 * @param {number|string} datos.margenPct      margen de ganancia en porcentaje sobre el costo
 * @returns {{costoNeto:number, precioNeto:number, montoIva:number, precioExacto:number, precio:number, ganancia:number}}
 */
export function calcularPrecio({ costoUnitario, incluyeIva, ivaPct, margenPct }) {
  // Los campos del formulario llegan como texto; si están vacíos se toman como 0.
  const costo = Number(costoUnitario) || 0;
  const iva = Number(ivaPct) || 0;
  const margen = Number(margenPct) || 0;

  const costoNeto = incluyeIva ? costo / (1 + iva / 100) : costo;
  const precioNeto = costoNeto * (1 + margen / 100);
  const montoIva = (precioNeto * iva) / 100;
  const precioExacto = precioNeto + montoIva;
  const precio = redondearHaciaArribaA10(precioExacto);
  const ganancia = calcularGananciaUnitaria({ precio, ivaPct: iva, costoNeto });

  return { costoNeto, precioNeto, montoIva, precioExacto, precio, ganancia };
}
