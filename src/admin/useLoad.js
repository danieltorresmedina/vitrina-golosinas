import { useCallback, useEffect, useState } from 'react';

// Carga datos y permite recargarlos: const { data, error, loading, reload } = useLoad(fn)
export function useLoad(fn) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return fn()
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
