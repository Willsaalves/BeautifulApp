import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { adminAccounts, type AccountRow } from '@/api/admin';
import { AccountBadges } from '@/components/admin';
import { Card, Empty, Header, Row, Screen, T } from '@/components/ui';
import { fmtDate } from '@/domain/rules';
import { colors, radius, space } from '@/theme';

// Buscar contas por nome, estúdio, @ ou celular.
export default function AdminContas() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<AccountRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      adminAccounts(q).then(setList).catch((e) => setError((e as Error).message));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Screen bottomInset={40}>
      <Header title="Contas" />
      <Row style={{ backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 48 }}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nome, estúdio, @ ou celular" placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, height: 48 }} autoCapitalize="none" accessibilityLabel="Buscar contas" />
      </Row>
      {error ? <T color={colors.danger}>{error}</T> : null}
      {list === null && !error ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {list?.length === 0 ? <Empty icon="search-outline" text="Nenhuma conta encontrada." /> : null}
      {list?.map((a) => (
        <Card key={a.accountId} onPress={() => router.push(`/admin/conta/${a.accountId}`)}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h3">{a.name}</T>
              <T v="small" muted>{a.phone} · desde {a.createdAt ? fmtDate(a.createdAt) : '—'}</T>
              <AccountBadges a={a} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
