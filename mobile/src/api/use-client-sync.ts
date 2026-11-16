import { useEffect, useRef } from 'react';

import { useLookup, useStore } from '@/store/app-store';

import { API_ENABLED } from './client';
import { myAppointments } from './scheduling';

/** Área da cliente com API: carrega os agendamentos e atualiza a cada 30s (confirmação do sinal, novo valor…). */
export function useClientSync() {
  const s = useStore();
  const L = useLookup();
  const latest = useRef(s);
  latest.current = s;
  const active = API_ENABLED && s.role === 'cliente' && !!L.me?.id;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () =>
      myAppointments()
        .then((list) => !cancelled && latest.current.mergeAppointments(list))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [active, s.clientId]);
}
