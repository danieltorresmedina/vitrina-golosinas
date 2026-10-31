/**
 * ÚNICO archivo que conversa con las tablas de Supabase.
 *
 * Las tablas y columnas de la base están en español con guion bajo (nombre_tienda, creado_en...).
 * En el código JavaScript se usa la misma palabra en camelCase (nombreTienda, creadoEn...),
 * que es la convención de JS. Los "traductores" de abajo solo hacen ese cambio de formato.
 *
 * DICCIONARIO (base de datos → código)
 *   ajustes    nombre_tienda → nombreTienda    whatsapp → whatsapp
 *              iva_pct → ivaPct                margen_sugerido_pct → margenSugeridoPct
 *   productos  nombre, descripcion, categoria, precio, activo (igual)
 *              imagen_url → imagenUrl
 *   compras    producto_id → productoId        proveedor, cantidad (igual)
 *              costo_unitario → costoUnitario  costo_incluye_iva → costoIncluyeIva
 *              iva_pct → ivaPct                margen_pct → margenPct
 *              costo_neto → costoNeto          precio_sugerido → precioSugerido
 *              fecha_compra → fechaCompra
 *   pedidos    codigo, cliente, nota, total (igual)
 *              articulos (lista JSON de { id, nombre, precio, cantidad })
 *              creado_en → creadoEn
 *
 * Si algún día se renombra una columna, solo hay que cambiar ESTE archivo.
 */
import { supabase, BUCKET_IMAGENES } from './supabase';
import { AJUSTES_DEMO, PRODUCTOS_DEMO } from '../utilidades/datosDemo';

const AJUSTES_POR_DEFECTO = {
  nombreTienda: 'Mi dulcería',
  whatsapp: '',
  ivaPct: 19,
  margenSugeridoPct: 40,
};

/* ------------------------------------------------------------------ */
/* Traductores: fila de la base de datos → objeto en español           */
/* ------------------------------------------------------------------ */

const aProducto = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  descripcion: fila.descripcion ?? '',
  categoria: fila.categoria,
  imagenUrl: fila.imagen_url,
  precio: fila.precio,
  activo: fila.activo,
});

const aAjustes = (fila) => ({
  nombreTienda: fila.nombre_tienda,
  whatsapp: fila.whatsapp,
  ivaPct: Number(fila.iva_pct ?? AJUSTES_POR_DEFECTO.ivaPct),
  margenSugeridoPct: Number(fila.margen_sugerido_pct ?? AJUSTES_POR_DEFECTO.margenSugeridoPct),
});

const aCompra = (fila) => ({
  id: fila.id,
  productoId: fila.producto_id,
  productoNombre: fila.productos?.nombre ?? null, // viene del "join" con la tabla productos
  proveedor: fila.proveedor,
  cantidad: fila.cantidad,
  costoUnitario: Number(fila.costo_unitario),
  costoIncluyeIva: fila.costo_incluye_iva,
  ivaPct: Number(fila.iva_pct),
  margenPct: Number(fila.margen_pct),
  costoNeto: Number(fila.costo_neto),
  precioSugerido: fila.precio_sugerido,
  fechaCompra: fila.fecha_compra,
});

const aPedido = (fila) => ({
  id: fila.id,
  codigo: fila.codigo,
  cliente: fila.cliente,
  nota: fila.nota,
  articulos: fila.articulos ?? [], // ya viene como [{ id, nombre, precio, cantidad }]
  total: fila.total,
  creadoEn: fila.creado_en,
});

/** Si Supabase respondió con error, lo lanza para que la pantalla muestre el mensaje. */
function exigirSinError(respuesta) {
  if (respuesta.error) throw respuesta.error;
  return respuesta.data;
}

/* ------------------------------------------------------------------ */
/* Vitrina pública (la ve cualquier visitante)                          */
/* ------------------------------------------------------------------ */

/** Productos visibles + datos básicos de la tienda. En modo demo devuelve datos de ejemplo. */
export async function cargarVitrina() {
  if (!supabase) return { productos: PRODUCTOS_DEMO, ajustes: AJUSTES_DEMO };

  const [productos, ajustes] = await Promise.all([
    supabase
      .from('productos')
      .select('id,nombre,descripcion,categoria,imagen_url,precio')
      .eq('activo', true)
      .order('categoria')
      .order('nombre'),
    supabase.from('ajustes').select('nombre_tienda,whatsapp').eq('id', 1).maybeSingle(),
  ]);

  return {
    productos: (exigirSinError(productos) ?? []).map(aProducto),
    ajustes: ajustes.data ? aAjustes(ajustes.data) : AJUSTES_POR_DEFECTO,
  };
}

