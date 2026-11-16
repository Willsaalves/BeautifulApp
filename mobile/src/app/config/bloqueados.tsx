import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { API_ENABLED } from '@/api/client';
import { myBlocked, unblock } from '@/api/moderation';
import { Avatar, Button, Card, Empty, Header, Row, Screen, T } from '@/components/ui';
import { fmtDate } from '@/domain/rules';
import { useStore } from '@/store/app-store';
import { colors } from '@/theme';

type Blocked = { accountId: string; professionalId?: string; name: string; photoUrl?: string; blockedAt?: string };

// Pessoas bloqueadas: dá para desfazer a qualquer momento.
export default function Bloqueados() {
  const s = useStore();
  const [list, setList] = useState<Blocked[] | null>(API_ENABLED ? null : []);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!API_ENABLED) {
      // protótipo: monta a lista a partir do estado local
      setList([
        ...s.blockedPros.map((id) => ({ accountId: id, professionalId: id, name: s.professionals.find((p) => p.id === id)?.name ?? 'Profissional' })),
        ...s.blockedAccounts.filter((id) => !s.blockedPros.includes(id))
          .map((id) => ({ accountId: id, name: s.clients.find((c) => c.id === id)?.name ?? 'Cliente' })),
      ]);
      return;
    }
    myBlocked()
      .then((l) => setList(l.map((b) => ({ accountId: b.accountId!, professionalId: b.professionalId, name: b.name ?? '', photoUrl: b.photoUrl, blockedAt: b.blockedAt }))))
      .catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = async (b: Blocked) => {
    try {
      if (API_ENABLED) await unblock(b.accountId);
      s.removeBlock({ accountId: b.accountId, professionalId: b.professionalId });
      setList((l) => (l ?? []).filter((x) => x.accountId !== b.accountId));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Pessoas bloqueadas" />
      <T muted>Quem está aqui não vê seus stories, não aparece na sua busca e não consegue agendar nem mandar mensagem.</T>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      {list === null ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {list?.length === 0 ? <Empty icon="happy-outline" text="Você não bloqueou ninguém." /> : null}
      {list?.map((b) => (
        <Card key={b.accountId}>
          <Row>
            <Avatar name={b.name} color={colors.lilac} photo={b.photoUrl} size={44} />
            <View style={{ flex: 1 }}>
              <T v="h3">{b.name}</T>
              <T v="small" muted>{b.professionalId ? 'Profissional' : 'Cliente'}{b.blockedAt ? ` · desde ${fmtDate(b.blockedAt)}` : ''}</T>
            </View>
            <Button small variant="outline" title="Desbloquear" onPress={() => undo(b)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
