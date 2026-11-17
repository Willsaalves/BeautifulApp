import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { adminReports, ago, REASON_LABEL, resolveReport, TARGET_LABEL, type Decision, type ReportGroup } from '@/api/admin';
import { Badge, Button, Card, Empty, Header, Row, Screen, T } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { colors, radius, space } from '@/theme';

const CONTENT = ['STORY', 'REVIEW', 'MESSAGE'];
const DAY = 24 * 3600 * 1000;

function ReportCard({ g, onDone }: { g: ReportGroup; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const p = g.preview;
  const late = g.firstAt ? Date.now() - new Date(g.firstAt).getTime() > DAY : false;
  const isContent = CONTENT.includes(g.targetType ?? '');

  const decide = async (d: Decision) => {
    if (d === 'SUSPEND_AUTHOR') {
      const ok = await confirmAction('Suspender a conta?', `${p?.authorName ?? 'Essa conta'} perde o acesso na hora e some da busca. Dá para reativar depois.`, 'Suspender');
      if (!ok) return;
    }
    setBusy(true);
    setError('');
    try {
      await resolveReport(g.targetType!, g.targetId!, d, note);
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge label={TARGET_LABEL[g.targetType ?? ''] ?? g.targetType ?? ''} tone="muted" />
        <T v="small" color={late ? colors.danger : colors.textMuted} style={{ fontWeight: late ? '700' : '400' }}>
          {late ? '⚠️ ' : ''}{ago(g.firstAt)} · {g.reporters} pessoa{g.reporters === 1 ? '' : 's'}
        </T>
      </Row>

      <View style={{ flexDirection: 'row', gap: space.md, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md }}>
        {p?.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ width: 72, height: 96, borderRadius: radius.sm }} contentFit="cover" /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h3">{p?.title}</T>
          {p?.text ? <T>“{p.text}”</T> : null}
          {p?.authorName ? (
            <Pressable onPress={() => p.authorAccountId && router.push(`/admin/conta/${p.authorAccountId}`)} accessibilityRole="link">
              <T v="small" color={colors.lilacDeep} style={{ textDecorationLine: 'underline' }}>por {p.authorName}</T>
            </Pressable>
          ) : null}
          {p?.hidden && p.exists ? <T v="small" muted>Fora do ar (aguardando decisão)</T> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(g.reasons ?? []).map((r) => <Badge key={r} label={REASON_LABEL[r] ?? r} tone="danger" />)}
      </View>
      {(g.details ?? []).slice(0, 3).map((d, i) => <T key={i} v="small" muted>• {d}</T>)}

      <TextInput value={note} onChangeText={setNote} placeholder="Observação (fica no histórico)" placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: colors.text }} />
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Row style={{ flexWrap: 'wrap' }}>
        <Button small variant="outline" title="Manter" icon="checkmark" disabled={busy} onPress={() => decide('DISMISS')} />
        {isContent ? <Button small title="Remover" icon="trash" disabled={busy} onPress={() => decide('REMOVE_CONTENT')} /> : null}
        {p?.authorAccountId ? (
          <Button small title="Suspender autor" icon="ban" disabled={busy} onPress={() => decide('SUSPEND_AUTHOR')}
            style={{ backgroundColor: colors.danger }} />
        ) : null}
      </Row>
    </Card>
  );
}

// Fila de denúncias: mais antigas primeiro (prazo de 24h da App Store).
export default function AdminDenuncias() {
  const [list, setList] = useState<ReportGroup[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminReports().then(setList).catch((e) => setError((e as Error).message));
  }, []);
  useFocusEffect(load);

  return (
    <Screen bottomInset={40}>
      <Header title="Denúncias" />
      <T muted>Manter: o conteúdo volta ao ar. Remover: sai de vez. Suspender: a conta perde o acesso e some da busca.</T>
      {error ? <T color={colors.danger}>{error}</T> : null}
      {list === null && !error ? <ActivityIndicator style={{ marginTop: 32 }} /> : null}
      {list?.length === 0 ? <Empty icon="checkmark-done-outline" text="Tudo revisado. Nenhuma denúncia aberta." /> : null}
      {list?.map((g) => (
        <ReportCard key={`${g.targetType}:${g.targetId}`} g={g}
          onDone={() => setList((l) => (l ?? []).filter((x) => !(x.targetType === g.targetType && x.targetId === g.targetId)))} />
      ))}
    </Screen>
  );
}
