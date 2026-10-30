/**
 * Panel lateral del carro: lista de productos, datos opcionales del cliente y botón de envío.
 *
 * Flujo al presionar "Enviar pedido por WhatsApp":
 *   1. Se genera un código de pedido (ej. 4MY7H) y se arma el mensaje.
 *   2. Se guarda el pedido en Supabase para tu registro (máximo 2,5 s de espera).
 *   3. Se abre WhatsApp con el mensaje escrito. Si falla el guardado, el pedido igual sale por WhatsApp.
 */
import { useEffect, useState } from 'react';
import { usarCarro } from '../estado/CarroContexto.jsx';
import { formatearPesos } from '../utilidades/dinero';
import { guardarPedido } from '../servicios/baseDatos';
import { armarMensaje, armarUrlWhatsapp, generarCodigoPedido, hayNumeroWhatsapp } from '../utilidades/whatsapp';

const ESPERA_MAXIMA_GUARDADO_MS = 2500;

export default function Carro({ abierto, alCerrar, numeroWhatsapp, nombreTienda }) {
  const { articulos, total, agregar, quitarUno, eliminar, vaciar } = usarCarro();
  const [cliente, setCliente] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(null); // { url, codigo } cuando ya se envió
  const [mensajeError, setMensajeError] = useState('');

  // Mientras el panel está abierto: Escape lo cierra y la página de atrás no se desplaza.
  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionarTecla = (evento) => evento.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', alPresionarTecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.body.style.overflow = '';
    };
  }, [abierto, alCerrar]);

  async function enviarPedido() {
    setMensajeError('');
    if (!hayNumeroWhatsapp(numeroWhatsapp)) {
      setMensajeError('La tienda aún no tiene un número de WhatsApp configurado.');
      return;
    }

    const codigo = generarCodigoPedido();
    const datosPedido = { codigo, cliente: cliente.trim(), nota: nota.trim(), articulos, total };
    const url = armarUrlWhatsapp(numeroWhatsapp, armarMensaje({ ...datosPedido, nombreTienda }));

    setEnviando(true);
    // Se guarda el pedido, pero el cliente nunca espera más del tiempo máximo.
    await Promise.race([
      guardarPedido(datosPedido).catch(() => {}),
      new Promise((resolver) => setTimeout(resolver, ESPERA_MAXIMA_GUARDADO_MS)),
    ]);
    setEnviando(false);

    setPedidoEnviado({ url, codigo });
    vaciar();
    window.location.href = url; // abre WhatsApp
  }

  if (!abierto) return null;

  return (
    <div className="carro-contenedor" role="presentation">
      <button className="carro-fondo" aria-label="Cerrar carro" onClick={alCerrar} />
      <aside className="carro" role="dialog" aria-modal="true" aria-label="Mi carro">
        <div className="carro__cabecera">
          <h2>Mi carro</h2>
          <button className="boton boton--fantasma" onClick={alCerrar}>Cerrar</button>
        </div>

        {pedidoEnviado ? (
          // Pantalla de confirmación (por si WhatsApp no se abrió solo)
          <div className="carro__vacio">
            <p>
              Tu pedido <strong>#{pedidoEnviado.codigo}</strong> está listo. Si WhatsApp no se abrió, toca el
              botón para enviarlo.
            </p>
            <a className="boton boton--whatsapp" href={pedidoEnviado.url}>Abrir WhatsApp</a>
          </div>
        ) : articulos.length === 0 ? (
          <div className="carro__vacio">
            <p>Tu carro está vacío. Agrega golosinas desde la vitrina.</p>
            <button className="boton boton--chicle" onClick={alCerrar}>Ver productos</button>
          </div>
        ) : (
          <>
            <ul className="lineas">
              {articulos.map((articulo) => (
                <li key={articulo.id} className="linea">
                  <div className="linea__info">
                    <strong>{articulo.nombre}</strong>
                    <span>{formatearPesos(articulo.precio)} c/u</span>
                  </div>
                  <div className="selector-cantidad selector-cantidad--chico" role="group" aria-label={`Cantidad de ${articulo.nombre}`}>
                    <button onClick={() => quitarUno(articulo.id)} aria-label="Quitar uno">−</button>
                    <span>{articulo.cantidad}</span>
                    <button onClick={() => agregar(articulo)} aria-label="Agregar uno">+</button>
                  </div>
                  <b className="linea__suma">{formatearPesos(articulo.precio * articulo.cantidad)}</b>
                  <button className="linea__quitar" onClick={() => eliminar(articulo.id)} aria-label={`Quitar ${articulo.nombre}`}>×</button>
                </li>
              ))}
            </ul>

            <div className="carro__formulario">
              <label className="campo">
                <span>Tu nombre (opcional)</span>
                <input value={cliente} maxLength={80} onChange={(e) => setCliente(e.target.value)} autoComplete="name" />
              </label>
              <label className="campo">
                <span>Nota para el pedido (opcional)</span>
                <input
                  value={nota}
                  maxLength={300}
                  placeholder="Ej: retiro en la tarde, sin coco…"
                  onChange={(e) => setNota(e.target.value)}
                />
              </label>
            </div>

            <div className="carro__pie">
              <div className="total">
                <span>Total</span>
                <strong>{formatearPesos(total)}</strong>
              </div>
              {mensajeError && <p className="error" role="alert">{mensajeError}</p>}
              <button className="boton boton--whatsapp boton--ancho" onClick={enviarPedido} disabled={enviando}>
                {enviando ? 'Preparando pedido…' : 'Enviar pedido por WhatsApp'}
              </button>
              <p className="ayuda">Se abrirá WhatsApp con tu pedido escrito. Coordinamos pago y entrega por ahí.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
