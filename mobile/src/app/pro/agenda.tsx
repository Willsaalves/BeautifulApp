import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Chip, Empty, Row, Screen, StatusBadge, T } from '@/components/ui';
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
  const dayStart = day.getTime();
  const dayEnd = dayStart + 86400_000;
  const dayBlocks = s.blocks.filter((b) => new Date(b.startsAt).getTime() < dayEnd && new Date(b.endsAt).getTime() > dayStart);
  const dayTotal = list.filter((a) => !['cancelado', 'expirado'].includes(a.status)).reduce((x, a) => x + a.price, 0);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="display">AGENDA</T>
        <Button small variant="outline" title="Bloquear" icon="lock-closed" onPress={() => router.push('/config/bloqueios')} />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} contentOffset={{ x: 3 * 66, y: 0 }}>
        {days.map((d, i) => {
          const sel = i - 3 === offset;
          const blocked = s.blocks.some((b) => new Date(b.startsAt).getTime() < d.getTime() + 86400_000 && new Date(b.endsAt).getTime() > d.getTime());
          const count = s.appointments.filter((a) => a.professionalId === s.proId && new Date(a.startsAt).toDateString() === d.toDateString() && !['cancelado', 'expirado'].includes(a.status)).length;
          return (
            <Pressable key={i} onPress={() => setOffset(i - 3)} style={{ width: 58, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: sel ? colors.black : colors.card }}>
              <T v="small" color={sel ? colors.lilac : colors.textMuted} style={{ fontSize: 10, fontWeight: '700' }}>{WEEK[d.getDay()]}</T>
              <T v="title" color={sel ? colors.cardSolid : colors.text}>{d.getDate()}</T>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: count ? colors.lilacDeep : blocked ? colors.textMuted : 'transparent' }} />
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
      {dayBlocks.map((b) => {
        const st = new Date(Math.max(new Date(b.startsAt).getTime(), dayStart));
        const en = new Date(Math.min(new Date(b.endsAt).getTime(), dayEnd));
        const whole = st.getTime() === dayStart && en.getTime() === dayEnd;
        return (
          <Card key={b.id} onPress={() => router.push('/config/bloqueios')} style={{ backgroundColor: colors.bg, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.textMuted }}>
            <Row gap={space.md}>
              <View style={{ width: 52 }}>
                <T v="h3" muted>{whole ? 'Dia' : fmtTime(st)}</T>
                <T v="small" muted>{whole ? 'inteiro' : fmtTime(en)}</T>
              </View>
              <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
              <T v="h3" muted style={{ flex: 1 }}>{b.reason || 'Bloqueado'}</T>
            </Row>
          </Card>
        );
      })}
      {list.length === 0 && dayBlocks.length === 0 ? <Empty icon="calendar-outline" text="Dia livre. Envie lembretes para clientes atrasadas e preencha a agenda." /> : null}
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
