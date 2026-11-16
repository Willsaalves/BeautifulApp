import { router, useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';

import { Avatar, Button, Card, Header, ProgressBar, Row, Screen, SectionTitle, Stat, StatusBadge, T } from '@/components/ui';
import { brl, fmtDateTime, loyaltyProgress } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

// Ficha da cliente (visão da profissional). Prontuário visual com fotos antes/depois entra na próxima etapa.
export default function Ficha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const c = L.client(id);
  const me = L.myPro;
  const history = s.appointments
    .filter((a) => a.clientId === id && a.professionalId === me.id)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const lp = loyaltyProgress(s.appointments, id, me.id, me.loyalty);
  const spent = history.filter((a) => a.status === 'concluido').reduce((x, a) => x + a.price, 0);

  return (
    <Screen bottomInset={40}>
      <Header title="Ficha da cliente" />
      <Row gap={space.md}>
        <Avatar name={c.name} color={c.avatar} size={64} />
        <View style={{ flex: 1 }}>
          <T v="title">{c.name}</T>
          <T muted>{c.phone}</T>
        </View>
      </Row>
      <Card>
        <Row>
          <Stat label="Atendimentos" value={String(history.filter((a) => a.status === 'concluido').length)} />
          <Stat label="Total gasto" value={brl(spent)} />
        </Row>
      </Card>
      {me.loyalty.enabled ? (
        <Card tone="lilac">
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="overline">Fidelidade</T>
            <T v="h3">{lp.percent}%</T>
          </Row>
          <ProgressBar percent={lp.percent} color={colors.black} track={colors.card} height={10} />
          <T v="small">Faltam {brl(lp.remaining)} para {me.loyalty.discountPercent}% OFF · já completou {lp.cycles}x</T>
        </Card>
      ) : null}
      <Button title="Enviar lembrete de retorno" icon="chatbubble-ellipses-outline" variant="outline"
        onPress={() => Linking.openURL(`https://wa.me/55${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi ${c.name}! Já está na hora da sua manutenção 💅 Agende pelo app.`)}`)} />
      <SectionTitle title="Linha do tempo" />
      {history.map((a) => (
        <Card key={a.id} onPress={() => router.push(`/agendamento/${a.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">{L.service(a.serviceId).name}</T>
            <T>{brl(a.price)}</T>
          </Row>
          <T v="small" muted>{fmtDateTime(a.startsAt)}</T>
          <StatusBadge status={a.status} />
        </Card>
      ))}
    </Screen>
  );
}
