import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchMe, hasSession } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { T } from '@/components/ui';
import { useLayout } from '@/lib/responsive';
import { useStore } from '@/store/app-store';
import { brand, colors, gradients, radius, space } from '@/theme';

const LOGO = require('../../assets/brand/glammi-white.png');

// Entrada: só a marca e o que fazer (criar conta ou entrar), no degradê rosa da abertura da marca.
export default function Welcome() {
  const store = useStore();
  const { s: sz, short } = useLayout();
  // fundo rosa: ícones da barra de status em branco só enquanto esta tela está na frente
  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));
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

  return (
    <LinearGradient colors={gradients.splash} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Image source={LOGO} style={{ width: sz(230), height: sz(72) }} contentFit="contain" accessibilityLabel="glammi" />
          <T style={styles.tagline} color={colors.cardSolid}>Profissionais de beleza perto de você.</T>
        </View>

        <View style={[styles.actions, short && { paddingBottom: space.md }]}>
          <Pressable onPress={() => router.push('/cadastro?role=cliente')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
            <T style={styles.primaryText} color={brand.wine}>Criar conta</T>
          </Pressable>
          <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
            <T style={styles.secondaryText} color={colors.cardSolid}>Já tenho conta · Entrar</T>
          </Pressable>
          <Pressable onPress={() => router.push('/cadastro?role=profissional')} hitSlop={8} accessibilityRole="link">
            <T style={styles.link} color={colors.cardSolid}>É profissional? <T style={[styles.link, { fontWeight: '800', textDecorationLine: 'underline' }]} color={colors.cardSolid}>Cadastre seu estúdio</T></T>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  logo: { width: 230, height: 72 },
  tagline: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  actions: { gap: space.md, paddingBottom: space.xl, alignItems: 'stretch' },
  primary: { height: 54, borderRadius: radius.pill, backgroundColor: colors.cardSolid, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondary: { height: 54, borderRadius: radius.pill, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  link: { fontSize: 13.5, textAlign: 'center', marginTop: space.sm },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
