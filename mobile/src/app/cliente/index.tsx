import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { StoriesRow } from '@/components/media';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconCircle,
  ProgressBar,
  Ring,
  Row,
  Screen,
  SectionTitle,
  StatusBadge,
  T,
} from '@/components/ui';
import {
  NICHE_ICON,
  brl,
  daysBetween,
  dreamsProgress,
  fmtDate,
  fmtDateTime,
  lastDoneOf,
  loyaltyProgress,
} from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const ACTIVE = ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'];

export default function ClienteHome() {
  const s = useStore();
  const L = useLookup();
  const me = L.me;
  const now = new Date();

  const upcoming = s.appointments
    .filter((a) => a.clientId === me.id && ACTIVE.includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next = upcoming[0];

  // último de cada serviço (ex: "último botox") — sem duplicar serviço
  const seen = new Set<string>();
  const lasts = lastDoneOf(s.appointments, s.services, me.id).filter((x) => {
    if (seen.has(x.service.id)) return false;
    seen.add(x.service.id);
    return true;
  });

  const pendingFeedback = s.appointments.find(
    (a) => a.clientId === me.id && a.status === 'concluido' && !s.feedbacks.some((f) => f.appointmentId === a.id),
  );
  const myVouchers = s.vouchers.filter((v) => v.clientId === me.id && !v.used);
  const dreamPct = dreamsProgress(me.dreams);
  const favPros = me.favorites.map(L.pro);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="display">OLÁ,{'\n'}{me.name.toUpperCase()}! ✨</T>
        <Row>
          <Pressable style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications-outline" size={20} />
          </Pressable>
          <Pressable onPress={() => router.push('/cliente/perfil')}>
            <Avatar name={me.name} color={me.avatar} />
          </Pressable>
        </Row>
      </Row>

      <StoriesRow />

      {/* Procedimentos dos sonhos */}
      <Card>
        <T v="overline" style={{ textAlign: 'center' }}>Seus procedimentos dos sonhos</T>
        <Row gap={space.lg} style={{ marginTop: space.sm }}>
          <Ring percent={dreamPct} sub={`${me.dreams.filter((d) => d.done).length}/${me.dreams.length}`} />
          <View style={{ flex: 1, gap: 6 }}>
            {me.dreams.length === 0 ? (
              <T muted>Quais são os seus próximos procedimentos dos sonhos, e até quando pretende realizá-los?</T>
            ) : (
              me.dreams.slice(0, 3).map((d) => (
                <Row key={d.id} gap={6}>
                  <Ionicons
                    name={d.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={d.done ? colors.lilacDeep : colors.textMuted}
                  />
                  <T v="small" style={{ flex: 1, textDecorationLine: d.done ? 'line-through' : 'none' }} numberOfLines={1}>
                    {NICHE_ICON[d.niche]} {d.label}
                  </T>
                  <T v="small" muted>{fmtDate(d.targetDate).split(', ')[1]}</T>
                </Row>
              ))
            )}
            <Button small title={me.dreams.length ? 'Ver meus sonhos' : 'Definir sonhos'} onPress={() => router.push('/sonhos')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </View>
        </Row>
      </Card>

      {/* Próximo horário */}
      {next ? (
        <Card onPress={() => router.push(`/agendamento/${next.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="overline">Meu próximo horário</T>
            <StatusBadge status={next.status} />
          </Row>
          <T v="title">{L.service(next.serviceId).name}</T>
          <T muted>{L.pro(next.professionalId).name} · {fmtDateTime(next.startsAt)}</T>
          {next.status === 'aguardando_sinal' ? (
            <Card tone="cream" style={{ padding: space.md }}>
              <Row>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <T v="small" style={{ flex: 1 }}>
                  Pague o sinal de <T v="small" style={{ fontWeight: '800' }}>{brl(next.depositAmount)}</T> até{' '}
                  {fmtDateTime(next.depositDueAt)} ou o horário será liberado.
                </T>
              </Row>
            </Card>
          ) : null}
          {next.status === 'ajuste_pendente' && next.adjustment ? (
            <Card tone="cream" style={{ padding: space.md }}>
              <T v="small">A profissional sugeriu novo valor: <T v="small" style={{ fontWeight: '800' }}>{brl(next.adjustment.newPrice)}</T>. Toque para responder.</T>
            </Card>
          ) : null}
        </Card>
      ) : null}

      {/* Último procedimento + reagendar */}
      {lasts.slice(0, 2).map(({ appointment, service, nextAt }) => {
        const ago = daysBetween(new Date(appointment.startsAt), now);
        const until = daysBetween(now, nextAt);
        return (
          <Card key={service.id} tone="lilac">
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="overline">Último: {service.name}</T>
              <T v="small">{NICHE_ICON[service.niche]}</T>
            </Row>
            <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <T v="display" style={{ fontSize: 30 }}>{fmtDate(appointment.startsAt).split(', ')[1]}</T>
                <T v="small">há {ago} dias com {L.pro(appointment.professionalId).name}</T>
              </View>
              <Badge
                label={until > 0 ? `manutenção em ${until}d` : `atrasado ${-until}d`}
                tone={until > 7 ? 'muted' : until > 0 ? 'warning' : 'danger'}
              />
            </Row>
            <Button
              title="Reagendar procedimento"
              icon="repeat"
              onPress={() => router.push(`/agendar/${service.id}?repeat=${appointment.id}`)}
            />
          </Card>
        );
      })}

      {/* Fidelidade */}
      <SectionTitle title="Minha fidelidade" action="Ver tudo" onAction={() => router.push('/cliente/perfil')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
        {favPros.filter((p) => p.loyalty.enabled).map((p) => {
          const lp = loyaltyProgress(s.appointments, me.id, p.id, p.loyalty);
          return (
            <Card key={p.id} style={{ width: 230 }} onPress={() => router.push(`/profissional/${p.id}`)}>
              <Row>
                <Avatar name={p.name} color={p.avatar} size={34} />
                <T v="small" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>{p.name}</T>
              </Row>
              <T v="display" style={{ fontSize: 30 }}>{lp.percent}%</T>
              <ProgressBar percent={lp.percent} />
              <T v="small" muted>Faltam {brl(lp.remaining)} para {p.loyalty.discountPercent}% OFF</T>
            </Card>
          );
        })}
      </ScrollView>

      {/* Vouchers */}
      {myVouchers.length ? (
        <Card tone="black">
          <Row>
            <IconCircle icon="gift" bg={colors.lilac} />
            <View style={{ flex: 1 }}>
              <T v="h3" color={colors.card}>Você tem {myVouchers.length} voucher{myVouchers.length > 1 ? 's' : ''}</T>
              <T v="small" color={colors.offWhite}>{myVouchers.map((v) => `${v.percent}% · ${v.label}`).join('\n')}</T>
            </View>
          </Row>
        </Card>
      ) : null}

      {/* Feedback */}
      {pendingFeedback ? (
        <Card tone="soft" onPress={() => router.push(`/feedback/${pendingFeedback.id}`)}>
          <Row>
            <IconCircle icon="star" bg={colors.card} />
            <View style={{ flex: 1 }}>
              <T v="h3">Como foi seu {L.service(pendingFeedback.serviceId).name.toLowerCase()}?</T>
              <T v="small" muted>Avalie e ganhe um bônus do mês no app</T>
            </View>
            <Ionicons name="chevron-forward" size={18} />
          </Row>
        </Card>
      ) : null}

      {/* Rotina rápida (atalhos por nicho) */}
      <SectionTitle title="Encontre perto de você" action="Ver todas" onAction={() => router.push('/cliente/explorar')} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          {(['unha', 'cilios', 'sobrancelha', 'estetica', 'cabelo'] as const).map((n) => (
            <Pressable key={n} onPress={() => router.push(`/cliente/explorar?niche=${n}`)} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontSize: 20 }}>{NICHE_ICON[n]}</T>
              </View>
              <T v="small" style={{ fontSize: 11 }}>{{ unha: 'Unhas', cilios: 'Cílios', sobrancelha: 'Sobrancelha', estetica: 'Estética', cabelo: 'Cabelo' }[n]}</T>
            </Pressable>
          ))}
        </Row>
      </Card>
    </Screen>
  );
}
