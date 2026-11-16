import { useEffect, useRef, useState } from 'react';

import { useLookup, useStore } from '@/store/app-store';

import {
  designFromApi,
  myDesigns,
  myServices,
  myWidgets,
  saveWidgets,
  serviceFromApi,
  widgetFromApi,
  widgetsSignature,
} from './catalog';
import { API_ENABLED } from './client';

/**
 * Área da profissional com API ligada:
 * 1) ao entrar, carrega serviços, designs e página do servidor;
 * 2) qualquer mudança na página (blocos) é salva sozinha ~1s depois.
 */
export function useProSync() {
  const s = useStore();
  const L = useLookup();
  const latest = useRef(s);
  latest.current = s;
  const loaded = useRef(false);
  const lastSig = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = API_ENABLED && s.role === 'profissional' && !!L.myPro?.remote;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loaded.current = false;
    (async () => {
      try {
        const [svcs, dz, ws] = await Promise.all([myServices(), myDesigns(), myWidgets()]);
        if (cancelled) return;
        const st = latest.current;
        const widgets = ws.map(widgetFromApi);
        st.mergeRemote({
          services: svcs.map((v) => serviceFromApi(v, st.services.find((x) => x.id === v.id))),
          replaceServicesOf: st.proId,
          designs: dz.map(designFromApi),
          replaceDesignsOf: st.proId,
          widgetsOf: { professionalId: st.proId, widgets },
        });
        lastSig.current = widgetsSignature(widgets);
        loaded.current = true;
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [active, s.proId]);

  const widgets = L.myPro?.widgets ?? [];
  const sig = widgetsSignature(widgets);

  useEffect(() => {
    if (!active || !loaded.current || sig === lastSig.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await saveWidgets(widgets);
        const mapped = res.map(widgetFromApi);
        lastSig.current = widgetsSignature(mapped);
        const st = latest.current;
        const current = st.professionals.find((p) => p.id === st.proId)?.widgets ?? [];
        // só aplica se ela não mexeu de novo enquanto salvava
        if (widgetsSignature(current) === sig) st.mergeRemote({ widgetsOf: { professionalId: st.proId, widgets: mapped } });
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, active]);

  return { error, saving };
}
