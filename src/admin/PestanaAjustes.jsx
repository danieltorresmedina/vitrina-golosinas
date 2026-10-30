/**
 * Pestaña "Ajustes": datos generales de la tienda.
 *   - Nombre de la tienda (se ve en la vitrina y en el mensaje de WhatsApp)
 *   - WhatsApp que recibe los pedidos (con código de país, sin "+")
 *   - IVA y margen sugerido (valores iniciales de la pestaña Compras)
 */
import { useEffect, useState } from 'react';
import { guardarAjustes, leerAjustes } from '../servicios/baseDatos';
import { usarCarga } from './usarCarga';

export default function PestanaAjustes() {
  const { datos, error, cargando } = usarCarga(leerAjustes);
  const [campos, setCampos] = useState(null); // null mientras se cargan los ajustes
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'exito' | 'error', texto }

  // Cuando llegan los ajustes guardados se rellena el formulario (o valores iniciales si no hay).
  useEffect(() => {
    if (!cargando && !error) {
      setCampos({
        nombreTienda: datos?.nombreTienda ?? '',
        whatsapp: datos?.whatsapp ?? '',
        ivaPct: datos?.ivaPct ?? 19,
        margenSugeridoPct: datos?.margenSugeridoPct ?? 40,
      });
    }
  }, [datos, cargando, error]);

  const cambiar = (campo) => (evento) =>
    setCampos((anteriores) => ({ ...anteriores, [campo]: evento.target.value }));

  async function guardar(evento) {
    evento.preventDefault();
    setMensaje(null);

    const soloDigitos = campos.whatsapp.replace(/\D/g, '');
    if (soloDigitos.length < 10) {
      return setMensaje({
        tipo: 'error',
        texto: 'El WhatsApp debe incluir el código de país, por ejemplo 56912345678.',
      });
    }

    setOcupado(true);
    try {
      await guardarAjustes({
        nombreTienda: campos.nombreTienda.trim() || 'Mi dulcería',
        whatsapp: soloDigitos,
        ivaPct: Number(campos.ivaPct) || 0,
        margenSugeridoPct: Number(campos.margenSugeridoPct) || 0,
      });
      setMensaje({ tipo: 'exito', texto: 'Ajustes guardados.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
    setOcupado(false);
  }

  if (error) return <p className="error" role="alert">No se pudieron cargar los ajustes: {error.message}</p>;
  if (!campos) return <p className="aviso">Cargando…</p>;

  return (
    <form className="panel formulario" onSubmit={guardar}>
      <h2>Ajustes de la tienda</h2>

      <label className="campo">
        <span>Nombre de la tienda</span>
        <input required maxLength={60} value={campos.nombreTienda} onChange={cambiar('nombreTienda')} />
      </label>
      <label className="campo">
        <span>WhatsApp que recibe los pedidos</span>
        <input inputMode="tel" required value={campos.whatsapp} onChange={cambiar('whatsapp')} placeholder="56912345678" />
        <small>Con código de país y sin “+” ni espacios. Chile: 56 + 9 + tu número.</small>
      </label>

      <div className="dos-columnas">
        <label className="campo">
          <span>IVA (%)</span>
          <input type="number" min="0" step="any" required value={campos.ivaPct} onChange={cambiar('ivaPct')} />
        </label>
        <label className="campo">
          <span>Margen sugerido (%)</span>
          <input type="number" min="0" step="any" required value={campos.margenSugeridoPct} onChange={cambiar('margenSugeridoPct')} />
        </label>
      </div>

      {mensaje && (
        <p className={mensaje.tipo === 'exito' ? 'exito' : 'error'} role={mensaje.tipo === 'exito' ? 'status' : 'alert'}>
          {mensaje.texto}
        </p>
      )}
      <button className="boton boton--chicle" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar ajustes'}</button>
    </form>
  );
}
