import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Card, Chip, Empty, Row, Screen, StatusBadge, T } from '@/components/ui';
import { brl, fmtDateTime } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { space } from '@/theme';

const ACTIVE = ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'];

export default function ClienteAgenda() {
  const s = useStore();
  const L = useLookup();
  const [tab, setTab] = useState<'proximos' | 'historico'>('proximos');
  const mine = s.appointments.filter((a) => a.clientId === s.clientId);
  const list = (tab === 'proximos'
    ? mine.filter((a) => ACTIVE.includes(a.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : mine.filter((a) => !ACTIVE.includes(a.status)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)));

  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>MEUS{'\n'}HORÁRIOS</T>
      <Row>
        <Chip label="Próximos" selected={tab === 'proximos'} onPress={() => setTab('proximos')} />
        <Chip label="Histórico" selected={tab === 'historico'} onPress={() => setTab('historico')} />
      </Row>
      {list.length === 0 ? <Empty icon="calendar-outline" text={tab === 'proximos' ? 'Nenhum horário marcado. Que tal agendar?' : 'Seu histórico aparece aqui.'} /> : null}
      {list.map((a) => {
        const p = L.pro(a.professionalId);
        const svc = L.service(a.serviceId);
        return (
          <Card key={a.id} onPress={() => router.push(`/agendamento/${a.id}`)}>
            <Row gap={space.md}>
              <Avatar name={p.name} color={p.avatar} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{svc.name}</T>
                <T v="small" muted>{p.name}</T>
                <T v="small">{fmtDateTime(a.startsAt)}</T>
              </View>
              <T v="h3">{brl(a.price - (a.discountApplied ?? 0))}</T>
            </Row>
            <StatusBadge status={a.status} />
          </Card>
        );
      })}
    </Screen>
  );
}
