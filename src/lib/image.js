// Reduce la foto antes de subirla: máx. 900 px, WebP (o JPEG si el navegador no soporta WebP).
// Cada foto queda en ~50-150 KB, así caben cientos en el 1 GB gratis de Supabase.
export async function compressImage(file, maxSize = 900, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, quality));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
}
