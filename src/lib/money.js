const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const clp = (n) => fmt.format(Math.round(Number(n) || 0));
