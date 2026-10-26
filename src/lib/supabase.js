import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sin variables de entorno la app corre en "modo demo" (datos de ejemplo, sin guardar nada).
export const supabase = url && key ? createClient(url, key) : null;
export const demoMode = !supabase;
export const BUCKET = 'product-images';
