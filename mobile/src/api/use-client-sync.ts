import { useEffect, useRef } from 'react';

import { useLookup, useStore } from '@/store/app-store';

import { API_ENABLED } from './client';
import { myLoyaltyCards, myReviews, myVouchers } from './business';
import { professionalFromCard } from './catalog';
import { myAppointments } from './scheduling';
import { myNextProcedures } from './social';

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
    const load = () => {
      myAppointments()
        .then((list) => !cancelled && latest.current.mergeAppointments(list))
        .catch(() => undefined);
      Promise.all([myLoyaltyCards(), myVouchers(latest.current.clientId), myReviews()])
        .then(([cards, vouchers, reviews]) => {
          if (cancelled) return;
          const st = latest.current;
          const missing = cards.filter((c) => !st.professionals.some((p) => p.id === c.professionalId));
          if (missing.length) {
            st.mergeRemote({ professionals: missing.map((c) => professionalFromCard({ id: c.professionalId, studio: c.studio, photoUrl: c.photo })) });
          }
          latest.current.setRemoteClientData({ cards, vouchers, reviews });
        })
        .catch(() => undefined);
    };
    load();
    myNextProcedures().then((d) => !cancelled && latest.current.setDreams(d)).catch(() => undefined);
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [active, s.clientId]);
}
