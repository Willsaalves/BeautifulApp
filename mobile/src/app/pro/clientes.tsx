import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useProStats } from '@/api/use-pro-stats';
import { Avatar, Badge, Card, Chip, ProgressBar, Row, Screen, T } from '@/components/ui';
import { fmtDate, lastDoneOf, loyaltyProgress } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

export default function ProClientes() {
  const s = useStore();
  const L = useLookup();
  const me = L.myPro;
  const [q, setQ] = useState('');
  const [onlyLate, setOnlyLate] = useState(false);
  const mineAppts = s.appointments.filter((a) => a.professionalId === me.id);
  const { overdue } = useProStats();
  const lateMap = Object.fromEntries(overdue.map((o) => [o.client.id, o.daysLate]));
  const clients = s.clients
    .filter((c) => mineAppts.some((a) => a.clientId === c.id))
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => !onlyLate || lateMap[c.id]);

  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>CLIENTES</T>
      <Row style={{ backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 48 }}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar cliente" placeholderTextColor={colors.textMuted} style={{ flex: 1, fontSize: 15, color: colors.text }} />
      </Row>
      <Row>
        <Chip label="Todas" selected={!onlyLate} onPress={() => setOnlyLate(false)} />
        <Chip label={`Atrasadas (${overdue.length})`} selected={onlyLate} onPress={() => setOnlyLate(true)} />
      </Row>
      {clients.map((c) => {
        const lp = loyaltyProgress(s.appointments, c.id, me.id, me.loyalty);
        const last = lastDoneOf(mineAppts, s.services, c.id)[0];
        return (
          <Card key={c.id} onPress={() => router.push(`/ficha/${c.id}`)}>
            <Row gap={space.md}>
              <Avatar name={c.name} color={c.avatar} photo={c.photo} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{c.name}</T>
                <T v="small" muted>{last ? `Último: ${last.service.name} · ${fmtDate(last.appointment.startsAt)}` : 'Primeiro atendimento agendado'}</T>
              </View>
              {lateMap[c.id] ? <Badge label={`${lateMap[c.id]}d atraso`} tone="danger" /> : null}
            </Row>
            {me.loyalty.enabled ? (
              <Row>
                <View style={{ flex: 1 }}><ProgressBar percent={lp.percent} /></View>
                <T v="small" style={{ fontWeight: '700' }}>{lp.percent}% fidelidade</T>
              </Row>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
