/**
 * Reduce la foto antes de subirla: máximo 900 px por lado, formato WebP
 * (o JPEG si el navegador no soporta WebP). Cada foto queda en ~50-150 KB,
 * así caben cientos dentro del 1 GB gratis de Supabase y la vitrina carga rápido.
 */
export async function comprimirImagen(archivo, ladoMaximo = 900, calidad = 0.82) {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));

  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close?.();

  const aBlob = (tipo) => new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
  let resultado = await aBlob('image/webp');
  if (!resultado || resultado.type !== 'image/webp') resultado = await aBlob('image/jpeg');
  if (!resultado) throw new Error('No se pudo procesar la imagen');
  return resultado;
}
