import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { professionalFromCard, professionalFromPublic, publicPage, serviceFromApi, trendingDesigns } from '@/api/catalog';
import { API_ENABLED } from '@/api/client';
import { Bell } from '@/components/bell';
import { Thumb } from '@/components/media';
import { Avatar, Badge, Button, Card, IconCircle, ProgressBar, Ring, Row, SectionTitle, T, type IconName } from '@/components/ui';
import { CATEGORIES, NICHE_ICON, brl, daysBetween, fmtDate, fmtDateTime, lastDoneOf } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { currentCoords, currentPlaceLabel } from '@/lib/location';
import { brand, colors, gradients, radius, space } from '@/theme';

const LOGO = require('../../../assets/brand/glammi-white.png');
const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTH = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "Quinta 10h" / "dia 23 de julho" */
function whenParts(iso: string) {
  const d = new Date(iso);
  const time = d.getMinutes() ? `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` : `${d.getHours()}h`;
  return { day: `${WEEKDAY[d.getDay()]} ${time}`, date: `dia ${d.getDate()} de ${MONTH[d.getMonth()]}` };
}

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <Row gap={5}>
      <View style={[styles.dot, on && styles.dotOn]}>{on ? <Ionicons name="checkmark" size={9} color={brand.wine} /> : null}</View>
      <T style={{ fontSize: 8.5, fontWeight: '600' }} color={colors.cardSolid}>{label}</T>
    </Row>
  );
}

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
  // metas do mês: procedimentos planejados para este mês (ou todos, se nenhum cai neste mês)
  const monthDreams = me.dreams.filter((d) => { const t = new Date(d.targetDate); return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear(); });
  const goals = monthDreams.length ? monthDreams : me.dreams;
  const goalsDone = goals.filter((d) => d.done).length;
  const goalsLeft = goals.length - goalsDone;
  const goalPct = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0;
  const [place, setPlace] = useState<string | null>(null);
  useEffect(() => { currentPlaceLabel().then(setPlace).catch(() => undefined); }, []);
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
  const nextWhen = next ? whenParts(next.startsAt) : null;
  const depositPaid = next ? next.depositAmount === 0 || ['sinal_enviado', 'confirmado', 'ajuste_pendente'].includes(next.status) : false;
  const confirmed = next?.status === 'confirmado';

  return (
    <View style={{ flex: 1, backgroundColor: colors.cardSolid }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* ---------- Topo vinho ---------- */}
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.headerTop}>
          <View style={{ width: 44 }} />
          <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel="glammi" />
          <Bell style={styles.headerBtn} color={colors.cardSolid} />
        </View>
        <T style={styles.hello} color={colors.cardSolid}>Oi, {me.name.split(' ')[0]}!</T>
        <T style={styles.question} color={colors.cardSolid}>Qual procedimento você vai agendar hoje?</T>
        <Pressable onPress={() => currentPlaceLabel().then(setPlace)} accessibilityRole="button" style={{ marginTop: space.md }}>
          <Row gap={6}>
            <Ionicons name="location-sharp" size={17} color={colors.cardSolid} />
            <T style={styles.question} color={colors.cardSolid}>{place ?? 'Perto de você'}</T>
          </Row>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* ---------- Suas próximas metas ---------- */}
        <View style={styles.box}>
          <T style={styles.boxTitle}>Suas próximas metas</T>
          <Row gap={space.lg} style={{ alignItems: 'center' }}>
            <Ring percent={goalPct} size={106} stroke={15} sub={goals.length ? `${goalsDone}/${goals.length}` : undefined} />
            <View style={{ flex: 1, gap: space.md }}>
              {goals.length === 0 ? (
                <T style={styles.boxText}>Monte seu plano: quais procedimentos você quer fazer este mês?</T>
              ) : goalsLeft === 0 ? (
                <T style={styles.boxText}>Objetivo do mês completo! Você arrasou. 💖</T>
              ) : (
                <T style={styles.boxText}>
                  Faltam <T style={[styles.boxText, { fontWeight: '700' }]}>{goalsLeft} procedimento{goalsLeft > 1 ? 's' : ''}</T> para completar o seu objetivo desse mês. Let&apos;s go, girl!
                </T>
              )}
              <Pressable onPress={() => router.push('/proximos')} style={styles.pillBtn} accessibilityRole="button">
                <T style={styles.pillText} color={colors.cardSolid} numberOfLines={1} adjustsFontSizeToFit>{goals.length ? 'Adicione mais procedimentos' : 'Planejar procedimentos'}</T>
              </Pressable>
            </View>
          </Row>
        </View>

        {/* ---------- Próximo horário ---------- */}
        <Pressable onPress={() => (next ? router.push(`/agendamento/${next.id}`) : router.push('/cliente/explorar'))} style={styles.nextBox} accessibilityRole="button">
          <T style={styles.nextTitle} color={colors.cardSolid}>Próximo horário</T>
          {next && nextWhen ? (
            <>
              <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: '40%' }}>
                  <T style={styles.nextWhen} color={colors.cardSolid}>{nextWhen.day}</T>
                  <T style={styles.nextWhen} color={colors.cardSolid}>{nextWhen.date}</T>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={styles.nextStudio} color={colors.cardSolid} numberOfLines={1}>{L.pro(next.professionalId).name}</T>
                  <T style={styles.nextService} color={colors.cardSolid} numberOfLines={1}>{L.service(next.serviceId).name}</T>
                  <Row gap={space.sm} style={{ marginTop: 6, flexWrap: 'wrap', rowGap: 4 }}>
                    <StatusDot on={depositPaid} label={next.depositAmount === 0 ? 'Sem sinal' : 'Sinal pago'} />
                    <StatusDot on={confirmed} label="Horário confirmado pela profissional" />
                  </Row>
                </View>
              </Row>
              {next.status === 'aguardando_sinal' ? (
                <T v="small" color={colors.offWhite} style={{ marginTop: space.sm }}>
                  Pague o sinal de {brl(next.depositAmount)} até {fmtDateTime(next.depositDueAt)} ou o horário será liberado.
                </T>
              ) : null}
              {next.status === 'ajuste_pendente' && next.adjustment ? (
                <T v="small" color={colors.offWhite} style={{ marginTop: space.sm }}>
                  A profissional sugeriu novo valor: {brl(next.adjustment.newPrice)}. Toque para responder.
                </T>
              ) : null}
            </>
          ) : (
            <T style={[styles.nextService, { textAlign: 'center' }]} color={colors.offWhite}>
              Nenhum horário marcado. Toque para encontrar uma profissional.
            </T>
          )}
        </Pressable>

        {/* ---------- Encontre profissionais perto de você ---------- */}
        <View style={styles.box}>
          <T style={styles.boxTitle}>Encontre profissionais perto de você</T>
          <View style={styles.grid}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.niche} onPress={() => router.push(`/cliente/explorar?niche=${c.niche}`)} style={styles.cat} accessibilityRole="button" accessibilityLabel={c.label}>
                <LinearGradient colors={gradients.brand} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.catSquare}>
                  <Ionicons name={c.icon as IconName} size={30} color={colors.cardSolid} />
                </LinearGradient>
                <T style={styles.catLabel} numberOfLines={2}>{c.label}</T>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ---------- Último procedimento + reagendar ---------- */}
        {lasts.slice(0, 2).map(({ appointment, service, nextAt }) => {
          const ago = daysBetween(new Date(appointment.startsAt), now);
          const until = daysBetween(now, nextAt);
          return (
            <View key={service.id} style={styles.box}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={styles.boxSmallTitle}>Último: {service.name}</T>
                <T v="small">{NICHE_ICON[service.niche]}</T>
              </Row>
              <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <T style={{ fontSize: 26, fontWeight: '800' }} color={colors.wine}>{fmtDate(appointment.startsAt).split(', ')[1]}</T>
                  <T v="small" muted>{ago <= 0 ? 'hoje' : ago === 1 ? 'ontem' : `há ${ago} dias`} com {L.pro(appointment.professionalId).name}</T>
                </View>
                <Badge label={until > 0 ? `manutenção em ${until}d` : `atrasado ${-until}d`} tone={until > 7 ? 'muted' : until > 0 ? 'warning' : 'danger'} />
              </Row>
              <Button title="Reagendar procedimento" icon="repeat" onPress={() => router.push(`/agendar/${service.id}?repeat=${appointment.id}`)} />
            </View>
          );
        })}

        {/* ---------- Vouchers e avaliação ---------- */}
        {myVouchers.length ? (
          <Card tone="black">
            <Row>
              <IconCircle icon="gift" bg={colors.pink} color={colors.cardSolid} />
              <View style={{ flex: 1 }}>
                <T v="h3" color={colors.cardSolid}>Você tem {myVouchers.length} voucher{myVouchers.length > 1 ? 's' : ''}</T>
                <T v="small" color={colors.offWhite}>{myVouchers.map((v) => `${v.percent}% · ${v.label}`).join('\n')}</T>
              </View>
            </Row>
          </Card>
        ) : null}
        {pendingFeedback ? (
          <Card tone="soft" onPress={() => router.push(`/feedback/${pendingFeedback.id}`)}>
            <Row>
              <IconCircle icon="star" bg={colors.card} color={colors.pink} />
              <View style={{ flex: 1 }}>
                <T v="h3">Como foi seu {L.service(pendingFeedback.serviceId).name.toLowerCase()}?</T>
                <T v="small" muted>Avalie e ganhe um bônus do mês no app</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.wine} />
            </Row>
          </Card>
        ) : null}

        {/* ---------- Fidelidade ---------- */}
        {loyaltyPros.length ? (
          <>
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
                    <T style={{ fontSize: 28, fontWeight: '800' }} color={colors.wine}>{lp.percent}%</T>
                    <ProgressBar percent={lp.percent} />
                    <T v="small" muted>Faltam {brl(lp.remaining)} para {lp.discountPercent}% OFF</T>
                  </Card>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* ---------- Trending Designs ---------- */}
        {trending.length ? (
          <>
            <SectionTitle title="Trending Designs" action="Ver todos" onAction={() => router.push('/cliente/explorar')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
              {trending.map((d) => {
                const pro = L.pro(d.professionalId);
                const fav = me.favorites.includes(pro.id);
                return (
                  <Pressable key={d.id} onPress={() => openDesign(d)} style={{ width: 140 }}>
                    <View>
                      <Thumb src={d.image} bg={colors.blush} style={{ width: 140, height: 170, borderRadius: 22 }} emojiSize={56} />
                      <Pressable onPress={() => s.toggleFavorite(pro.id)} hitSlop={8} accessibilityLabel="Favoritar" style={styles.heart}>
                        <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? colors.pink : colors.wine} />
                      </Pressable>
                    </View>
                    <T style={{ fontWeight: '700', marginTop: 8 }} numberOfLines={1}>{d.name}</T>
                    <T v="small" muted numberOfLines={1}>{pro.name.split(' ')[0]}{d.priceDelta ? ` · +${brl(d.priceDelta)}` : ''}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Pressable onPress={() => router.push('/cadastro?role=profissional')} style={{ alignItems: 'center', paddingVertical: space.lg }} accessibilityRole="link">
          <T style={{ fontSize: 15, fontWeight: '500' }}>Criar um perfil profissional</T>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: brand.wine,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl + 4,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  logo: { width: 126, height: 40 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  hello: { fontSize: 16, fontWeight: '700' },
  question: { fontSize: 14.5, fontWeight: '400', lineHeight: 20 },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.lg + 4 },
  box: { borderWidth: 1, borderColor: brand.pink, borderRadius: 24, paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.md, backgroundColor: colors.cardSolid },
  boxTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  boxSmallTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  boxText: { fontSize: 12.5, lineHeight: 16 },
  pillBtn: { alignSelf: 'flex-start', backgroundColor: brand.wine, borderColor: brand.pink, borderWidth: 2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 10.5, fontWeight: '600' },
  nextBox: { backgroundColor: brand.wine, borderColor: brand.pink, borderWidth: 2, borderRadius: 24, paddingHorizontal: space.xl, paddingVertical: space.lg, gap: space.sm },
  nextTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  nextWhen: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  nextStudio: { fontSize: 13, fontWeight: '600' },
  nextService: { fontSize: 12.5, fontWeight: '400' },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: colors.cardSolid, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: colors.cardSolid },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.lg },
  cat: { width: '24%', alignItems: 'center', gap: 8 },
  catSquare: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 10, textAlign: 'center', lineHeight: 12 },
  heart: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
});
