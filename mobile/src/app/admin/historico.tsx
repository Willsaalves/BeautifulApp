import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { ACTION_LABEL, adminAudit, TARGET_LABEL, type AuditEntry } from '@/api/admin';
import { Card, Empty, Header, Row, Screen, T } from '@/components/ui';
import { fmtDateTime } from '@/domain/rules';
import { colors } from '@/theme';

// Tudo o que a administração fez (prestação de contas / LGPD).
export default function AdminHistorico() {
  const [list, setList] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    adminAudit().then(setList).catch((e) => setError((e as Error).message));
  }, []));

  return (
    <Screen bottomInset={40}>
      <Header title="Histórico de ações" />
      {error ? <T color={colors.danger}>{error}</T> : null}
      {list === null && !error ? <ActivityIndicator style={{ marginTop: 32 }} /> : null}
      {list?.length === 0 ? <Empty icon="document-text-outline" text="Nenhuma ação ainda." /> : null}
      {list?.map((h) => (
        <Card key={h.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">{ACTION_LABEL[h.action ?? ''] ?? h.action}</T>
            <T v="small" muted>{h.createdAt ? fmtDateTime(h.createdAt) : ''}</T>
          </Row>
          <T v="small" muted>{h.adminName} · {h.targetType === 'ACCOUNT' ? 'Conta' : TARGET_LABEL[h.targetType ?? ''] ?? h.targetType}</T>
          {h.note ? <T v="small">{h.note}</T> : null}
          {h.targetType === 'ACCOUNT' ? (
            <Pressable onPress={() => router.push(`/admin/conta/${h.targetId}`)}>
              <T v="small" color={colors.lilacDeep} style={{ textDecorationLine: 'underline' }}>Ver conta</T>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