/** Guarda el pedido para tu registro (aparece en Admin → Pedidos). */
export async function guardarPedido({ codigo, cliente, nota, articulos, total }) {
  if (!supabase) return;
  exigirSinError(
    await supabase.from('pedidos').insert({
      codigo,
      cliente: cliente || null,
      nota: nota || null,
      articulos: articulos.map((a) => ({ id: a.id, nombre: a.nombre, precio: a.precio, cantidad: a.cantidad })),
      total,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Sesión del administrador                                             */
/* ------------------------------------------------------------------ */

export async function obtenerSesion() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Avisa cada vez que alguien inicia o cierra sesión. Devuelve una función para dejar de escuchar. */
export function escucharSesion(alCambiar) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => alCambiar(sesion));
  return () => data.subscription.unsubscribe();
}

export async function iniciarSesion(correo, clave) {
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw error;
}

export const cerrarSesion = () => supabase.auth.signOut();

/* ------------------------------------------------------------------ */
/* Productos (admin)                                                    */
/* ------------------------------------------------------------------ */

/** Todos los productos, también los ocultos. */
export async function listarProductosAdmin() {
  const filas = exigirSinError(
    await supabase.from('productos').select('*').order('categoria').order('nombre'),
  );
  return filas.map(aProducto);
}

/** Crea el producto (si no trae `id`) o lo actualiza (si trae `id`). */
export async function guardarProducto({ id, nombre, categoria, descripcion, precio, activo, imagenUrl }) {
  const fila = {
    nombre,
    categoria,
    descripcion: descripcion || null,
    precio,
    activo,
    imagen_url: imagenUrl,
  };
  exigirSinError(
    id
      ? await supabase.from('productos').update(fila).eq('id', id)
      : await supabase.from('productos').insert(fila),
  );
}

export async function eliminarProducto(id) {
  exigirSinError(await supabase.from('productos').delete().eq('id', id));
}

export async function cambiarVisibilidadProducto(id, activo) {
  exigirSinError(await supabase.from('productos').update({ activo }).eq('id', id));
}

export async function actualizarPrecioProducto(id, precio) {
  exigirSinError(await supabase.from('productos').update({ precio }).eq('id', id));
}

/* ------------------------------------------------------------------ */
/* Imágenes de productos                                                */
/* ------------------------------------------------------------------ */

/** Sube la foto (ya comprimida) y devuelve su dirección pública. */
export async function subirImagen(archivo) {
  const extension = archivo.type === 'image/webp' ? 'webp' : 'jpg';
  const ruta = `${crypto.randomUUID()}.${extension}`;
  const subida = await supabase.storage.from(BUCKET_IMAGENES).upload(ruta, archivo, {
    contentType: archivo.type,
    cacheControl: '31536000', // el navegador la guarda 1 año (la foto nunca cambia de nombre)
  });
  if (subida.error) throw subida.error;
  return supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(ruta).data.publicUrl;
}

/** Borra la foto anterior para no gastar el 1 GB gratis. Si falla, no pasa nada. */
export async function eliminarImagen(urlImagen) {
  try {
    const marca = `/${BUCKET_IMAGENES}/`;
    const posicion = urlImagen.indexOf(marca);
    if (posicion >= 0) {
      const ruta = decodeURIComponent(urlImagen.slice(posicion + marca.length));
      await supabase.storage.from(BUCKET_IMAGENES).remove([ruta]);
    }
  } catch {
    /* se ignora a propósito: una foto huérfana no es grave */
  }
}

/* ------------------------------------------------------------------ */
/* Compras (admin)                                                      */
/* ------------------------------------------------------------------ */

/** Últimas 100 compras, con el nombre del producto. */
export async function listarCompras() {
  const filas = exigirSinError(
    await supabase
      .from('compras')
      .select('*, productos(nombre)')
      .order('fecha_compra', { ascending: false })
      .order('creado_en', { ascending: false })
      .limit(100),
  );
  return filas.map(aCompra);
}

export async function registrarCompra(compra) {
  exigirSinError(
    await supabase.from('compras').insert({
      producto_id: compra.productoId,
      proveedor: compra.proveedor || null,
      cantidad: compra.cantidad,
      costo_unitario: compra.costoUnitario,
      costo_incluye_iva: compra.costoIncluyeIva,
      iva_pct: compra.ivaPct,
      margen_pct: compra.margenPct,
      costo_neto: compra.costoNeto,
      precio_sugerido: compra.precioSugerido,
      fecha_compra: compra.fechaCompra,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Pedidos (admin)                                                      */
/* ------------------------------------------------------------------ */

/** Últimos 100 pedidos, el más reciente primero. */
export async function listarPedidos() {
  const filas = exigirSinError(
    await supabase.from('pedidos').select('*').order('creado_en', { ascending: false }).limit(100),
  );
  return filas.map(aPedido);
}

export async function eliminarPedido(id) {
  exigirSinError(await supabase.from('pedidos').delete().eq('id', id));
}

/* ------------------------------------------------------------------ */
/* Ajustes de la tienda (admin)                                         */
/* ------------------------------------------------------------------ */

/** Devuelve los ajustes, o null si todavía no existe la fila. */
export async function leerAjustes() {
  const fila = exigirSinError(await supabase.from('ajustes').select('*').eq('id', 1).maybeSingle());
  return fila ? aAjustes(fila) : null;
}

/** La tabla ajustes tiene una sola fila (id = 1); se crea o se actualiza. */
export async function guardarAjustes({ nombreTienda, whatsapp, ivaPct, margenSugeridoPct }) {
  exigirSinError(
    await supabase.from('ajustes').upsert({
      id: 1,
      nombre_tienda: nombreTienda,
      whatsapp,
      iva_pct: ivaPct,
      margen_sugerido_pct: margenSugeridoPct,
      actualizado_en: new Date().toISOString(),
    }),
  );
}
