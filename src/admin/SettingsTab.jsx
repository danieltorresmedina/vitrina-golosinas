import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLoad } from './useLoad';

export default function SettingsTab() {
  const { data, error, loading } = useLoad(async () => {
    const { data: row, error: err } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (err) throw err;
    return row;
  });
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!loading && !error) {
      setF({
        store_name: data?.store_name ?? '',
        whatsapp_number: data?.whatsapp_number ?? '',
        iva_pct: data?.iva_pct ?? 19,
        default_margin_pct: data?.default_margin_pct ?? 40,
      });
    }
  }, [data, loading, error]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const digits = f.whatsapp_number.replace(/\D/g, '');
    if (digits.length < 10) {
      return setMsg({ type: 'error', text: 'El WhatsApp debe incluir el código de país, por ejemplo 56912345678.' });
    }
    setBusy(true);
    const { error: err } = await supabase.from('settings').upsert({
      id: 1,
      store_name: f.store_name.trim() || 'Mi dulcería',
      whatsapp_number: digits,
      iva_pct: Number(f.iva_pct) || 0,
      default_margin_pct: Number(f.default_margin_pct) || 0,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    setMsg(err ? { type: 'error', text: err.message } : { type: 'ok', text: 'Ajustes guardados.' });
  }

  if (error) return <p className="error" role="alert">No se pudieron cargar los ajustes: {error.message}</p>;
  if (!f) return <p className="notice">Cargando…</p>;

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2>Ajustes de la tienda</h2>
      <label className="field">
        <span>Nombre de la tienda</span>
        <input required maxLength={60} value={f.store_name} onChange={set('store_name')} />
      </label>
      <label className="field">
        <span>WhatsApp que recibe los pedidos</span>
        <input inputMode="tel" required value={f.whatsapp_number} onChange={set('whatsapp_number')} placeholder="56912345678" />
        <small>Con código de país y sin “+” ni espacios. Chile: 56 + 9 + tu número.</small>
      </label>
      <div className="cols-2">
        <label className="field">
          <span>IVA (%)</span>
          <input type="number" min="0" step="any" required value={f.iva_pct} onChange={set('iva_pct')} />
        </label>
        <label className="field">
          <span>Margen sugerido (%)</span>
          <input type="number" min="0" step="any" required value={f.default_margin_pct} onChange={set('default_margin_pct')} />
        </label>
      </div>
      {msg && <p className={msg.type === 'ok' ? 'ok' : 'error'} role={msg.type === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
      <button className="btn btn--candy" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ajustes'}</button>
    </form>
  );
}
