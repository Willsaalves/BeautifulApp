import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, Empty, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl, fmtDate, loyaltyProgress } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

export default function ClientePerfil() {
  const s = useStore();
  const L = useLookup();
  const me = L.me;
  // fidelidade com toda profissional que já atendeu ou é favorita
  const proIds = Array.from(
    new Set([...me.favorites, ...s.appointments.filter((a) => a.clientId === me.id).map((a) => a.professionalId)]),
  );
  const vouchers = s.vouchers.filter((v) => v.clientId === me.id);

  return (
    <Screen>
      <Row gap={space.md} style={{ marginTop: space.sm }}>
        <Avatar name={me.name} color={me.avatar} size={64} />
        <View>
          <T v="title">{me.name}</T>
          <T muted>{me.phone}</T>
        </View>
      </Row>

      <SectionTitle title="Cartões fidelidade" />
      {proIds.map(L.pro).filter((p) => p.loyalty.enabled).map((p) => {
        const lp = loyaltyProgress(s.appointments, me.id, p.id, p.loyalty);
        return (
          <Card key={p.id} onPress={() => router.push(`/profissional/${p.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3">{p.name}</T>
              <T v="h3">{lp.percent}%</T>
            </Row>
            <ProgressBar percent={lp.percent} height={10} />
            <T v="small" muted>
              {brl(lp.inCycle)} de {brl(p.loyalty.goalAmount)} · ganha {p.loyalty.discountPercent}% de desconto ao completar
            </T>
          </Card>
        );
      })}

      <SectionTitle title="Vouchers" />
      {vouchers.length === 0 ? <Empty icon="gift-outline" text="Avalie seus atendimentos e complete cartões fidelidade para ganhar vouchers." /> : null}
      {vouchers.map((v) => (
        <Card key={v.id} tone={v.used ? 'white' : 'lilac'}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T v="title">{v.percent}% OFF</T>
              <T v="small">{v.label}</T>
              <T v="small" muted>desde {fmtDate(v.createdAt)}</T>
            </View>
            <Badge label={v.used ? 'Usado' : 'Disponível'} tone={v.used ? 'muted' : 'success'} />
          </Row>
        </Card>
      ))}

      <Button title="Trocar para área da profissional" variant="outline" icon="swap-horizontal" style={{ marginTop: space.lg }}
        onPress={() => { s.setRole('profissional'); router.replace('/pro'); }} />
      <Button title="Sair" variant="ghost" onPress={() => { s.setRole(null); router.replace('/'); }} />
      <T v="small" muted style={{ textAlign: 'center', color: colors.textMuted }}>Protótipo · dados de exemplo</T>
    </Screen>
  );
}
