/**
 * Pantalla pública: portada, filtro por categoría y catálogo de productos.
 * El carro de compras vive en componentes/Carro.jsx.
 *
 * Qué tocar para…
 *   - cambiar el título o el texto de la portada → bloque <section className="portada">
 *   - cambiar los emojis de las fotos vacías    → lista EMOJIS_POR_CATEGORIA
 */
import { useEffect, useMemo, useState } from 'react';
import { cargarVitrina } from '../servicios/baseDatos';
import { modoDemo } from '../servicios/supabase';
import { formatearPesos } from '../utilidades/dinero';
import { usarCarro } from '../estado/CarroContexto.jsx';
import Carro from '../componentes/Carro.jsx';

// Cuando un producto no tiene foto se muestra un emoji según su categoría o nombre.
const EMOJIS_POR_CATEGORIA = [
  [/cuchufl/i, '🥖'],
  [/cocad/i, '🥥'],
  [/gomit|gomas/i, '🐻'],
  [/choco/i, '🍫'],
  [/pack|caja|combo/i, '🎁'],
];
const EMOJI_POR_DEFECTO = '🍬';
const COLORES_FONDO_VACIO = ['var(--limon)', 'var(--menta)', 'var(--chicle)'];

function buscarEmoji(texto) {
  const coincidencia = EMOJIS_POR_CATEGORIA.find(([patron]) => patron.test(texto));
  return coincidencia ? coincidencia[1] : EMOJI_POR_DEFECTO;
}

/** Foto del producto; si no tiene (o no carga) muestra un recuadro de color con emoji. */
function FotoProducto({ producto, posicion }) {
  const [fallo, setFallo] = useState(false);

  if (producto.imagenUrl && !fallo) {
    return (
      <img
        className="foto"
        src={producto.imagenUrl}
        alt={producto.nombre}
        loading="lazy"
        onError={() => setFallo(true)}
      />
    );
  }
  return (
    <div
      className="foto foto--vacia"
      style={{ background: COLORES_FONDO_VACIO[posicion % COLORES_FONDO_VACIO.length] }}
      aria-hidden="true"
    >
      <span>{buscarEmoji(`${producto.categoria} ${producto.nombre}`)}</span>
    </div>
  );
}

