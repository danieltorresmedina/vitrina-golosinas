/**
 * Cliente de Supabase (la conexión a la base de datos, el login y las imágenes).
 *
 * Las claves se leen de variables de entorno que Vite graba en el código al COMPILAR:
 *   VITE_SUPABASE_URL        → dirección de tu proyecto en Supabase
 *   VITE_SUPABASE_ANON_KEY   → clave "anon public" (es pública por diseño)
 *
 * En Cloudflare se configuran en: Settings → Build → "Build variables and secrets".
 * Si faltan, la aplicación arranca en MODO DEMO (productos de ejemplo, no guarda nada).
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const claveAnonima = import.meta.env.VITE_SUPABASE_ANON_KEY;

// `supabase` es null cuando no hay claves. Quien lo use debe revisar `modoDemo` primero.
export const supabase = url && claveAnonima ? createClient(url, claveAnonima) : null;

export const modoDemo = !supabase;

// Nombre del bucket (carpeta de archivos) donde se guardan las fotos. Lo crea schema.sql.
export const BUCKET_IMAGENES = 'product-images';
