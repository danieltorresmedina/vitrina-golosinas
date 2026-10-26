import { useEffect, useState } from 'react';
import { useCart } from '../lib/cart.jsx';
import { clp } from '../lib/money';
import { saveOrder } from '../lib/api';
import { buildMessage, orderCode, waUrl } from '../lib/whatsapp';

export default function Cart({ open, onClose, waNumber, storeName }) {
  const { items, total, add, dec, remove, clear } = useCart();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { url, code }
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  async function send() {
    setError('');
    if (!String(waNumber || '').replace(/\D/g, '')) {
      setError('La tienda aún no tiene un número de WhatsApp configurado.');
      return;
    }
    const code = orderCode();
    const message = buildMessage({ code, name: name.trim(), note: note.trim(), items, total, storeName });
    const url = waUrl(waNumber, message);

    setSending(true);
    // Guardamos el pedido, pero nunca dejamos al cliente esperando más de 2,5 s.
    await Promise.race([
      saveOrder({ code, name: name.trim(), note: note.trim(), items, total }).catch(() => {}),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    setSending(false);
    setSent({ url, code });
    clear();
    window.location.href = url;
  }

  if (!open) return null;

  return (
    <div className="drawer-wrap" role="presentation">
      <button className="drawer-scrim" aria-label="Cerrar carro" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Mi carro">
        <div className="drawer__head">
          <h2>Mi carro</h2>
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
        </div>

        {sent ? (
          <div className="drawer__empty">
            <p>
              Tu pedido <strong>#{sent.code}</strong> está listo. Si WhatsApp no se abrió, toca el botón para
              enviarlo.
            </p>
            <a className="btn btn--whats" href={sent.url}>Abrir WhatsApp</a>
          </div>
        ) : items.length === 0 ? (
          <div className="drawer__empty">
            <p>Tu carro está vacío. Agrega golosinas desde la vitrina.</p>
            <button className="btn btn--candy" onClick={onClose}>Ver productos</button>
          </div>
        ) : (
          <>
            <ul className="lines">
              {items.map((i) => (
                <li key={i.id} className="line">
                  <div className="line__info">
                    <strong>{i.name}</strong>
                    <span>{clp(i.price)} c/u</span>
                  </div>
                  <div className="stepper stepper--sm" role="group" aria-label={`Cantidad de ${i.name}`}>
                    <button onClick={() => dec(i.id)} aria-label="Quitar uno">−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => add(i)} aria-label="Agregar uno">+</button>
                  </div>
                  <b className="line__sum">{clp(i.price * i.qty)}</b>
                  <button className="line__x" onClick={() => remove(i.id)} aria-label={`Quitar ${i.name}`}>×</button>
                </li>
              ))}
            </ul>

            <div className="drawer__form">
              <label className="field">
                <span>Tu nombre (opcional)</span>
                <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
              <label className="field">
                <span>Nota para el pedido (opcional)</span>
                <input
                  value={note}
                  maxLength={300}
                  placeholder="Ej: retiro en la tarde, sin coco…"
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            <div className="drawer__foot">
              <div className="total">
                <span>Total</span>
                <strong>{clp(total)}</strong>
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn--whats btn--block" onClick={send} disabled={sending}>
                {sending ? 'Preparando pedido…' : 'Enviar pedido por WhatsApp'}
              </button>
              <p className="hint">Se abrirá WhatsApp con tu pedido escrito. Coordinamos pago y entrega por ahí.</p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
