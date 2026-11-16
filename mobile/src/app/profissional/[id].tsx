import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar, Badge, Button, Card, Header, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { NICHE_LABEL, brl, loyaltyProgress } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

export default function PerfilProfissional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const p = L.pro(id);
  const services = s.services.filter((x) => x.professionalId === id);
  const fav = L.me.favorites.includes(id);
  const lp = loyaltyProgress(s.appointments, s.clientId, id, p.loyalty);
  const reviews = s.feedbacks.filter((f) => f.professionalId === id);

  return (
    <Screen bottomInset={40}>
      <Header
        right={
          <Pressable onPress={() => s.toggleFavorite(id)} hitSlop={10} accessibilityLabel="Favoritar">
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={26} color={fav ? colors.danger : colors.text} />
          </Pressable>
        }
      />
      <Row gap={space.md}>
        <Avatar name={p.name} color={p.avatar} size={76} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="title">{p.name}</T>
          <Badge label={NICHE_LABEL[p.niche]} />
          <T v="small" muted>⭐ {p.rating.toFixed(1)} · {p.reviews} avaliações · {p.distanceKm.toFixed(1)} km · {p.neighborhood}</T>
        </View>
      </Row>
      <T>{p.headline}</T>

      <SectionTitle title="Portfólio" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {p.portfolio.map((e, i) => (
          <View key={i} style={{ width: '31.5%', aspectRatio: 1, borderRadius: 16, backgroundColor: i % 2 ? colors.lilacSoft : colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 30 }}>{e}</T>
          </View>
        ))}
      </View>

      {p.loyalty.enabled ? (
        <Card tone="black">
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="overline" color={colors.lilac}>Seu cartão fidelidade</T>
            <T v="h3" color={colors.card}>{lp.percent}%</T>
          </Row>
          <ProgressBar percent={lp.percent} color={colors.lilac} track="#2A2A2A" height={10} />
          <T v="small" color={colors.offWhite}>
            Gaste {brl(p.loyalty.goalAmount)} e ganhe {p.loyalty.discountPercent}% OFF · faltam {brl(lp.remaining)}
          </T>
        </Card>
      ) : null}

      <SectionTitle title="Serviços" />
      {services.map((svc) => (
        <Card key={svc.id}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">{svc.name}</T>
              <T v="small" muted>{svc.durationMin} min · sinal {svc.depositPercent}% · retorno a cada {svc.returnIntervalDays} dias</T>
            </View>
            <T v="h3">{svc.options.length ? 'a partir de ' : ''}{brl(svc.price)}</T>
          </Row>
          <Button title="Agendar" small onPress={() => router.push(`/agendar/${svc.id}`)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ))}

      {reviews.length ? <SectionTitle title="Depoimentos" /> : null}
      {reviews.map((r) => (
        <Card key={r.id} tone="soft">
          <T v="small">{'⭐'.repeat(r.rating)}</T>
          <T>“{r.comment}”</T>
          <T v="small" muted>— {L.client(r.clientId).name}</T>
        </Card>
      ))}

      <Card tone="cream">
        <Row>
          <Ionicons name="shield-checkmark-outline" size={18} />
          <T v="small" style={{ flex: 1 }}>
            Política: o sinal via Pix deve ser pago em até {p.depositDeadlineHours}h após o agendamento. Sem o comprovante, o horário é liberado automaticamente.
          </T>
        </Row>
      </Card>
    </Screen>
  );
}
