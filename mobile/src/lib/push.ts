import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { API_ENABLED } from '@/api/client';
import { registerDevice, unregisterDevice } from '@/api/social';

// Com o app aberto, a notificação também aparece como banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let currentToken: string | null = null;

/**
 * Pede permissão, obtém o token do Expo e registra este celular na API.
 * Precisa do projectId do EAS (npx eas-cli init); sem ele o push fica desligado e o app segue normal.
 */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!API_ENABLED || !enabled || Platform.OS === 'web') return;
    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', { name: 'Avisos', importance: Notifications.AndroidImportance.HIGH });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          console.info('[push] sem projectId do EAS: rode "npx eas-cli init" para ativar notificações push.');
          return;
        }
        currentToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        await registerDevice(currentToken, Platform.OS);
      } catch (e) {
        console.info('[push] não foi possível ativar:', (e as Error).message);
      }
    })();

    // tocar na notificação abre o agendamento
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.appointmentId;
      if (typeof id === 'string') router.push(`/agendamento/${id}`);
    });
    return () => sub.remove();
  }, [enabled]);
}

/** No logout: este celular para de receber push da conta. */
export async function unregisterPush() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await unregisterDevice(token).catch(() => undefined);
}
