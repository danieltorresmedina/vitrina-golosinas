import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calcPrice } from '../lib/pricing';
import { clp } from '../lib/money';
import { useLoad } from './useLoad';

const today = () => new Date().toISOString().slice(0, 10);

export default function PurchasesTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const [products, settings, purchases] = await Promise.all([
      supabase.from('products').select('id,name,price').order('name'),
      supabase.from('settings').select('iva_pct,default_margin_pct').eq('id', 1).maybeSingle(),
      supabase
        .from('purchases')
        .select('*, products(name)')
        .order('purchased_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    for (const r of [products, settings, purchases]) if (r.error) throw r.error;
    return { products: products.data, settings: settings.data, purchases: purchases.data };
  });

  const ivaDefault = Number(data?.settings?.iva_pct ?? 19);
  const marginDefault = Number(data?.settings?.default_margin_pct ?? 40);

  const [f, setF] = useState({
    product_id: '',
    supplier: '',
    quantity: 1,
    unit_cost: '',
    includesIva: false,
    iva_pct: '',
    margin_pct: '',
    purchased_at: today(),
    applyPrice: true,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  // Cuando llegan los ajustes, usa su IVA y margen como valores iniciales.
  useEffect(() => {
    if (!data) return;
    setF((s) => ({
      ...s,
      iva_pct: s.iva_pct === '' ? ivaDefault : s.iva_pct,
      margin_pct: s.margin_pct === '' ? marginDefault : s.margin_pct,
    }));
  }, [data, ivaDefault, marginDefault]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const calc = useMemo(
    () => calcPrice({ unitCost: f.unit_cost, includesIva: f.includesIva, ivaPct: f.iva_pct, marginPct: f.margin_pct }),
    [f.unit_cost, f.includesIva, f.iva_pct, f.margin_pct],
  );
  const qty = Math.max(0, Math.round(Number(f.quantity) || 0));
  const product = data?.products.find((p) => p.id === f.product_id);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!f.product_id) return setMsg({ type: 'error', text: 'Elige un producto.' });
    if (!(Number(f.unit_cost) >= 0) || f.unit_cost === '') return setMsg({ type: 'error', text: 'Ingresa el costo unitario.' });
    if (qty < 1) return setMsg({ type: 'error', text: 'La cantidad debe ser al menos 1.' });

    setBusy(true);
    const { error: err } = await supabase.from('purchases').insert({
      product_id: f.product_id,
      supplier: f.supplier.trim() || null,
      quantity: qty,
      unit_cost: Number(f.unit_cost),
      cost_includes_iva: f.includesIva,
      iva_pct: Number(f.iva_pct) || 0,
      margin_pct: Number(f.margin_pct) || 0,
      net_cost: Math.round(calc.netCost * 100) / 100,
      suggested_price: calc.price,
      purchased_at: f.purchased_at || today(),
    });
    if (err) {
      setBusy(false);
      return setMsg({ type: 'error', text: err.message });
    }
    if (f.applyPrice) {
      const up = await supabase.from('products').update({ price: calc.price }).eq('id', f.product_id);
      if (up.error) {
        setBusy(false);
        return setMsg({ type: 'error', text: `Compra guardada, pero no se actualizó el precio: ${up.error.message}` });
      }
    }
    setBusy(false);
    setMsg({
      type: 'ok',
      text: `Compra guardada${f.applyPrice ? ` y precio de “${product?.name}” actualizado a ${clp(calc.price)}` : ''}.`,
    });
    setF((s) => ({ ...s, supplier: '', quantity: 1, unit_cost: '' }));
    reload();
  }

  if (loading && !data) return <p className="notice">Cargando…</p>;
  if (error) return <p className="error" role="alert">No se pudo cargar: {error.message}</p>;

  const { products, purchases } = data;

  return (
    <section className="split">
      <form className="panel form-grid" onSubmit={submit}>
        <h2>Registrar compra</h2>

        <label className="field">
          <span>Producto</span>
          <select required value={f.product_id} onChange={set('product_id')}>
            <option value="">Elige un producto…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {products.length === 0 && <small>Primero crea productos en la pestaña Productos.</small>}
        </label>

        <div className="cols-2">
          <label className="field">
            <span>Cantidad comprada</span>
            <input type="number" min="1" step="1" required value={f.quantity} onChange={set('quantity')} />
          </label>
          <label className="field">
            <span>Costo por unidad (CLP)</span>
            <input type="number" min="0" step="any" required value={f.unit_cost} onChange={set('unit_cost')} />
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.includesIva} onChange={set('includesIva')} />
          El costo ya incluye IVA (boleta o factura con IVA incluido)
        </label>

        <div className="cols-2">
          <label className="field">
            <span>Margen de ganancia (%)</span>
            <input type="number" min="0" step="any" required value={f.margin_pct} onChange={set('margin_pct')} />
            <small>Se calcula sobre el costo neto.</small>
          </label>
          <label className="field">
            <span>IVA (%)</span>
            <input type="number" min="0" step="any" required value={f.iva_pct} onChange={set('iva_pct')} />
          </label>
        </div>

        <div className="cols-2">
          <label className="field">
            <span>Proveedor (opcional)</span>
            <input value={f.supplier} maxLength={80} onChange={set('supplier')} />
          </label>
          <label className="field">
            <span>Fecha de compra</span>
            <input type="date" required value={f.purchased_at} onChange={set('purchased_at')} />
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={f.applyPrice} onChange={set('applyPrice')} />
          Actualizar el precio de venta del producto con este cálculo
        </label>

        {msg && <p className={msg.type === 'ok' ? 'ok' : 'error'} role={msg.type === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
        <button className="btn btn--candy" disabled={busy}>{busy ? 'Guardando…' : 'Guardar compra'}</button>
      </form>

      <aside className="panel calc" aria-live="polite">
        <h2>Así se arma el precio</h2>
        <dl>
          <div><dt>Costo neto por unidad</dt><dd>{clp(calc.netCost)}</dd></div>
          <div><dt>+ Margen ({Number(f.margin_pct) || 0}%)</dt><dd>{clp(calc.netPrice - calc.netCost)}</dd></div>
          <div><dt>Precio neto</dt><dd>{clp(calc.netPrice)}</dd></div>
          <div><dt>+ IVA ({Number(f.iva_pct) || 0}%)</dt><dd>{clp(calc.ivaAmount)}</dd></div>
          <div className="calc__final"><dt>Precio de venta (redondeado a $10)</dt><dd>{clp(calc.price)}</dd></div>
        </dl>
        <div className="calc__profit">
          <div><span>Ganancia por unidad</span><strong>{clp(calc.profit)}</strong></div>
          <div><span>Ganancia del lote ({qty} u.)</span><strong>{clp(calc.profit * qty)}</strong></div>
          <div><span>Inversión del lote (neto)</span><strong>{clp(calc.netCost * qty)}</strong></div>
        </div>
        {product && Number(product.price) > 0 && Number(product.price) !== calc.price && (
          <p className="hint">Precio actual de “{product.name}”: {clp(product.price)}.</p>
        )}
      </aside>

      <div className="split__wide">
        <h2>Historial de compras</h2>
        {purchases.length === 0 ? (
          <p className="notice">Aún no registras compras.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Producto</th><th>Cant.</th><th>Costo neto</th><th>Margen</th><th>Precio</th><th>Ganancia u.</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const profit = p.suggested_price / (1 + Number(p.iva_pct) / 100) - Number(p.net_cost);
                  return (
                    <tr key={p.id}>
                      <td>{p.purchased_at}</td>
                      <td>{p.products?.name ?? '—'}{p.supplier ? <small> · {p.supplier}</small> : null}</td>
                      <td>{p.quantity}</td>
                      <td>{clp(p.net_cost)}</td>
                      <td>{Number(p.margin_pct)}%</td>
                      <td>{clp(p.suggested_price)}</td>
                      <td>{clp(profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
