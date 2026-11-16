import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { patchClient } from '@/api/auth';
import { professionalFromCard, professionalFromPublic, publicPage, serviceFromApi, trendingDesigns } from '@/api/catalog';
import { API_ENABLED } from '@/api/client';
import { uploadImage } from '@/api/media';
import { Bell } from '@/components/bell';
import { StoriesRow, Thumb } from '@/components/media';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconCircle,
  ProgressBar,
  Ring,
  Row,
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
} from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { currentCoords } from '@/lib/location';
import { pickImage } from '@/lib/pick-image';
import { colors, fonts, gradients, radius, space } from '@/theme';

const ACTIVE = ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'];

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}


export default function ClienteHome() {
  const s = useStore();
  const L = useLookup();
  const me = L.me;
  const now = new Date();
  const insets = useSafeAreaInsets();

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
  const favPros = me.favorites.filter((id) => s.professionals.some((p) => p.id === id)).map(L.pro);
  const loyaltyPros = Array.from(new Set([...s.loyaltyCards.map((c) => c.professionalId), ...favPros.map((p) => p.id)]))
    .filter((id) => s.professionals.some((p) => p.id === id))
    .map(L.pro)
    .filter((p) => L.loyalty(p.id).enabled);

  // API ligada: vitrine de designs mais perto / mais recentes
  const [remoteTrending, setRemoteTrending] = useState<string[] | null>(null);
  const latest = useRef(s);
  latest.current = s;
  useEffect(() => {
    if (!API_ENABLED) return;
    (async () => {
      const c = await currentCoords();
      const list = await trendingDesigns({ lat: c?.lat, lng: c?.lng });
      const st = latest.current;
      st.mergeRemote({
        professionals: list
          .filter((d) => !st.professionals.some((p) => p.id === d.professionalId))
          .map((d) => professionalFromCard({ id: d.professionalId, studio: d.studio, photoUrl: d.professionalPhotoUrl, distanceKm: d.distanceKm })),
        designs: list.map((d) => ({ id: d.id!, professionalId: d.professionalId!, serviceId: d.serviceId!, name: d.name ?? '', image: d.imageUrl ?? '', priceDelta: (d.priceDeltaCents ?? 0) / 100 })),
      });
      setRemoteTrending(list.map((d) => d.id!));
    })().catch(() => setRemoteTrending([]));
  }, []);
  const trending = API_ENABLED
    ? (remoteTrending ?? []).map((id) => s.designs.find((d) => d.id === id)!).filter(Boolean)
    : s.designs.slice(0, 8);

  /** O agendamento precisa do serviço completo (opções): carrega a página da profissional antes. */
  const openDesign = async (d: { id: string; professionalId: string; serviceId: string }) => {
    if (API_ENABLED && !s.services.some((x) => x.id === d.serviceId)) {
      try {
        const page = await publicPage(d.professionalId);
        const st = latest.current;
        st.mergeRemote({
          professionals: [professionalFromPublic(page.professional!, st.professionals.find((x) => x.id === d.professionalId))],
          services: (page.services ?? []).map((v) => serviceFromApi(v)),
          replaceServicesOf: d.professionalId,
        });
      } catch (e) {
        return notify('Não foi possível abrir', (e as Error).message);
      }
    }
    router.push(`/agendar/${d.serviceId}?designId=${d.id}`);
  };
  // Imagem do topo: a foto que a cliente escolheu (mesma da capa do perfil); sem ela, o fundo decorativo.
  const heroImage = me.cover;
  const [savingHero, setSavingHero] = useState(false);
  const changeHero = async () => {
    const uri = await pickImage();
    if (!uri) return;
    s.updateMe({ cover: uri }); // mostra na hora
    if (!API_ENABLED) return;
    setSavingHero(true);
    try {
      const { key } = await uploadImage('COVER', uri);
      s.applyMe(await patchClient({ coverKey: key }), 'cliente');
    } catch (e) {
      notify('Não foi possível salvar a imagem', (e as Error).message);
    } finally {
      setSavingHero(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      {/* ---------- Destaque (hero) ---------- */}
      <View style={[styles.hero, { paddingTop: insets.top + space.sm }]}>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <View style={[styles.blob, { width: 260, height: 260, top: -60, right: -80, backgroundColor: '#6B3A55' }]} />
            <View style={[styles.blob, { width: 180, height: 180, top: 120, right: 30, backgroundColor: '#8E4A6B', opacity: 0.35 }]} />
            <View style={[styles.blob, { width: 140, height: 140, top: 40, left: -50, backgroundColor: '#4A2A3B' }]} />
          </>
        )}
        <LinearGradient colors={['rgba(36,23,31,0.15)', 'rgba(36,23,31,0.85)']} style={StyleSheet.absoluteFill} />

        <Row style={{ justifyContent: 'flex-end' }}>
          <Pressable accessibilityLabel="Trocar foto do banner" onPress={changeHero} disabled={savingHero} style={styles.glassBtn}>
            {savingHero ? <ActivityIndicator color={colors.cardSolid} /> : <Ionicons name="camera-outline" size={20} color={colors.cardSolid} />}
          </Pressable>
          <Bell style={styles.glassBtn} color={colors.cardSolid} />
          <Pressable accessibilityLabel="Meu perfil" onPress={() => router.push('/cliente/perfil')}>
            <Avatar name={me.name} color={me.avatar} photo={me.photo} />
          </Pressable>
        </Row>

        <T v="display" style={styles.greeting}>
          OLÁ,{'\n'}{me.name.split(' ')[0].toUpperCase()}! ✨
        </T>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md, marginTop: space.lg }}>
      <StoriesRow />

      {/* Seus próximos procedimentos */}
      <Card>
        <T v="overline" style={{ textAlign: 'center' }}>Seus próximos procedimentos</T>
        <Row gap={space.lg} style={{ marginTop: space.sm }}>
          <Ring percent={dreamPct} sub={`${me.dreams.filter((d) => d.done).length}/${me.dreams.length}`} />
          <View style={{ flex: 1, gap: 6 }}>
            {me.dreams.length === 0 ? (
              <T muted>Quais são os seus próximos procedimentos, e até quando pretende realizá-los?</T>
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
            <Button small title={me.dreams.length ? 'Ver próximos' : 'Planejar procedimentos'} onPress={() => router.push('/proximos')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
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
        {loyaltyPros.map((p) => {
          const lp = L.loyalty(p.id);
          return (
            <Card key={p.id} style={{ width: 230 }} onPress={() => router.push(`/profissional/${p.id}`)}>
              <Row>
                <Avatar name={p.name} color={p.avatar} photo={p.photo} size={34} />
                <T v="small" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>{p.name}</T>
              </Row>
              <T v="display" style={{ fontSize: 30 }}>{lp.percent}%</T>
              <ProgressBar percent={lp.percent} />
              <T v="small" muted>Faltam {brl(lp.remaining)} para {lp.discountPercent}% OFF</T>
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
              <T v="h3" color={colors.cardSolid}>Você tem {myVouchers.length} voucher{myVouchers.length > 1 ? 's' : ''}</T>
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

      {/* ---------- Trending Designs ---------- */}
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T style={{ fontSize: 22, fontFamily: fonts.serifSemi }}>Trending Designs</T>
        <Pressable onPress={() => router.push('/cliente/explorar')} hitSlop={8}>
          <T v="small" muted>Ver todos ›</T>
        </Pressable>
      </Row>
      {API_ENABLED && remoteTrending && trending.length === 0 ? (
        <T v="small" muted>Ainda não há designs publicados perto de você.</T>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }} style={{ marginHorizontal: -space.lg }}>
        <View style={{ width: space.lg - space.md }} />
        {trending.map((d) => {
          const pro = L.pro(d.professionalId);
          const fav = me.favorites.includes(pro.id);
          return (
            <Pressable key={d.id} onPress={() => openDesign(d)} style={{ width: 140 }}>
              <View>
                <Thumb src={d.image} bg={colors.blush} style={{ width: 140, height: 170, borderRadius: 22 }} emojiSize={56} />
                <Pressable onPress={() => s.toggleFavorite(pro.id)} hitSlop={8} accessibilityLabel="Favoritar" style={styles.heart}>
                  <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? colors.danger : colors.black} />
                </Pressable>
              </View>
              <T style={{ fontWeight: '700', marginTop: 8 }} numberOfLines={1}>{d.name}</T>
              <T v="small" muted numberOfLines={1}>{pro.name.split(' ')[0]}{d.priceDelta ? ` · +${brl(d.priceDelta)}` : ''}</T>
            </Pressable>
          );
        })}
        <View style={{ width: space.lg - space.md }} />
      </ScrollView>

      </View>
    </ScrollView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.plumDeep,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.55 },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink },
  greeting: { color: colors.cardSolid, fontSize: 40, lineHeight: 42, marginTop: 120, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8 },
  heart: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
});
