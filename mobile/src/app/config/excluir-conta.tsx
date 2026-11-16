import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { logout } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { deleteAccount } from '@/api/moderation';
import { Button, Card, Field, Header, Row, Screen, T } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const CONFIRM = 'EXCLUIR';

// Excluir conta (exigência da App Store, Play Store e LGPD). Não tem volta.
export default function ExcluirConta() {
  const s = useStore();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPro = s.role === 'profissional';
  const ok = typed.trim().toUpperCase() === CONFIRM;

  const goes = [
    'Seu perfil, foto, capa e bio',
    'Seus stories e suas favoritas',
    'Saldo de fidelidade e vouchers não usados',
    'Agendamentos futuros: são cancelados e a outra pessoa é avisada',
    ...(isPro ? ['Sua página, serviços e designs saem da busca'] : []),
  ];
  const stays = [
    'Atendimentos já feitos e avaliações aparecem como "Conta excluída", sem seu nome ou foto',
    'Comprovantes de sinal ficam guardados pelo prazo exigido por lei',
  ];

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      if (API_ENABLED) await deleteAccount();
      else await logout();
      s.setRole(null);
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Excluir conta" />
      <T muted>A exclusão é definitiva. Se quiser só dar um tempo, basta sair da conta.</T>

      <Card>
        <T v="overline" muted>O que é apagado</T>
        {goes.map((x) => (
          <Row key={x} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} style={{ marginTop: 2 }} />
            <T v="small" style={{ flex: 1 }}>{x}</T>
          </Row>
        ))}
      </Card>
      <Card>
        <T v="overline" muted>O que fica (sem dados pessoais)</T>
        {stays.map((x) => (
          <Row key={x} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="document-lock-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
            <T v="small" style={{ flex: 1 }}>{x}</T>
          </Row>
        ))}
      </Card>
      <T v="small" muted>Seu número fica livre: se voltar um dia, é só criar uma conta nova.</T>

      <View style={{ gap: space.sm }}>
        <Field label={`Para confirmar, digite ${CONFIRM}`} value={typed} onChangeText={setTyped} autoCapitalize="characters"
          autoCorrect={false} placeholder={CONFIRM} accessibilityLabel="Confirmação" />
      </View>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Excluindo…' : 'Excluir minha conta'} icon="trash" disabled={!ok || busy} onPress={remove}
        style={{ backgroundColor: ok ? colors.danger : undefined }} />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
