import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Card, Chip, Empty, Row, Screen, StatusBadge, T } from '@/components/ui';
import { brl, fmtDate, fmtTime } from '@/domain/rules';
import type { AppointmentStatus } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const FILTERS: { label: string; statuses: AppointmentStatus[] | null }[] = [
  { label: 'Todos', statuses: null },
  { label: 'Confirmados', statuses: ['confirmado'] },
  { label: 'Aguardando sinal', statuses: ['aguardando_sinal', 'sinal_enviado'] },
  { label: 'Concluídos', statuses: ['concluido'] },
  { label: 'Cancelados', statuses: ['cancelado', 'expirado'] },
];

export default function ProAgenda() {
  const s = useStore();
  const L = useLookup();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState(0);
  const days = useMemo(() => {
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(d0);
      d.setDate(d.getDate() + i - 3);
      return d;
    });
  }, []);
  const day = days[offset + 3];
  const f = FILTERS[filter];
  const list = s.appointments
    .filter((a) => a.professionalId === s.proId && new Date(a.startsAt).toDateString() === day.toDateString())
    .filter((a) => !f.statuses || f.statuses.includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayTotal = list.filter((a) => !['cancelado', 'expirado'].includes(a.status)).reduce((x, a) => x + a.price, 0);

  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>AGENDA</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} contentOffset={{ x: 3 * 66, y: 0 }}>
        {days.map((d, i) => {
          const sel = i - 3 === offset;
          const count = s.appointments.filter((a) => a.professionalId === s.proId && new Date(a.startsAt).toDateString() === d.toDateString() && !['cancelado', 'expirado'].includes(a.status)).length;
          return (
            <Pressable key={i} onPress={() => setOffset(i - 3)} style={{ width: 58, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: sel ? colors.black : colors.card }}>
              <T v="small" color={sel ? colors.lilac : colors.textMuted} style={{ fontSize: 10, fontWeight: '700' }}>{WEEK[d.getDay()]}</T>
              <T v="title" color={sel ? colors.cardSolid : colors.text}>{d.getDate()}</T>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: count ? colors.lilacDeep : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {FILTERS.map((x, i) => <Chip key={x.label} label={x.label} selected={filter === i} onPress={() => setFilter(i)} />)}
      </ScrollView>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{fmtDate(day)}</T>
        <T v="small" muted>{list.length} atendimento(s) · {brl(dayTotal)}</T>
      </Row>
      {list.length === 0 ? <Empty icon="calendar-outline" text="Dia livre. Envie lembretes para clientes atrasadas e preencha a agenda." /> : null}
      {list.map((a) => {
        const svc = L.service(a.serviceId);
        const end = new Date(new Date(a.startsAt).getTime() + svc.durationMin * 60_000);
        return (
          <Card key={a.id} onPress={() => router.push(`/agendamento/${a.id}`)}>
            <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 52 }}>
                <T v="h3">{fmtTime(a.startsAt)}</T>
                <T v="small" muted>{fmtTime(end)}</T>
              </View>
              <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.lilac }} />
              <View style={{ flex: 1, gap: 4 }}>
                <T v="h3">{L.client(a.clientId).name}</T>
                <T v="small" muted>{svc.name} · {brl(a.price)}</T>
                <StatusBadge status={a.status} />
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
