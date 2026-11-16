import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { logout, saveConsent } from '@/api/auth';
import { Button, Card, Row, Screen, T } from '@/components/ui';
import { LEGAL_DOCS } from '@/legal/docs';
import { useStore } from '@/store/app-store';
import { colors, fonts, space } from '@/theme';

// Termos ou Política mudaram: aceite obrigatório para continuar (sem voltar por gesto).
export default function AceiteTermos() {
  const s = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const me = await saveConsent('TERMS', true);
      s.setLegal({ version: me.legal?.version ?? '', accepted: true, imageConsent: !!me.legal?.imageConsent });
      if (router.canGoBack()) router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xl }}>
        <Ionicons name="document-text-outline" size={48} color={colors.lilacDeep} />
        <T style={{ fontFamily: fonts.serifSemi, fontSize: 30, textAlign: 'center' }}>Atualizamos nossos termos</T>
        <T muted style={{ textAlign: 'center' }}>
          Para continuar usando o app, leia e aceite a versão {s.legal?.version} dos Termos de Uso e da Política de Privacidade.
        </T>
      </View>
      {(['termos', 'privacidade'] as const).map((slug) => (
        <Card key={slug} onPress={() => router.push(`/legal/${slug}`)}>
          <Row>
            <Ionicons name={slug === 'termos' ? 'reader-outline' : 'shield-checkmark-outline'} size={22} />
            <T v="h3" style={{ flex: 1 }}>{LEGAL_DOCS[slug].title}</T>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Row>
        </Card>
      ))}
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Salvando…' : 'Li e aceito'} icon="checkmark" disabled={busy} onPress={accept} />
      <Button title="Agora não (sair)" variant="ghost" onPress={async () => { await logout(); s.setRole(null); s.setLegal(null); router.replace('/'); }} />
      <T v="small" muted style={{ textAlign: 'center' }}>
        Se não concordar, você pode excluir sua conta em Perfil → Excluir conta.
      </T>
    </Screen>
  );
}
