import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import { saveConsent } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { Card, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { LEGAL_DOCS, LEGAL_VARS, LEGAL_VERSION } from '@/legal/docs';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';


function Link({ icon, title, sub, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Card onPress={onPress}>
      <Row>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} />
        <View style={{ flex: 1 }}>
          <T v="h3" color={danger ? colors.danger : undefined}>{title}</T>
          {sub ? <T v="small" muted>{sub}</T> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Row>
    </Card>
  );
}

// Privacidade e dados (LGPD): consentimento de imagem, textos legais e direitos da titular.
export default function Privacidade() {
  const s = useStore();
  const [image, setImage] = useState(s.legal?.imageConsent ?? false);
  const [error, setError] = useState('');
  const email = LEGAL_VARS.email_privacidade ?? '';

  const toggleImage = async (v: boolean) => {
    setImage(v);
    setError('');
    if (!API_ENABLED) return;
    try {
      const me = await saveConsent('IMAGE_USE', v);
      s.setLegal({ version: me.legal?.version ?? '', accepted: !!me.legal?.accepted, imageConsent: !!me.legal?.imageConsent });
    } catch (e) {
      setImage(!v);
      setError((e as Error).message);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Privacidade e dados" />

      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <T v="h3">Uso das minhas fotos</T>
            <T v="small" muted>Permite publicar fotos dos seus procedimentos em stories e na galeria. Desligar não apaga o que já foi publicado: apague pelo próprio story ou peça para a profissional.</T>
          </View>
          <Switch value={image} onValueChange={toggleImage} accessibilityLabel="Uso das minhas fotos"
            trackColor={{ true: colors.lilacDeep, false: colors.bg }} />
        </Row>
      </Card>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}

      <SectionTitle title="Textos" />
      <Link icon="reader-outline" title={LEGAL_DOCS.termos.title} sub={`Versão ${LEGAL_VERSION}`} onPress={() => router.push('/legal/termos')} />
      <Link icon="shield-checkmark-outline" title={LEGAL_DOCS.privacidade.title} sub={`Versão ${LEGAL_VERSION}`} onPress={() => router.push('/legal/privacidade')} />

      <SectionTitle title="Seus direitos (LGPD)" />
      {email ? (
        <Link icon="mail-outline" title="Pedir uma cópia dos meus dados" sub={`Por e-mail: ${email} · resposta em até 15 dias`}
          onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Pedido de dados (LGPD)')}`)} />
      ) : null}
      <Link icon="create-outline" title="Corrigir meus dados" sub="Nome, foto, bio e e-mail" onPress={() => router.push('/perfil/editar')} />
      <Link icon="hand-left-outline" title="Pessoas bloqueadas" onPress={() => router.push('/config/bloqueados')} />
      <Link icon="trash-outline" title="Excluir conta" danger onPress={() => router.push('/config/excluir-conta')} />
      <T v="small" muted style={{ textAlign: 'center', marginTop: space.sm }}>Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados).</T>
    </Screen>
  );
}
