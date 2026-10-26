import { clp } from './money';

// Código corto y legible para ubicar el pedido (sin 0/O ni 1/I).
export function orderCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function buildMessage({ code, name, note, items, total, storeName }) {
  const lines = [
    `Hola${storeName ? ` ${storeName}` : ''}! Quiero hacer este pedido 🍬`,
    `Pedido #${code}`,
    '',
    ...items.map((i) => `• ${i.qty} x ${i.name} — ${clp(i.price * i.qty)}`),
    '',
    `Total: ${clp(total)}`,
  ];
  if (name) lines.push(`Nombre: ${name}`);
  if (note) lines.push(`Nota: ${note}`);
  lines.push('', '¿Me confirmas disponibilidad y la entrega?');
  return lines.join('\n');
}

export function waUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
