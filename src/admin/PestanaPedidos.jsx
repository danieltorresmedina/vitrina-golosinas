/**
 * Pestaña "Pedidos": los pedidos que los clientes enviaron desde el carro (últimos 100).
 * Sirve como registro; la confirmación y el pago se coordinan por WhatsApp.
 */
import { eliminarPedido, listarPedidos } from '../servicios/baseDatos';
import { formatearPesos } from '../utilidades/dinero';
import { usarCarga } from './usarCarga';

const formatoFechaHora = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

export default function PestanaPedidos() {
  const { datos, error, cargando, recargar } = usarCarga(listarPedidos);

  async function eliminar(pedido) {
    if (!window.confirm(`¿Eliminar el pedido #${pedido.codigo}?`)) return;
    try {
      await eliminarPedido(pedido.id);
    } catch (e) {
      window.alert(e.message);
    }
    recargar();
  }

  if (cargando && !datos) return <p className="aviso">Cargando…</p>;
  if (error) return <p className="error" role="alert">No se pudieron cargar los pedidos: {error.message}</p>;
  if (!datos.length) {
    return (
      <p className="aviso">
        Aún no llegan pedidos. Cuando un cliente use “Enviar pedido por WhatsApp” aparecerá aquí.
      </p>
    );
  }

  return (
    <ul className="pedidos">
      {datos.map((pedido) => (
        <li key={pedido.id} className="panel pedido">
          <div className="fila fila--separada">
            <strong>Pedido #{pedido.codigo}</strong>
            <span>{formatoFechaHora.format(new Date(pedido.creadoEn))}</span>
          </div>

          {(pedido.cliente || pedido.nota) && (
            <p className="pedido__datos">
              {pedido.cliente && <span>{pedido.cliente}</span>}
              {pedido.nota && <em>“{pedido.nota}”</em>}
            </p>
          )}

          <ul className="pedido__articulos">
            {pedido.articulos.map((articulo, posicion) => (
              <li key={posicion}>
                {articulo.cantidad} × {articulo.nombre} <span>{formatearPesos(articulo.precio * articulo.cantidad)}</span>
              </li>
            ))}
          </ul>

          <div className="fila fila--separada">
            <strong>Total {formatearPesos(pedido.total)}</strong>
            <button className="boton boton--peligro" onClick={() => eliminar(pedido)}>Eliminar</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
