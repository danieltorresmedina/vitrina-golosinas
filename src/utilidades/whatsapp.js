/**
 * Arma el mensaje del pedido y el enlace que abre WhatsApp con ese mensaje escrito.
 * El cliente solo tiene que presionar "enviar" (no hace falta la API de pago de WhatsApp Business).
 */
import { formatearPesos } from './dinero';

/** Código corto para ubicar el pedido. Sin 0/O ni 1/I para que no se confundan al leerlo. */
export function generarCodigoPedido() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => letras[byte % letras.length]).join('');
}

/** Texto del pedido, listo para enviarse por WhatsApp. */
export function armarMensaje({ codigo, cliente, nota, articulos, total, nombreTienda }) {
  const lineas = [
    `Hola${nombreTienda ? ` ${nombreTienda}` : ''}! Quiero hacer este pedido 🍬`,
    `Pedido #${codigo}`,
    '',
    ...articulos.map((i) => `• ${i.cantidad} x ${i.nombre} — ${formatearPesos(i.precio * i.cantidad)}`),
    '',
    `Total: ${formatearPesos(total)}`,
  ];
  if (cliente) lineas.push(`Nombre: ${cliente}`);
  if (nota) lineas.push(`Nota: ${nota}`);
  lineas.push('', '¿Me confirmas disponibilidad y la entrega?');
  return lineas.join('\n');
}

/** Enlace https://wa.me/<número>?text=<mensaje>. El número va solo con dígitos y código de país. */
export function armarUrlWhatsapp(numero, mensaje) {
  const soloDigitos = String(numero || '').replace(/\D/g, '');
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(mensaje)}`;
}

/** true si el número tiene dígitos (para avisar si la tienda aún no lo configuró). */
export const hayNumeroWhatsapp = (numero) => String(numero || '').replace(/\D/g, '').length > 0;
