import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ACTION_LABEL, adminAccount, ago, deleteAccountByAdmin, reactivateAccount, REASON_LABEL, suspendAccount, TARGET_LABEL, type AccountDetail } from '@/api/admin';
import { AccountBadges } from '@/components/admin';
import { Avatar, Badge, Button, Card, Field, Header, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { fmtDateTime } from '@/domain/rules';
import { confirmAction } from '@/lib/confirm';
import { colors, space } from '@/theme';

// Detalhe da conta: números, denúncias abertas, histórico e ações (suspender, reativar, excluir).
export default function AdminConta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<AccountDetail | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminAccount(id).then(setD).catch((e) => setError((e as Error).message));
  }, [id]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setReason('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!d) {
    return (
      <Screen>
        <Header title="Conta" />
        {error ? <T color={colors.danger}>{error}</T> : <ActivityIndicator style={{ marginTop: 32 }} />}
      </Screen>
    );
  }
  const a = d.account!;
  const deleted = !!a.deletedAt;
  const suspended = !!a.suspendedAt;

  return (
    <Screen bottomInset={40}>
      <Header title="Conta" />
      <Card>
        <Row>
          <Avatar name={a.name ?? ''} color={colors.lilac} photo={d.photoUrl} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="title">{a.name}</T>
            <T v="small" muted>{a.phone}{d.email ? ` · ${d.email}` : ''}</T>
            <AccountBadges a={a} />
          </View>
        </Row>
        {d.bio ? <T v="small">{d.bio}</T> : null}
        <T v="small" muted>Conta criada em {a.createdAt ? fmtDateTime(a.createdAt) : '—'}{d.neighborhood ? ` · ${d.neighborhood}` : ''}</T>
        {suspended ? (
          <Card tone="cream" style={{ padding: space.md }}>
            <T v="small">⛔ Suspensa {ago(a.suspendedAt)}: {d.suspendedReason}</T>
          </Card>
        ) : null}
        {a.professionalId && !deleted ? (
          <Button small variant="outline" title="Ver página pública" icon="eye" onPress={() => router.push(`/profissional/${a.professionalId}`)} />
        ) : null}
      </Card>

      <Row>
        <Stat label="Como cliente" value={String(d.appointmentsAsClient)} sub="agendamentos" />
        {a.professional ? <Stat label="Como profissional" value={String(d.appointmentsAsProfessional)} sub={`${d.completedAsProfessional} concluídos`} /> : null}
      </Row>

      {d.openReports?.length ? (
        <>
          <SectionTitle title={`Denúncias abertas (${d.openReports.length})`} action="Revisar" onAction={() => router.push('/admin/denuncias')} />
          {d.openReports.map((g) => (
            <Card key={`${g.targetType}:${g.targetId}`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="h3">{TARGET_LABEL[g.targetType ?? ''] ?? g.targetType}</T>
                <T v="small" muted>{ago(g.firstAt)} · {g.reporters} pessoa(s)</T>
              </Row>
              {g.preview?.text ? <T v="small">“{g.preview.text}”</T> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {(g.reasons ?? []).map((r) => <Badge key={r} label={REASON_LABEL[r] ?? r} tone="danger" />)}
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {!deleted && !a.admin ? (
        <>
          <SectionTitle title="Ações" />
          <Card>
            <Field label="Motivo (obrigatório, fica no histórico)" value={reason} onChangeText={setReason} placeholder="Ex: golpe pedindo Pix fora do app" />
            {error ? <T v="small" color={colors.danger}>{error}</T> : null}
            {suspended ? (
              <Button title="Reativar conta" icon="refresh" variant="outline" disabled={busy} onPress={() => act(() => reactivateAccount(id))} />
            ) : (
              <Button title="Suspender conta" icon="ban" disabled={busy || reason.trim().length < 3} style={{ backgroundColor: colors.danger }}
                onPress={async () => {
                  if (await confirmAction('Suspender a conta?', 'A pessoa perde o acesso na hora e some da busca. Dá para reativar depois.', 'Suspender')) {
                    act(() => suspendAccount(id, reason.trim()));
                  }
                }} />
            )}
            <Button title="Excluir conta" variant="ghost" icon="trash" disabled={busy || reason.trim().length < 3}
              onPress={async () => {
                if (await confirmAction('Excluir a conta?', 'Não tem volta: perfil, fotos e stories são apagados e os agendamentos em andamento são cancelados.', 'Excluir')) {
                  act(() => deleteAccountByAdmin(id, reason.trim()));
                }
              }} />
          </Card>
        </>
      ) : null}

      {d.history?.length ? (
        <>
          <SectionTitle title="Histórico" />
          {d.history.map((h) => (
            <Card key={h.id}>
              <T v="h3">{ACTION_LABEL[h.action ?? ''] ?? h.action}</T>
              <T v="small" muted>{h.adminName} · {h.createdAt ? fmtDateTime(h.createdAt) : ''}</T>
              {h.note ? <T v="small">{h.note}</T> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
