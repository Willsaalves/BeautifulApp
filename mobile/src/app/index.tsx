import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchMe, hasSession } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { ProgressBar, Ring, Row, T } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { colors, fonts, gradients, radius, space } from '@/theme';

const NICHES = [
  { icon: '💅', label: 'Unhas', value: '128', sub: 'perto' },
  { icon: '👁️', label: 'Cílios', value: '96', sub: 'perto' },
  { icon: '✨', label: 'Sobrancelha', value: '74', sub: 'perto' },
  { icon: '💉', label: 'Estética', value: '41', sub: 'perto' },
  { icon: '💇‍♀️', label: 'Cabelo', value: '63', sub: 'perto' },
];

// Tela de entrada, no estilo da referência (cards brancos, anel de progresso, pílulas pretas).
// Com o backend, os botões levam ao login por telefone + código.
export default function Welcome() {
  const store = useStore();
  // Com a API ligada: se já existe sessão salva, entra direto.
  useEffect(() => {
    if (!API_ENABLED) return;
    (async () => {
      if (!(await hasSession())) return;
      try {
        const me = await fetchMe();
        const role = store.applyMe(me);
        if (role) router.replace(role === 'profissional' ? '/pro' : '/cliente');
        else if (me.roles?.includes('ADMIN')) router.replace('/admin');
      } catch {
        // sessão inválida: fica na tela inicial
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enter = (role: 'cliente' | 'profissional') => router.push(`/cadastro?role=${role}`);

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* topo */}
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Image source={require('../../assets/brand/glammi-wine.png')} style={{ width: 112, height: 34 }} contentFit="contain" accessibilityLabel="glammi" />
              <T v="small" style={{ fontSize: 10.5, marginTop: 2 }} color={colors.wine}>Profissionais de beleza perto de você.</T>
            </View>
            <View style={styles.roundBtn}>
              <Ionicons name="sparkles" size={18} color={colors.black} />
            </View>
          </Row>

          <T v="display" style={styles.title}>
            Sua beleza,{'\n'}no seu <T style={[styles.title, { fontFamily: fonts.serifItalic, marginTop: 0 }]}>tempo</T> ✨
          </T>
          <T style={{ color: colors.plumSoft, marginTop: -4 }}>
            Agende sozinha, pague o sinal via Pix e acompanhe cada procedimento. Sem depender do WhatsApp.
          </T>

          {/* card principal com anel de progresso */}
          <View style={styles.card}>
            <T v="overline" style={{ textAlign: 'center', fontSize: 10 }}>Seus próximos procedimentos</T>
            <Row gap={space.lg} style={{ marginTop: space.sm }}>
              <Ring percent={69} size={118} stroke={13} sub="concluído" />
              <View style={{ flex: 1, gap: 6 }}>
                <T v="small" muted>Você está</T>
                <T v="title" style={{ fontSize: 24, lineHeight: 25 }}>LINDA &{'\n'}CONFIANTE</T>
                <T v="small" muted>Faltam 2 procedimentos do seu plano.</T>
              </View>
            </Row>
          </View>

          {/* dois cards lado a lado: fidelidade + próximo horário */}
          <Row gap={space.md} style={{ alignItems: 'stretch' }}>
            <View style={[styles.card, { flex: 1 }]}>
              <T v="overline" style={{ fontSize: 9 }}>Fidelidade</T>
              <T v="display" style={{ fontSize: 32, lineHeight: 34 }}>78%</T>
              <ProgressBar percent={78} height={6} />
              <T v="small" muted style={{ fontSize: 11 }}>Faltam R$ 110 para 15% OFF</T>
            </View>
            <View style={[styles.card, { flex: 1, backgroundColor: colors.black }]}>
              <T v="overline" style={{ fontSize: 9 }} color={colors.lilac}>Próximo horário</T>
              <T v="title" color={colors.cardSolid} style={{ fontSize: 20 }}>Qui · 10:00</T>
              <T v="small" color={colors.offWhite} style={{ fontSize: 11 }}>Alongamento em gel</T>
              <View style={styles.miniPill}>
                <T v="small" style={{ fontSize: 10, fontWeight: '800' }}>✓ SINAL PAGO</T>
              </View>
            </View>
          </Row>

          {/* "insight cards" por nicho */}
          <View style={styles.card}>
            <T v="overline" style={{ textAlign: 'center', fontSize: 10 }}>Profissionais perto de você</T>
            <Row style={{ justifyContent: 'space-between', marginTop: space.xs }}>
              {NICHES.map((n) => (
                <View key={n.label} style={{ alignItems: 'center', gap: 2, flex: 1 }}>
                  <T style={{ fontSize: 22 }}>{n.icon}</T>
                  <T v="small" style={{ fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{n.label}</T>
                  <T v="small" style={{ fontSize: 11 }}>{n.value}</T>
                  <T v="small" muted style={{ fontSize: 9 }}>{n.sub}</T>
                </View>
              ))}
            </Row>
          </View>

          {/* escolha de perfil, no estilo dos tiles "morning / evening care" */}
          <Row gap={space.md} style={{ alignItems: 'stretch' }}>
            <Pressable onPress={() => enter('cliente')} style={({ pressed }) => [styles.tile, { backgroundColor: colors.cream }, pressed && styles.pressed]}>
              <Row gap={6}>
                <Ionicons name="heart-outline" size={14} color={colors.warning} />
                <T v="small" muted style={{ fontSize: 11 }}>Para você</T>
              </Row>
              <T v="h3" style={styles.tileTitle}>SOU{'\n'}CLIENTE</T>
              <Ionicons name="arrow-forward-circle" size={28} color={colors.black} />
            </Pressable>
            <Pressable onPress={() => enter('profissional')} style={({ pressed }) => [styles.tile, { backgroundColor: colors.lilacSoft }, pressed && styles.pressed]}>
              <Row gap={6}>
                <Ionicons name="briefcase-outline" size={14} color={colors.lilacDeep} />
                <T v="small" muted style={{ fontSize: 11 }}>Para profissionais</T>
              </Row>
              <T v="h3" style={styles.tileTitle}>SOU{'\n'}PROFISSIONAL</T>
              <Ionicons name="arrow-forward-circle" size={28} color={colors.black} />
            </Pressable>
          </Row>

          <Pressable onPress={() => router.push('/cadastro')} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <T v="small" color={colors.cardSolid} style={{ fontWeight: '800', letterSpacing: 1 }}>CRIAR CONTA</T>
          </Pressable>
          <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.ctaOutline, pressed && styles.pressed]}>
            <T v="small" style={{ fontWeight: '800', letterSpacing: 1 }}>JÁ TENHO CONTA · ENTRAR</T>
          </Pressable>
          <T v="small" muted style={{ textAlign: 'center', fontSize: 11 }}>
            Ao continuar você concorda com os Termos e a Política de Privacidade (LGPD).
          </T>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl, gap: space.md },
  brand: { backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serif, fontWeight: '400', fontSize: 46, lineHeight: 52, letterSpacing: -0.5, marginTop: space.md },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: space.lg, gap: space.sm },
  miniPill: { backgroundColor: colors.lilac, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tile: { flex: 1, borderRadius: radius.xl, padding: space.lg, gap: space.sm, minHeight: 140, justifyContent: 'space-between' },
  tileTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, lineHeight: 18 },
  cta: { height: 54, borderRadius: radius.pill, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
  ctaOutline: { height: 54, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