function TarjetaProducto({ producto, posicion }) {
  const { articulos, agregar, quitarUno } = usarCarro();
  const cantidadEnCarro = articulos.find((i) => i.id === producto.id)?.cantidad ?? 0;

  return (
    <li className="tarjeta">
      <div className="tarjeta__imagen">
        <FotoProducto producto={producto} posicion={posicion} />
        <span className="etiqueta">{producto.categoria}</span>
      </div>
      <div className="tarjeta__cuerpo">
        <h3>{producto.nombre}</h3>
        {producto.descripcion && <p className="tarjeta__descripcion">{producto.descripcion}</p>}
        <div className="tarjeta__pie">
          <strong className="precio">{formatearPesos(producto.precio)}</strong>
          {cantidadEnCarro === 0 ? (
            <button className="boton boton--chicle" onClick={() => agregar(producto)}>
              Agregar
            </button>
          ) : (
            <div className="selector-cantidad" role="group" aria-label={`Cantidad de ${producto.nombre}`}>
              <button onClick={() => quitarUno(producto.id)} aria-label="Quitar uno">−</button>
              <span aria-live="polite">{cantidadEnCarro}</span>
              <button onClick={() => agregar(producto)} aria-label="Agregar uno">+</button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Vitrina() {
  // estado.situacion: 'cargando' | 'listo' | 'error'
  const [estado, setEstado] = useState({ situacion: 'cargando' });
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [carroAbierto, setCarroAbierto] = useState(false);
  const { cantidadTotal, total, sincronizar } = usarCarro();

  // Al abrir la página se cargan los productos desde Supabase.
  useEffect(() => {
    let vigente = true; // evita actualizar el estado si la página ya se cerró
    cargarVitrina()
      .then((datos) => {
        if (!vigente) return;
        setEstado({ situacion: 'listo', ...datos });
        sincronizar(datos.productos); // actualiza precios del carro guardado
      })
      .catch(() => vigente && setEstado({ situacion: 'error' }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productos = estado.productos ?? [];
  const categorias = useMemo(() => ['Todos', ...new Set(productos.map((p) => p.categoria))], [productos]);
  const productosVisibles =
    categoriaActiva === 'Todos' ? productos : productos.filter((p) => p.categoria === categoriaActiva);
  const nombreTienda = estado.ajustes?.nombreTienda ?? '';

  // El título de la pestaña del navegador usa el nombre de la tienda.
  useEffect(() => {
    if (nombreTienda) document.title = `${nombreTienda} · Golosinas`;
  }, [nombreTienda]);

  return (
    <>
      {modoDemo && (
        <div className="barra-demo">
          Modo demo: estos productos son de ejemplo. Conecta Supabase para usar los tuyos.
        </div>
      )}

      <header className="barra-superior">
        <div className="toldo" aria-hidden="true" />
        <div className="barra-superior__fila">
          <a className="marca" href="/">{nombreTienda || 'Golosinas'}</a>
          <button className="boton boton--tinta boton-carro" onClick={() => setCarroAbierto(true)}>
            Mi carro
            <span className="boton-carro__cantidad">{cantidadTotal}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="portada">
          <div className="portada__texto">
            <h1>Cuchuflíes, cocadas y gomitas listas para pedir</h1>
            <p>
              Elige tus golosinas, arma el carro y envíanos el pedido por WhatsApp. Coordinamos el pago y la
              entrega contigo.
            </p>
          </div>
          <div className="sello" aria-hidden="true">
            <span>Pedí por</span>
            <strong>WhatsApp</strong>
          </div>
        </section>

        <section className="estante" aria-labelledby="titulo-catalogo">
          <h2 id="titulo-catalogo" className="solo-lectores">Catálogo</h2>

          {/* El filtro solo aparece si hay al menos 2 categorías además de "Todos". */}
          {estado.situacion === 'listo' && categorias.length > 2 && (
            <div className="filtros" role="tablist" aria-label="Categorías">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  role="tab"
                  aria-selected={categoria === categoriaActiva}
                  className={`filtro ${categoria === categoriaActiva ? 'seleccionado' : ''}`}
                  onClick={() => setCategoriaActiva(categoria)}
                >
                  {categoria}
                </button>
              ))}
            </div>
          )}

          {estado.situacion === 'cargando' && <p className="aviso">Abriendo la vitrina…</p>}
          {estado.situacion === 'error' && (
            <p className="aviso">No pudimos cargar los productos. Revisa tu conexión y recarga la página.</p>
          )}
          {estado.situacion === 'listo' && productos.length === 0 && (
            <p className="aviso">Aún no hay productos. Vuelve pronto.</p>
          )}

          <ul className="cuadricula">
            {productosVisibles.map((producto, posicion) => (
              <TarjetaProducto key={producto.id} producto={producto} posicion={posicion} />
            ))}
          </ul>
        </section>
      </main>

      <footer className="pie">
        <span>{nombreTienda || 'Golosinas'} · Pedidos por WhatsApp</span>
      </footer>

      {/* Botón flotante: aparece cuando hay productos en el carro y el panel está cerrado. */}
      {cantidadTotal > 0 && !carroAbierto && (
        <button className="boton-flotante" onClick={() => setCarroAbierto(true)}>
          Ver carro ({cantidadTotal}) · {formatearPesos(total)}
        </button>
      )}

      <Carro
        abierto={carroAbierto}
        alCerrar={() => setCarroAbierto(false)}
        numeroWhatsapp={estado.ajustes?.whatsapp}
        nombreTienda={nombreTienda}
      />
    </>
  );
}
