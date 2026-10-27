import { useEffect, useMemo, useState } from 'react';
import { fetchShop } from '../lib/api';
import { demoMode } from '../lib/supabase';
import { clp } from '../lib/money';
import { useCart } from '../lib/cart.jsx';
import Cart from '../components/Cart.jsx';

const EMOJI = [
  [/cuchufl/i, '🥖'],
  [/cocad/i, '🥥'],
  [/gomit|gomas/i, '🐻'],
  [/choco/i, '🍫'],
  [/pack|caja|combo/i, '🎁'],
];
const TILES = ['var(--lemon)', 'var(--mint)', 'var(--bubble)'];

function emojiFor(text) {
  return (EMOJI.find(([re]) => re.test(text)) ?? [null, '🍬'])[1];
}

function Photo({ product, index }) {
  const [broken, setBroken] = useState(false);
  if (product.image_url && !broken) {
    return (
      <img
        className="photo"
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="photo photo--empty" style={{ background: TILES[index % TILES.length] }} aria-hidden="true">
      <span>{emojiFor(`${product.category} ${product.name}`)}</span>
    </div>
  );
}

function ProductCard({ product, index }) {
  const { items, add, dec } = useCart();
  const qty = items.find((i) => i.id === product.id)?.qty ?? 0;

  return (
    <li className="card">
      <div className="card__media">
        <Photo product={product} index={index} />
        <span className="tag">{product.category}</span>
      </div>
      <div className="card__body">
        <h3>{product.name}</h3>
        {product.description && <p className="card__desc">{product.description}</p>}
        <div className="card__foot">
          <strong className="price">{clp(product.price)}</strong>
          {qty === 0 ? (
            <button className="btn btn--candy" onClick={() => add(product)}>
              Agregar
            </button>
          ) : (
            <div className="stepper" role="group" aria-label={`Cantidad de ${product.name}`}>
              <button onClick={() => dec(product.id)} aria-label="Quitar uno">−</button>
              <span aria-live="polite">{qty}</span>
              <button onClick={() => add(product)} aria-label="Agregar uno">+</button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Shop() {
  const [state, setState] = useState({ status: 'loading' });
  const [category, setCategory] = useState('Todos');
  const [open, setOpen] = useState(false);
  const { count, total, sync } = useCart();

  useEffect(() => {
    let alive = true;
    fetchShop()
      .then((data) => {
        if (!alive) return;
        setState({ status: 'ready', ...data });
        sync(data.products);
      })
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const products = state.products ?? [];
  const categories = useMemo(() => ['Todos', ...new Set(products.map((p) => p.category))], [products]);
  const visible = category === 'Todos' ? products : products.filter((p) => p.category === category);
  const storeName = state.settings?.store_name ?? '';

  useEffect(() => {
    if (storeName) document.title = `${storeName} · Golosinas`;
  }, [storeName]);

  return (
    <>
      {demoMode && (
        <div className="demo-bar">
          Modo demo: estos productos son de ejemplo. Conecta Supabase para usar los tuyos.
        </div>
      )}
      <header className="topbar">
        <div className="awning" aria-hidden="true" />
        <div className="topbar__row">
          <a className="brand" href="/">{storeName || 'Golosinas'}</a>
          <button className="btn btn--ink cart-btn" onClick={() => setOpen(true)}>
            Mi carro
            <span className="cart-btn__count">{count}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <h1>Cuchuflíes, cocadas y pastelitos listos para pedir</h1>
            <p>
              Elige tus golosinas, arma el carro y envíanos el pedido por WhatsApp. Coordinamos el pago y la
              entrega contigo.
            </p>
          </div>
          <div className="stamp" aria-hidden="true">
            <span>Pide por</span>
            <strong>WhatsApp</strong>
          </div>
        </section>

        <section className="shelf" aria-labelledby="catalogo">
          <h2 id="catalogo" className="sr-only">Catálogo</h2>

          {state.status === 'ready' && categories.length > 2 && (
            <div className="chips" role="tablist" aria-label="Categorías">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={c === category}
                  className={`chip ${c === category ? 'is-on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {state.status === 'loading' && <p className="notice">Abriendo la vitrina…</p>}
          {state.status === 'error' && (
            <p className="notice">No pudimos cargar los productos. Revisa tu conexión y recarga la página.</p>
          )}
          {state.status === 'ready' && products.length === 0 && (
            <p className="notice">Aún no hay productos. Vuelve pronto.</p>
          )}

          <ul className="grid">
            {visible.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span>{storeName || 'Golosinas'} · Pedidos por WhatsApp</span>
      </footer>

      {count > 0 && !open && (
        <button className="fab" onClick={() => setOpen(true)}>
          Ver carro ({count}) · {clp(total)}
        </button>
      )}

      <Cart
        open={open}
        onClose={() => setOpen(false)}
        waNumber={state.settings?.whatsapp_number}
        storeName={storeName}
      />
    </>
  );
}
