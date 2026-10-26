import { useState } from 'react';
import { BUCKET, supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import { clp } from '../lib/money';
import { useLoad } from './useLoad';

const DEFAULT_CATEGORIES = ['Cuchuflíes', 'Cocadas', 'Gomitas', 'Packs'];

// Borra la foto vieja del bucket para no gastar el 1 GB gratis (si falla, no pasa nada).
async function removeImage(url) {
  try {
    const marker = `/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i >= 0) await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
  } catch {
    /* ignorar */
  }
}

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [f, setF] = useState({
    name: product?.name ?? '',
    category: product?.category ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    active: product?.active ?? true,
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(product?.image_url ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function pick(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      let image_url = product?.image_url ?? null;
      if (file) {
        const blob = await compressImage(file);
        const path = `${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
        const up = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type,
          cacheControl: '31536000',
        });
        if (up.error) throw up.error;
        image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        if (product?.image_url) await removeImage(product.image_url);
      }

      const row = {
        name: f.name.trim(),
        category: f.category.trim() || 'Otros',
        description: f.description.trim() || null,
        price: Math.max(0, Math.round(Number(f.price) || 0)),
        active: f.active,
        image_url,
      };
      const { error } = product
        ? await supabase.from('products').update(row).eq('id', product.id)
        : await supabase.from('products').insert(row);
      if (error) throw error;
      onSaved();
    } catch (ex) {
      setErr(ex.message || 'No se pudo guardar el producto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2>{product ? 'Editar producto' : 'Nuevo producto'}</h2>

      <div className="upload">
        {preview ? <img src={preview} alt="Vista previa" /> : <div className="upload__empty">Sin imagen</div>}
        <label className="btn btn--ghost">
          {preview ? 'Cambiar imagen' : 'Subir imagen'}
          <input type="file" accept="image/*" onChange={pick} hidden />
        </label>
        <small>Se reduce automáticamente a ~900 px para que cargue rápido.</small>
      </div>

      <label className="field">
        <span>Nombre</span>
        <input required maxLength={80} value={f.name} onChange={set('name')} />
      </label>
      <label className="field">
        <span>Categoría</span>
        <input list="cats" value={f.category} onChange={set('category')} placeholder="Ej: Cuchuflíes" />
        <datalist id="cats">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>
      <label className="field">
        <span>Descripción (opcional)</span>
        <textarea rows={2} maxLength={300} value={f.description} onChange={set('description')} />
      </label>
      <label className="field">
        <span>Precio de venta (CLP, con IVA)</span>
        <input type="number" min="0" step="10" required value={f.price} onChange={set('price')} />
        <small>Tip: calcúlalo desde la pestaña Compras con costo, margen e IVA.</small>
      </label>
      <label className="check">
        <input type="checkbox" checked={f.active} onChange={set('active')} />
        Visible en la vitrina
      </label>

      {err && <p className="error" role="alert">{err}</p>}
      <div className="row">
        <button className="btn btn--candy" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function ProductsTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const { data: rows, error: err } = await supabase
      .from('products')
      .select('*')
      .order('category')
      .order('name');
    if (err) throw err;
    return rows;
  });
  const [editing, setEditing] = useState(null); // null | 'new' | product

  const products = data ?? [];
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])];

  async function remove(p) {
    if (!window.confirm(`¿Eliminar "${p.name}"? También se borran sus compras registradas.`)) return;
    const { error: err } = await supabase.from('products').delete().eq('id', p.id);
    if (err) return window.alert(err.message);
    if (p.image_url) await removeImage(p.image_url);
    return reload();
  }

  async function toggle(p) {
    const { error: err } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    if (err) window.alert(err.message);
    reload();
  }

  if (editing) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        categories={categories}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <section>
      <div className="row row--between">
        <h2>{products.length} productos</h2>
        <button className="btn btn--candy" onClick={() => setEditing('new')}>Nuevo producto</button>
      </div>

      {loading && <p className="notice">Cargando…</p>}
      {error && <p className="error" role="alert">No se pudieron cargar los productos: {error.message}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="notice">Aún no hay productos. Crea el primero con “Nuevo producto”.</p>
      )}

      <ul className="admin-list">
        {products.map((p) => (
          <li key={p.id} className={`admin-item ${p.active ? '' : 'is-off'}`}>
            {p.image_url ? <img src={p.image_url} alt="" /> : <div className="admin-item__ph">🍬</div>}
            <div className="admin-item__info">
              <strong>{p.name}</strong>
              <span>{p.category} · {clp(p.price)}{p.active ? '' : ' · oculto'}</span>
            </div>
            <div className="row">
              <button className="btn btn--ghost" onClick={() => toggle(p)}>{p.active ? 'Ocultar' : 'Mostrar'}</button>
              <button className="btn btn--ink" onClick={() => setEditing(p)}>Editar</button>
              <button className="btn btn--danger" onClick={() => remove(p)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
