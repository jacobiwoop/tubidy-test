import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// Charge /api/<route> et suit les paramètres ; rend { data, error, loading, retry }.
export function useApi(route, params) {
  const key = route && JSON.stringify(params || {});
  const [state, setState] = useState({ data: null, error: null, loading: !!route });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!route) return;
    const ctrl = new AbortController();
    setState((s) => ({ data: s.data && s.key === key ? s.data : null, error: null, loading: true, key }));
    api(route, params, { signal: ctrl.signal, fresh: nonce > 0 })
      .then((data) => setState({ data, error: null, loading: false, key }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: null, error, loading: false, key }); });
    return () => ctrl.abort();
  }, [route, key, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}
