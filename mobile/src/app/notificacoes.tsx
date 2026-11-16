import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { API_ENABLED, type Schemas } from '@/api/client';
import { inbox, readAll } from '@/api/social';
import { Card, Empty, Header, IconCircle, Row, Screen, T, type IconName } from '@/components/ui';
import { fmtDateTime } from '@/domain/rules';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const ICON: Record<string, IconName> = {
  CREATED: 'calendar',
  RECEIPT_SENT: 'receipt',
  DEPOSIT_CONFIRMED: 'checkmark-circle',
  RECEIPT_REJECTED: 'alert-circle',
  ADJUSTMENT_PROPOSED: 'pricetag',
  ADJUSTMENT_ACCEPTED: 'pricetag',
  ADJUSTMENT_DECLINED: 'pricetag',
  COMPLETED: 'star',
  CANCELLED_BY_CLIENT: 'close-circle',
  CANCELLED_BY_PROFESSIONAL: 'close-circle',
  EXPIRED: 'time',
  DEPOSIT_DUE_SOON: 'time',
  CHAT_MESSAGE: 'chatbubble-ellipses',
};

// Caixa de entrada: tudo que também chega como push.
export default function Notificacoes() {
  const s = useStore();
  const [items, setItems] = useState<Schemas['NotificationView'][] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!API_ENABLED) return setItems([]);
    inbox()
      .then((box) => {
        setItems(box.items ?? []);
        if ((box.unread ?? 0) > 0) readAll().then(() => s.setUnread(0)).catch(() => undefined);
      })
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen bottomInset={40}>
      <Header title="Notificações" />
      {error ? <T color={colors.danger}>{error}</T> : null}
      {items === null && !error ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
      {items?.length === 0 ? <Empty icon="notifications-outline" text={API_ENABLED ? 'Nenhuma notificação por enquanto.' : 'As notificações chegam quando o app está ligado ao servidor.'} /> : null}
      {items?.map((n) => (
        <Card key={n.id} tone={n.read ? 'white' : 'soft'} onPress={n.appointmentId ? () => router.push(`/agendamento/${n.appointmentId}`) : undefined}>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <IconCircle icon={ICON[n.kind ?? ''] ?? 'notifications'} bg={n.read ? colors.lilacSoft : colors.cardSolid} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">{n.title}</T>
              <T v="small">{n.body}</T>
              <T v="small" muted>{fmtDateTime(n.createdAt ?? new Date())}</T>
            </View>
            {n.appointmentId ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
