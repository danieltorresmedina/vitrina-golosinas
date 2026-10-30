/**
 * Pestaña "Compras": registras lo que compraste (costo, margen, IVA) y la pantalla calcula
 * el precio de venta en vivo. Al guardar, puede actualizar el precio del producto.
 *
 * La fórmula está en utilidades/precios.js (con pruebas automáticas).
 * El historial de compras guarda el costo, margen y precio de ESE momento.
 */
import { useEffect, useMemo, useState } from 'react';
import { calcularGananciaUnitaria, calcularPrecio } from '../utilidades/precios';
import { formatearPesos } from '../utilidades/dinero';
import {
  actualizarPrecioProducto,
  leerAjustes,
  listarCompras,
  listarProductosAdmin,
  registrarCompra,
} from '../servicios/baseDatos';
import { usarCarga } from './usarCarga';

const fechaDeHoy = () => new Date().toISOString().slice(0, 10); // formato AAAA-MM-DD

export default function PestanaCompras() {
  const { datos, error, cargando, recargar } = usarCarga(async () => {
    const [productos, ajustes, compras] = await Promise.all([
      listarProductosAdmin(),
      leerAjustes(),
      listarCompras(),
    ]);
    return { productos, ajustes, compras };
  });

  // IVA y margen iniciales: los de la pestaña Ajustes (o 19 % y 40 % si aún no hay ajustes).
  const ivaPorDefecto = datos?.ajustes?.ivaPct ?? 19;
  const margenPorDefecto = datos?.ajustes?.margenSugeridoPct ?? 40;

  const [campos, setCampos] = useState({
    productoId: '',
    proveedor: '',
    cantidad: 1,
    costoUnitario: '',
    incluyeIva: false,
    ivaPct: '',
    margenPct: '',
    fechaCompra: fechaDeHoy(),
    aplicarPrecio: true,
  });
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'exito' | 'error', texto }

  // Cuando llegan los ajustes, se rellenan IVA y margen (solo si el usuario aún no los escribió).
  useEffect(() => {
    if (!datos) return;
    setCampos((anteriores) => ({
      ...anteriores,
      ivaPct: anteriores.ivaPct === '' ? ivaPorDefecto : anteriores.ivaPct,
      margenPct: anteriores.margenPct === '' ? margenPorDefecto : anteriores.margenPct,
    }));
  }, [datos, ivaPorDefecto, margenPorDefecto]);

  const cambiar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
  };

  // Se recalcula solo cuando cambian los datos que influyen en el precio.
  const calculo = useMemo(
    () =>
      calcularPrecio({
        costoUnitario: campos.costoUnitario,
        incluyeIva: campos.incluyeIva,
        ivaPct: campos.ivaPct,
        margenPct: campos.margenPct,
      }),
    [campos.costoUnitario, campos.incluyeIva, campos.ivaPct, campos.margenPct],
  );
  const cantidad = Math.max(0, Math.round(Number(campos.cantidad) || 0));
  const productoElegido = datos?.productos.find((p) => p.id === campos.productoId);

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje(null);

    if (!campos.productoId) return setMensaje({ tipo: 'error', texto: 'Elige un producto.' });
    if (campos.costoUnitario === '' || !(Number(campos.costoUnitario) >= 0)) {
      return setMensaje({ tipo: 'error', texto: 'Ingresa el costo unitario.' });
    }
    if (cantidad < 1) return setMensaje({ tipo: 'error', texto: 'La cantidad debe ser al menos 1.' });

    setOcupado(true);
    try {
      await registrarCompra({
        productoId: campos.productoId,
        proveedor: campos.proveedor.trim(),
        cantidad,
        costoUnitario: Number(campos.costoUnitario),
        costoIncluyeIva: campos.incluyeIva,
        ivaPct: Number(campos.ivaPct) || 0,
        margenPct: Number(campos.margenPct) || 0,
        costoNeto: Math.round(calculo.costoNeto * 100) / 100,
        precioSugerido: calculo.precio,
        fechaCompra: campos.fechaCompra || fechaDeHoy(),
      });
    } catch (e) {
      setOcupado(false);
      return setMensaje({ tipo: 'error', texto: e.message });
    }

    if (campos.aplicarPrecio) {
      try {
        await actualizarPrecioProducto(campos.productoId, calculo.precio);
      } catch (e) {
        setOcupado(false);
        return setMensaje({
          tipo: 'error',
          texto: `Compra guardada, pero no se actualizó el precio: ${e.message}`,
        });
      }
    }

    setOcupado(false);
    setMensaje({
      tipo: 'exito',
      texto: `Compra guardada${
        campos.aplicarPrecio
          ? ` y precio de “${productoElegido?.nombre}” actualizado a ${formatearPesos(calculo.precio)}`
          : ''
      }.`,
    });
    // Se limpian solo los datos de esta compra; producto, margen e IVA quedan para la siguiente.
    setCampos((anteriores) => ({ ...anteriores, proveedor: '', cantidad: 1, costoUnitario: '' }));
    recargar();
  }

  if (cargando && !datos) return <p className="aviso">Cargando…</p>;
  if (error) return <p className="error" role="alert">No se pudo cargar: {error.message}</p>;

  const { productos, compras } = datos;

  return (
    <section className="dividido">
      {/* ----- Formulario ----- */}
      <form className="panel formulario" onSubmit={guardar}>
        <h2>Registrar compra</h2>

        <label className="campo">
          <span>Producto</span>
          <select required value={campos.productoId} onChange={cambiar('productoId')}>
            <option value="">Elige un producto…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {productos.length === 0 && <small>Primero crea productos en la pestaña Productos.</small>}
        </label>

        <div className="dos-columnas">
          <label className="campo">
            <span>Cantidad comprada</span>
            <input type="number" min="1" step="1" required value={campos.cantidad} onChange={cambiar('cantidad')} />
          </label>
          <label className="campo">
            <span>Costo por unidad (CLP)</span>
            <input type="number" min="0" step="any" required value={campos.costoUnitario} onChange={cambiar('costoUnitario')} />
          </label>
        </div>

        <label className="casilla">
          <input type="checkbox" checked={campos.incluyeIva} onChange={cambiar('incluyeIva')} />
          El costo ya incluye IVA (boleta o factura con IVA incluido)
        </label>

        <div className="dos-columnas">
          <label className="campo">
            <span>Margen de ganancia (%)</span>
            <input type="number" min="0" step="any" required value={campos.margenPct} onChange={cambiar('margenPct')} />
            <small>Se calcula sobre el costo neto.</small>
          </label>
          <label className="campo">
            <span>IVA (%)</span>
            <input type="number" min="0" step="any" required value={campos.ivaPct} onChange={cambiar('ivaPct')} />
          </label>
        </div>

        <div className="dos-columnas">
          <label className="campo">
            <span>Proveedor (opcional)</span>
            <input value={campos.proveedor} maxLength={80} onChange={cambiar('proveedor')} />
          </label>
          <label className="campo">
            <span>Fecha de compra</span>
            <input type="date" required value={campos.fechaCompra} onChange={cambiar('fechaCompra')} />
          </label>
        </div>

        <label className="casilla">
          <input type="checkbox" checked={campos.aplicarPrecio} onChange={cambiar('aplicarPrecio')} />
          Actualizar el precio de venta del producto con este cálculo
        </label>

        {mensaje && (
          <p className={mensaje.tipo === 'exito' ? 'exito' : 'error'} role={mensaje.tipo === 'exito' ? 'status' : 'alert'}>
            {mensaje.texto}
          </p>
        )}
        <button className="boton boton--chicle" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar compra'}</button>
      </form>

      {/* ----- Desglose del precio, en vivo ----- */}
      <aside className="panel calculo" aria-live="polite">
        <h2>Así se arma el precio</h2>
        <dl>
          <div><dt>Costo neto por unidad</dt><dd>{formatearPesos(calculo.costoNeto)}</dd></div>
          <div><dt>+ Margen ({Number(campos.margenPct) || 0}%)</dt><dd>{formatearPesos(calculo.precioNeto - calculo.costoNeto)}</dd></div>
          <div><dt>Precio neto</dt><dd>{formatearPesos(calculo.precioNeto)}</dd></div>
          <div><dt>+ IVA ({Number(campos.ivaPct) || 0}%)</dt><dd>{formatearPesos(calculo.montoIva)}</dd></div>
          <div className="calculo__final"><dt>Precio de venta (redondeado a $10)</dt><dd>{formatearPesos(calculo.precio)}</dd></div>
        </dl>
        <div className="calculo__ganancia">
          <div><span>Ganancia por unidad</span><strong>{formatearPesos(calculo.ganancia)}</strong></div>
          <div><span>Ganancia del lote ({cantidad} u.)</span><strong>{formatearPesos(calculo.ganancia * cantidad)}</strong></div>
          <div><span>Inversión del lote (neto)</span><strong>{formatearPesos(calculo.costoNeto * cantidad)}</strong></div>
        </div>
        {productoElegido && Number(productoElegido.precio) > 0 && Number(productoElegido.precio) !== calculo.precio && (
          <p className="ayuda">Precio actual de “{productoElegido.nombre}”: {formatearPesos(productoElegido.precio)}.</p>
        )}
      </aside>

      {/* ----- Historial ----- */}
      <div className="dividido__ancho">
        <h2>Historial de compras</h2>
        {compras.length === 0 ? (
          <p className="aviso">Aún no registras compras.</p>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Producto</th><th>Cant.</th><th>Costo neto</th><th>Margen</th><th>Precio</th><th>Ganancia u.</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id}>
                    <td>{compra.fechaCompra}</td>
                    <td>
                      {compra.productoNombre ?? '—'}
                      {compra.proveedor ? <small> · {compra.proveedor}</small> : null}
                    </td>
                    <td>{compra.cantidad}</td>
                    <td>{formatearPesos(compra.costoNeto)}</td>
                    <td>{compra.margenPct}%</td>
                    <td>{formatearPesos(compra.precioSugerido)}</td>
                    <td>
                      {formatearPesos(
                        calcularGananciaUnitaria({
                          precio: compra.precioSugerido,
                          ivaPct: compra.ivaPct,
                          costoNeto: compra.costoNeto,
                        }),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
