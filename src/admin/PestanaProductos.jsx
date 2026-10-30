/**
 * Pestaña "Productos": lista, crea, edita, oculta y elimina productos, y sube su foto.
 *
 * La foto se reduce automáticamente (utilidades/imagen.js) antes de subirse a Supabase Storage.
 * El precio de venta se escribe a mano aquí, o se calcula en la pestaña "Compras".
 */
import { useState } from 'react';
import { comprimirImagen } from '../utilidades/imagen';
import { formatearPesos } from '../utilidades/dinero';
import {
  cambiarVisibilidadProducto,
  eliminarImagen,
  eliminarProducto,
  guardarProducto,
  listarProductosAdmin,
  subirImagen,
} from '../servicios/baseDatos';
import { usarCarga } from './usarCarga';

// Categorías sugeridas al escribir (además de las que ya existan en tus productos).
const CATEGORIAS_SUGERIDAS = ['Cuchuflíes', 'Cocadas', 'Gomitas', 'Packs'];

/** Formulario para crear un producto nuevo o editar uno existente. */
function FormularioProducto({ producto, categorias, alGuardar, alCancelar }) {
  const [campos, setCampos] = useState({
    nombre: producto?.nombre ?? '',
    categoria: producto?.categoria ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? '',
    activo: producto?.activo ?? true,
  });
  const [archivoNuevo, setArchivoNuevo] = useState(null); // foto elegida pero aún no subida
  const [vistaPrevia, setVistaPrevia] = useState(producto?.imagenUrl ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  // Devuelve un manejador que actualiza un solo campo (texto o casilla).
  const cambiar = (campo) => (evento) => {
    const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
  };

  function elegirImagen(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setArchivoNuevo(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  }

  async function guardar(evento) {
    evento.preventDefault();
    setOcupado(true);
    setMensajeError('');
    try {
      let imagenUrl = producto?.imagenUrl ?? null;

      // Si se eligió una foto nueva: se comprime, se sube y se borra la anterior.
      if (archivoNuevo) {
        const comprimida = await comprimirImagen(archivoNuevo);
        imagenUrl = await subirImagen(comprimida);
        if (producto?.imagenUrl) await eliminarImagen(producto.imagenUrl);
      }

      await guardarProducto({
        id: producto?.id, // si no hay id, se crea uno nuevo
        nombre: campos.nombre.trim(),
        categoria: campos.categoria.trim() || 'Otros',
        descripcion: campos.descripcion.trim(),
        precio: Math.max(0, Math.round(Number(campos.precio) || 0)),
        activo: campos.activo,
        imagenUrl,
      });
      alGuardar();
    } catch (error) {
      setMensajeError(error.message || 'No se pudo guardar el producto.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="panel formulario" onSubmit={guardar}>
      <h2>{producto ? 'Editar producto' : 'Nuevo producto'}</h2>

      <div className="subida">
        {vistaPrevia ? <img src={vistaPrevia} alt="Vista previa" /> : <div className="subida__vacia">Sin imagen</div>}
        <label className="boton boton--fantasma">
          {vistaPrevia ? 'Cambiar imagen' : 'Subir imagen'}
          <input type="file" accept="image/*" onChange={elegirImagen} hidden />
        </label>
        <small>Se reduce automáticamente a ~900 px para que cargue rápido.</small>
      </div>

      <label className="campo">
        <span>Nombre</span>
        <input required maxLength={80} value={campos.nombre} onChange={cambiar('nombre')} />
      </label>
      <label className="campo">
        <span>Categoría</span>
        <input list="categorias-sugeridas" value={campos.categoria} onChange={cambiar('categoria')} placeholder="Ej: Cuchuflíes" />
        <datalist id="categorias-sugeridas">
          {categorias.map((categoria) => <option key={categoria} value={categoria} />)}
        </datalist>
      </label>
      <label className="campo">
        <span>Descripción (opcional)</span>
        <textarea rows={2} maxLength={300} value={campos.descripcion} onChange={cambiar('descripcion')} />
      </label>
      <label className="campo">
        <span>Precio de venta (CLP, con IVA)</span>
        <input type="number" min="0" step="10" required value={campos.precio} onChange={cambiar('precio')} />
        <small>Tip: calcúlalo desde la pestaña Compras con costo, margen e IVA.</small>
      </label>
      <label className="casilla">
        <input type="checkbox" checked={campos.activo} onChange={cambiar('activo')} />
        Visible en la vitrina
      </label>

      {mensajeError && <p className="error" role="alert">{mensajeError}</p>}
      <div className="fila">
        <button className="boton boton--chicle" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar producto'}</button>
        <button type="button" className="boton boton--fantasma" onClick={alCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function PestanaProductos() {
  const { datos, error, cargando, recargar } = usarCarga(listarProductosAdmin);
  // null = viendo la lista · 'nuevo' = creando · objeto producto = editando ese producto
  const [edicion, setEdicion] = useState(null);

  const productos = datos ?? [];
  const categorias = [...new Set([...CATEGORIAS_SUGERIDAS, ...productos.map((p) => p.categoria)])];

  async function eliminar(producto) {
    const confirmado = window.confirm(
      `¿Eliminar "${producto.nombre}"? También se borran sus compras registradas.`,
    );
    if (!confirmado) return;
    try {
      await eliminarProducto(producto.id);
      if (producto.imagenUrl) await eliminarImagen(producto.imagenUrl);
    } catch (e) {
      window.alert(e.message);
    }
    recargar();
  }

  async function alternarVisibilidad(producto) {
    try {
      await cambiarVisibilidadProducto(producto.id, !producto.activo);
    } catch (e) {
      window.alert(e.message);
    }
    recargar();
  }

  if (edicion) {
    return (
      <FormularioProducto
        producto={edicion === 'nuevo' ? null : edicion}
        categorias={categorias}
        alCancelar={() => setEdicion(null)}
        alGuardar={() => {
          setEdicion(null);
          recargar();
        }}
      />
    );
  }

  return (
    <section>
      <div className="fila fila--separada">
        <h2>{productos.length} productos</h2>
        <button className="boton boton--chicle" onClick={() => setEdicion('nuevo')}>Nuevo producto</button>
      </div>

      {cargando && <p className="aviso">Cargando…</p>}
      {error && <p className="error" role="alert">No se pudieron cargar los productos: {error.message}</p>}
      {!cargando && !error && productos.length === 0 && (
        <p className="aviso">Aún no hay productos. Crea el primero con “Nuevo producto”.</p>
      )}

      <ul className="lista-admin">
        {productos.map((producto) => (
          <li key={producto.id} className={`producto-admin ${producto.activo ? '' : 'oculto'}`}>
            {producto.imagenUrl ? <img src={producto.imagenUrl} alt="" /> : <div className="producto-admin__marcador">🍬</div>}
            <div className="producto-admin__info">
              <strong>{producto.nombre}</strong>
              <span>{producto.categoria} · {formatearPesos(producto.precio)}{producto.activo ? '' : ' · oculto'}</span>
            </div>
            <div className="fila">
              <button className="boton boton--fantasma" onClick={() => alternarVisibilidad(producto)}>
                {producto.activo ? 'Ocultar' : 'Mostrar'}
              </button>
              <button className="boton boton--tinta" onClick={() => setEdicion(producto)}>Editar</button>
              <button className="boton boton--peligro" onClick={() => eliminar(producto)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
