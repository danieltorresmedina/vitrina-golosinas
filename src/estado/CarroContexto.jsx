/**
 * Estado del carro de compras, compartido por toda la aplicación.
 *
 * Uso en cualquier componente:
 *   const { articulos, total, agregar } = usarCarro();
 *
 * El carro se guarda en el navegador del cliente (localStorage), así no se pierde al recargar.
 * Cada artículo del carro es: { id, nombre, precio, imagenUrl, cantidad }.
 */
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

// Si algún día cambia la forma de los artículos, subir el número para ignorar carros viejos.
const CLAVE_ALMACENAMIENTO = 'vitrina.carro.v2';

function leerCarroGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ALMACENAMIENTO));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return []; // modo privado o dato dañado: se parte con el carro vacío
  }
}

/** Cada "acción" describe un cambio; esta función devuelve el carro nuevo. */
function reductor(articulos, accion) {
  switch (accion.tipo) {
    case 'agregar': {
      const existente = articulos.find((i) => i.id === accion.producto.id);
      if (existente) {
        return articulos.map((i) => (i.id === existente.id ? { ...i, cantidad: Math.min(i.cantidad + 1, 99) } : i));
      }
      return [...articulos, { ...accion.producto, cantidad: 1 }];
    }
    case 'quitarUno':
      // Resta 1; si llega a 0, el producto sale del carro.
      return articulos.flatMap((i) => {
        if (i.id !== accion.id) return [i];
        return i.cantidad > 1 ? [{ ...i, cantidad: i.cantidad - 1 }] : [];
      });
    case 'eliminar':
      return articulos.filter((i) => i.id !== accion.id);
    case 'vaciar':
      return [];
    case 'sincronizar': {
      // Actualiza nombre/precio/foto con el catálogo vigente y saca lo que ya no existe.
      const porId = new Map(accion.productos.map((p) => [p.id, p]));
      return articulos.flatMap((i) => {
        const vigente = porId.get(i.id);
        return vigente
          ? [{ ...i, nombre: vigente.nombre, precio: vigente.precio, imagenUrl: vigente.imagenUrl }]
          : [];
      });
    }
    default:
      return articulos;
  }
}

const CarroContexto = createContext(null);

export function ProveedorCarro({ children }) {
  const [articulos, enviar] = useReducer(reductor, null, leerCarroGuardado);

  // Cada vez que cambia el carro, se guarda en el navegador.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(articulos));
    } catch {
      /* en modo privado igual funciona, solo que sin guardar */
    }
  }, [articulos]);

  const valor = useMemo(
    () => ({
      articulos,
      cantidadTotal: articulos.reduce((suma, i) => suma + i.cantidad, 0),
      total: articulos.reduce((suma, i) => suma + i.cantidad * i.precio, 0),
      agregar: (p) =>
        enviar({
          tipo: 'agregar',
          producto: { id: p.id, nombre: p.nombre, precio: p.precio, imagenUrl: p.imagenUrl },
        }),
      quitarUno: (id) => enviar({ tipo: 'quitarUno', id }),
      eliminar: (id) => enviar({ tipo: 'eliminar', id }),
      vaciar: () => enviar({ tipo: 'vaciar' }),
      sincronizar: (productos) => enviar({ tipo: 'sincronizar', productos }),
    }),
    [articulos],
  );

  return <CarroContexto.Provider value={valor}>{children}</CarroContexto.Provider>;
}

export const usarCarro = () => useContext(CarroContexto);
