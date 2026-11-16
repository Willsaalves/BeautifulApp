import { router } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/store/app-store';

/** Termos ou Política mudaram de versão: pede o novo aceite antes de continuar usando o app. */
export function useLegalGate() {
  const legal = useStore().legal;
  useEffect(() => {
    if (legal && !legal.accepted) router.push('/legal/aceite');
  }, [legal]);
}
