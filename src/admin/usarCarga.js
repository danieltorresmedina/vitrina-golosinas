/**
 * Hook para cargar datos al abrir una pestaña y poder volver a cargarlos después de guardar.
 *
 * Ejemplo:
 *   const { datos, error, cargando, recargar } = usarCarga(() => listarPedidos());
 *   // ...después de borrar un pedido:  recargar();
 *
 * `funcion` se ejecuta una sola vez al abrir la pestaña (y cada vez que se llama `recargar`).
 */
import { useCallback, useEffect, useState } from 'react';

export function usarCarga(funcion) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });

  const recargar = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, cargando: true }));
    return funcion()
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => setEstado({ datos: null, error, cargando: false }));
    // `funcion` se captura solo la primera vez a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}
