import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const KEY = 'vitrina.cart.v1';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function reducer(state, a) {
  switch (a.type) {
    case 'add': {
      const found = state.find((x) => x.id === a.item.id);
      return found
        ? state.map((x) => (x.id === found.id ? { ...x, qty: Math.min(x.qty + 1, 99) } : x))
        : [...state, { ...a.item, qty: 1 }];
    }
    case 'dec':
      return state.flatMap((x) => (x.id !== a.id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []));
    case 'remove':
      return state.filter((x) => x.id !== a.id);
    case 'clear':
      return [];
    case 'sync': {
      // Actualiza precios/nombres con el catálogo vigente y saca lo que ya no existe.
      const byId = new Map(a.products.map((p) => [p.id, p]));
      return state.flatMap((x) => {
        const p = byId.get(x.id);
        return p ? [{ ...x, name: p.name, price: p.price, image_url: p.image_url }] : [];
      });
    }
    default:
      return state;
  }
}

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, null, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* modo privado: el carro igual funciona en memoria */
    }
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
      add: (p) => dispatch({ type: 'add', item: { id: p.id, name: p.name, price: p.price, image_url: p.image_url } }),
      dec: (id) => dispatch({ type: 'dec', id }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      sync: (products) => dispatch({ type: 'sync', products }),
    }),
    [items],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
