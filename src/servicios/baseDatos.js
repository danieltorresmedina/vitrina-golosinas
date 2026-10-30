/**
 * ÚNICO archivo que conversa con las tablas de Supabase.
 *
 * Por qué existe: las tablas y columnas de la base están en inglés (products, price, ...)
 * porque ya hay datos reales guardados y renombrarlas exigiría una migración.
 * Aquí se traduce todo: hacia afuera (el resto del código) los nombres son en español,
 * hacia adentro (las consultas a Supabase) se usan los nombres reales de la base.
 *
 * DICCIONARIO (base de datos → código)
 *   settings   → ajustes     store_name → nombreTienda      whatsapp_number → whatsapp
 *                            iva_pct → ivaPct                default_margin_pct → margenSugeridoPct
 *   products   → productos   name → nombre                   description → descripcion
 *                            category → categoria            image_url → imagenUrl
 *                            price → precio                  active → activo
 *   purchases  → compras     product_id → productoId         supplier → proveedor
 *                            quantity → cantidad             unit_cost → costoUnitario
 *                            cost_includes_iva → costoIncluyeIva   margin_pct → margenPct
 *                            net_cost → costoNeto            suggested_price → precioSugerido
 *                            purchased_at → fechaCompra
 *   orders     → pedidos     code → codigo                   customer_name → cliente
 *                            note → nota                     items → articulos   total → total
 *                            created_at → creadoEn
 *   (dentro de items/articulos: name → nombre, price → precio, qty → cantidad)
 *
 * Si algún día se renombran las columnas, solo hay que cambiar ESTE archivo.
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
  nombre: fila.name,
  descripcion: fila.description ?? '',
  categoria: fila.category,
  imagenUrl: fila.image_url,
  precio: fila.price,
  activo: fila.active,
});

const aAjustes = (fila) => ({
  nombreTienda: fila.store_name,
  whatsapp: fila.whatsapp_number,
  ivaPct: Number(fila.iva_pct ?? AJUSTES_POR_DEFECTO.ivaPct),
  margenSugeridoPct: Number(fila.default_margin_pct ?? AJUSTES_POR_DEFECTO.margenSugeridoPct),
});

const aCompra = (fila) => ({
  id: fila.id,
  productoId: fila.product_id,
  productoNombre: fila.products?.name ?? null, // viene del "join" con la tabla products
  proveedor: fila.supplier,
  cantidad: fila.quantity,
  costoUnitario: Number(fila.unit_cost),
  costoIncluyeIva: fila.cost_includes_iva,
  ivaPct: Number(fila.iva_pct),
  margenPct: Number(fila.margin_pct),
  costoNeto: Number(fila.net_cost),
  precioSugerido: fila.suggested_price,
  fechaCompra: fila.purchased_at,
});

const aPedido = (fila) => ({
  id: fila.id,
  codigo: fila.code,
  cliente: fila.customer_name,
  nota: fila.note,
  articulos: (fila.items ?? []).map((a) => ({ id: a.id, nombre: a.name, precio: a.price, cantidad: a.qty })),
  total: fila.total,
  creadoEn: fila.created_at,
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
      .from('products')
      .select('id,name,description,category,image_url,price')
      .eq('active', true)
      .order('category')
      .order('name'),
    supabase.from('settings').select('store_name,whatsapp_number').eq('id', 1).maybeSingle(),
  ]);

  return {
    productos: (exigirSinError(productos) ?? []).map(aProducto),
    ajustes: ajustes.data ? aAjustes(ajustes.data) : AJUSTES_POR_DEFECTO,
  };
}

/**
 * Guarda el pedido para tu registro (aparece en Admin → Pedidos).
 * Dentro de la columna `items` se guardan las claves name/price/qty, igual que los pedidos anteriores.
 */
export async function guardarPedido({ codigo, cliente, nota, articulos, total }) {
  if (!supabase) return;
  exigirSinError(
    await supabase.from('orders').insert({
      code: codigo,
      customer_name: cliente || null,
      note: nota || null,
      items: articulos.map((a) => ({ id: a.id, name: a.nombre, price: a.precio, qty: a.cantidad })),
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
    await supabase.from('products').select('*').order('category').order('name'),
  );
  return filas.map(aProducto);
}

/** Crea el producto (si no trae `id`) o lo actualiza (si trae `id`). */
export async function guardarProducto({ id, nombre, categoria, descripcion, precio, activo, imagenUrl }) {
  const fila = {
    name: nombre,
    category: categoria,
    description: descripcion || null,
    price: precio,
    active: activo,
    image_url: imagenUrl,
  };
  exigirSinError(
    id
      ? await supabase.from('products').update(fila).eq('id', id)
      : await supabase.from('products').insert(fila),
  );
}

export async function eliminarProducto(id) {
  exigirSinError(await supabase.from('products').delete().eq('id', id));
}

export async function cambiarVisibilidadProducto(id, activo) {
  exigirSinError(await supabase.from('products').update({ active: activo }).eq('id', id));
}

export async function actualizarPrecioProducto(id, precio) {
  exigirSinError(await supabase.from('products').update({ price: precio }).eq('id', id));
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
      .from('purchases')
      .select('*, products(name)')
      .order('purchased_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  );
  return filas.map(aCompra);
}

export async function registrarCompra(compra) {
  exigirSinError(
    await supabase.from('purchases').insert({
      product_id: compra.productoId,
      supplier: compra.proveedor || null,
      quantity: compra.cantidad,
      unit_cost: compra.costoUnitario,
      cost_includes_iva: compra.costoIncluyeIva,
      iva_pct: compra.ivaPct,
      margin_pct: compra.margenPct,
      net_cost: compra.costoNeto,
      suggested_price: compra.precioSugerido,
      purchased_at: compra.fechaCompra,
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Pedidos (admin)                                                      */
/* ------------------------------------------------------------------ */

/** Últimos 100 pedidos, el más reciente primero. */
export async function listarPedidos() {
  const filas = exigirSinError(
    await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
  );
  return filas.map(aPedido);
}

export async function eliminarPedido(id) {
  exigirSinError(await supabase.from('orders').delete().eq('id', id));
}

/* ------------------------------------------------------------------ */
/* Ajustes de la tienda (admin)                                         */
/* ------------------------------------------------------------------ */

/** Devuelve los ajustes, o null si todavía no existe la fila. */
export async function leerAjustes() {
  const fila = exigirSinError(await supabase.from('settings').select('*').eq('id', 1).maybeSingle());
  return fila ? aAjustes(fila) : null;
}

/** La tabla settings tiene una sola fila (id = 1); se crea o se actualiza. */
export async function guardarAjustes({ nombreTienda, whatsapp, ivaPct, margenSugeridoPct }) {
  exigirSinError(
    await supabase.from('settings').upsert({
      id: 1,
      store_name: nombreTienda,
      whatsapp_number: whatsapp,
      iva_pct: ivaPct,
      default_margin_pct: margenSugeridoPct,
      updated_at: new Date().toISOString(),
    }),
  );
}
