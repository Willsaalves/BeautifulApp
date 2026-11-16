import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, IconCircle, Row, Screen, T } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

// Entrada do app. Na versão com backend, isto vira login (telefone + OTP) e o perfil define o papel.
export default function Welcome() {
  const { setRole } = useStore();
  return (
    <Screen bottomInset={40} style={{ paddingTop: space.xxl }}>
      <T v="overline" muted>Beleza sem WhatsApp</T>
      <T v="display" style={{ fontSize: 44, lineHeight: 46 }}>SUA BELEZA,{'\n'}NO SEU{'\n'}TEMPO ✨</T>
      <T muted style={{ marginTop: space.sm }}>
        Encontre profissionais perto de você, agende sozinha, pague o sinal via Pix e acompanhe seus procedimentos.
      </T>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Card tone="lilac" onPress={() => { setRole('cliente'); router.replace('/cliente'); }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="title">Sou cliente</T>
              <T>Quero agendar e acompanhar meus procedimentos</T>
            </View>
            <IconCircle icon="heart" bg={colors.card} />
          </Row>
        </Card>
        <Card tone="black" onPress={() => { setRole('profissional'); router.replace('/pro'); }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="title" color={colors.card}>Sou profissional</T>
              <T color={colors.offWhite}>Agenda, sinal via Pix, estoque e fidelidade</T>
            </View>
            <IconCircle icon="briefcase" bg={colors.lilac} />
          </Row>
        </Card>
      </View>

    </Screen>
  );
}
