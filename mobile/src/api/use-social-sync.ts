import { useEffect, useRef } from 'react';

import { useLookup, useStore } from '@/store/app-store';

import { API_ENABLED } from './client';
import { activeStories, inbox } from './social';

/** Stories ativos e contador do sino, atualizados ao entrar e a cada 30s. */
export function useSocialSync() {
  const s = useStore();
  const L = useLookup();
  const latest = useRef(s);
  latest.current = s;
  const active = API_ENABLED && (s.role === 'cliente' ? !!L.me?.id : !!L.myPro?.remote);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      activeStories().then((list) => !cancelled && latest.current.setRemoteStories(list)).catch(() => undefined);
      inbox().then((box) => !cancelled && latest.current.setUnread(box.unread ?? 0)).catch(() => undefined);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [active, s.role]);
}
