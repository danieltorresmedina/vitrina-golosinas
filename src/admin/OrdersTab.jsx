import { supabase } from '../lib/supabase';
import { clp } from '../lib/money';
import { useLoad } from './useLoad';

const dateTime = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

export default function OrdersTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const { data: rows, error: err } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) throw err;
    return rows;
  });

  async function remove(o) {
    if (!window.confirm(`¿Eliminar el pedido #${o.code}?`)) return;
    const { error: err } = await supabase.from('orders').delete().eq('id', o.id);
    if (err) window.alert(err.message);
    reload();
  }

  if (loading && !data) return <p className="notice">Cargando…</p>;
  if (error) return <p className="error" role="alert">No se pudieron cargar los pedidos: {error.message}</p>;
  if (!data.length) return <p className="notice">Aún no llegan pedidos. Cuando un cliente use “Enviar pedido por WhatsApp” aparecerá aquí.</p>;

  return (
    <ul className="orders">
      {data.map((o) => (
        <li key={o.id} className="panel order">
          <div className="row row--between">
            <strong>Pedido #{o.code}</strong>
            <span>{dateTime.format(new Date(o.created_at))}</span>
          </div>
          {(o.customer_name || o.note) && (
            <p className="order__meta">
              {o.customer_name && <span>{o.customer_name}</span>}
              {o.note && <em>“{o.note}”</em>}
            </p>
          )}
          <ul className="order__items">
            {o.items.map((i, k) => (
              <li key={k}>{i.qty} × {i.name} <span>{clp(i.price * i.qty)}</span></li>
            ))}
          </ul>
          <div className="row row--between">
            <strong>Total {clp(o.total)}</strong>
            <button className="btn btn--danger" onClick={() => remove(o)}>Eliminar</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
