/** Formato de pesos chilenos: 1670 → "$1.670". Sin decimales. */
const formatoPesos = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const formatearPesos = (monto) => formatoPesos.format(Math.round(Number(monto) || 0));
