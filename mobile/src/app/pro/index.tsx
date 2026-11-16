import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { StoriesRow } from '@/components/media';
import { Avatar, Badge, Card, IconCircle, ProgressBar, Row, Screen, SectionTitle, Stat, StatusBadge, T } from '@/components/ui';
import { brl, fmtTime, isLowStock, overdueClients } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const MONTH_GOAL = 8000;

export default function ProHome() {
  const s = useStore();
  const L = useLookup();
  const me = L.myPro;
  const now = new Date();
  const mine = s.appointments.filter((a) => a.professionalId === me.id);
  const today = mine
    .filter((a) => sameDay(new Date(a.startsAt), now) && !['cancelado', 'expirado'].includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const toConfirm = mine.filter((a) => a.status === 'sinal_enviado');
  const waitingDeposit = mine.filter((a) => a.status === 'aguardando_sinal');
  const monthRevenue = mine
    .filter((a) => a.status === 'concluido' && new Date(a.startsAt).getMonth() === now.getMonth() && new Date(a.startsAt).getFullYear() === now.getFullYear())
    .reduce((sum, a) => sum + a.price - (a.discountApplied ?? 0), 0);
  const overdue = overdueClients(s.appointments, s.services, s.clients, me.id);
  const low = L.myProducts.filter(isLowStock);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="display">OLÁ,{'\n'}{me.name.split(' ')[0].toUpperCase()}! ✨</T>
        <Avatar name={me.name} color={me.avatar} size={48} />
      </Row>

      <StoriesRow onlyPro={me.id} />

      <Card onPress={() => router.push('/pro/lucro')}>
        <T v="overline" style={{ textAlign: 'center' }}>Seu mês até agora</T>
        <Row style={{ marginTop: space.sm }}>
          <Stat label="Faturamento" value={brl(monthRevenue)} sub={`meta ${brl(MONTH_GOAL)}`} />
          <Stat label="Hoje" value={`${today.length}`} sub="atendimentos" />
        </Row>
        <ProgressBar percent={(monthRevenue / MONTH_GOAL) * 100} height={10} />
      </Card>

      {toConfirm.length ? (
        <Card tone="lilac" onPress={() => router.push(`/agendamento/${toConfirm[0].id}`)}>
          <Row>
            <IconCircle icon="receipt" bg={colors.card} />
            <View style={{ flex: 1 }}>
              <T v="h3">{toConfirm.length} comprovante{toConfirm.length > 1 ? 's' : ''} para conferir</T>
              <T v="small">Confirme o Pix do sinal para garantir o horário</T>
            </View>
            <Ionicons name="chevron-forward" size={18} />
          </Row>
        </Card>
      ) : null}

      {waitingDeposit.length ? (
        <Card tone="cream">
          <Row>
            <IconCircle icon="time" bg={colors.card} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <T v="h3">{waitingDeposit.length} aguardando sinal</T>
              <T v="small" muted>Sem comprovante até o prazo, o horário é liberado sozinho</T>
            </View>
          </Row>
        </Card>
      ) : null}

      <SectionTitle title="Agenda de hoje" action="Ver agenda" onAction={() => router.push('/pro/agenda')} />
      {today.length === 0 ? <Card><T muted>Nenhum atendimento hoje.</T></Card> : null}
      {today.map((a) => (
        <Card key={a.id} onPress={() => router.push(`/agendamento/${a.id}`)}>
          <Row gap={space.md}>
            <View style={{ width: 52, alignItems: 'center' }}>
              <T v="h3">{fmtTime(a.startsAt)}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">{L.client(a.clientId).name}</T>
              <T v="small" muted>{L.service(a.serviceId).name}</T>
            </View>
            <StatusBadge status={a.status} />
          </Row>
        </Card>
      ))}

      {overdue.length ? (
        <>
          <SectionTitle title={`${overdue.length} clientes atrasadas para retorno`} action="Ver" onAction={() => router.push('/pro/clientes')} />
          <Card>
            {overdue.slice(0, 3).map((o) => (
              <Row key={o.client.id} gap={space.md}>
                <Avatar name={o.client.name} color={o.client.avatar} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="h3">{o.client.name}</T>
                  <T v="small" muted>{o.service.name}</T>
                </View>
                <Badge label={`${o.daysLate}d de atraso`} tone="danger" />
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {low.length ? (
        <Card tone="black" onPress={() => router.push('/pro/estoque')}>
          <Row>
            <IconCircle icon="alert" bg={colors.lilac} />
            <View style={{ flex: 1 }}>
              <T v="h3" color={colors.card}>Hora de comprar mais</T>
              <T v="small" color={colors.offWhite}>{low.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(' · ')}</T>
            </View>
          </Row>
        </Card>
      ) : null}

      <SectionTitle title="Ações rápidas" />
      <Row style={{ justifyContent: 'space-between' }}>
        {[
          { icon: 'cart' as const, label: 'Compra', go: () => router.push('/estoque/compra') },
          { icon: 'sparkles' as const, label: 'Serviços', go: () => router.push('/pro/perfil') },
          { icon: 'heart' as const, label: 'Fidelidade', go: () => router.push('/config/fidelidade') },
          { icon: 'eye' as const, label: 'Meu perfil', go: () => router.push(`/profissional/${me.id}`) },
        ].map((x) => (
          <Pressable key={x.label} onPress={x.go} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            <IconCircle icon={x.icon} bg={colors.card} size={52} />
            <T v="small">{x.label}</T>
          </Pressable>
        ))}
      </Row>
    </Screen>
  );
}
