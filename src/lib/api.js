import { supabase } from './supabase';
import { DEMO_PRODUCTS, DEMO_SETTINGS } from './demo';

const SETTINGS_FALLBACK = { store_name: 'Mi dulcería', whatsapp_number: '' };

export async function fetchShop() {
  if (!supabase) return { products: DEMO_PRODUCTS, settings: DEMO_SETTINGS };

  const [p, s] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,description,category,image_url,price')
      .eq('active', true)
      .order('category')
      .order('name'),
    supabase.from('settings').select('store_name,whatsapp_number').eq('id', 1).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  return { products: p.data ?? [], settings: s.data ?? SETTINGS_FALLBACK };
}

// Guarda el pedido para tu registro. Si falla, el pedido igual sale por WhatsApp.
export async function saveOrder({ code, name, note, items, total }) {
  if (!supabase) return;
  const { error } = await supabase.from('orders').insert({
    code,
    customer_name: name || null,
    note: note || null,
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    total,
  });
  if (error) throw error;
}
