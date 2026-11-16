import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { API_ENABLED } from '@/api/client';
import { saveWorkHours } from '@/api/scheduling';
import { Button, Card, Header, Row, Screen, T } from '@/components/ui';
import type { WorkDay } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "9" → "09:00", "930" → "09:30", "1830" → "18:30" */
function normalizeTime(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d ? `${d.padStart(2, '0')}:00` : '';
  return `${d.slice(0, d.length - 2).padStart(2, '0')}:${d.slice(-2)}`;
}

// Dias e horários de atendimento: é daqui que saem os horários livres que a cliente vê.
export default function Expediente() {
  const s = useStore();
  const me = useLookup().myPro;
  const initial: WorkDay[] =
    me.workDays ?? me.workHours.days.map((weekday) => ({ weekday, start: me.workHours.start, end: me.workHours.end }));
  const [rows, setRows] = useState(
    DAYS.map((_, weekday) => {
      const d = initial.find((x) => x.weekday === weekday);
      return { weekday, on: !!d, start: d?.start ?? '09:00', end: d?.end ?? '18:00' };
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (weekday: number, patch: Partial<(typeof rows)[number]>) =>
    setRows(rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  const invalid = rows.find((r) => r.on && (!TIME_RE.test(r.start) || !TIME_RE.test(r.end) || r.end <= r.start));

  const save = async () => {
    const days: WorkDay[] = rows.filter((r) => r.on).map(({ weekday, start, end }) => ({ weekday, start, end }));
    setBusy(true);
    setError('');
    try {
      const saved = API_ENABLED && me.remote ? await saveWorkHours(days) : days;
      s.setWorkDays(me.id, saved);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Expediente" />
      <T muted>Mantenha sempre atualizado: as clientes só conseguem agendar nesses dias e horários.</T>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {rows.map((r, i) => (
          <View key={r.weekday} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: colors.border }}>
            <Pressable onPress={() => update(r.weekday, { on: !r.on })} accessibilityLabel={`${DAYS[r.weekday]}: ${r.on ? 'atende' : 'folga'}`}
              style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: r.on ? colors.black : colors.offWhite, padding: 3, alignItems: r.on ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.cardSolid }} />
            </Pressable>
            <T style={{ flex: 1, fontWeight: '600' }}>{DAYS[r.weekday]}</T>
            {r.on ? (
              <Row gap={6}>
                {(['start', 'end'] as const).map((k) => (
                  <TextInput
                    key={k}
                    value={r[k]}
                    onChangeText={(v) => update(r.weekday, { [k]: v })}
                    onBlur={() => update(r.weekday, { [k]: normalizeTime(r[k]) })}
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel={`${DAYS[r.weekday]} ${k === 'start' ? 'início' : 'fim'}`}
                    style={{ width: 64, textAlign: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 8, color: colors.text, fontSize: 15 }}
                  />
                ))}
              </Row>
            ) : (
              <T v="small" muted>Folga</T>
            )}
          </View>
        ))}
      </Card>
      {invalid ? <T v="small" color={colors.danger}>Confira os horários de {DAYS[invalid.weekday]} (formato 09:00, fim depois do início).</T> : null}
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Salvando…' : 'Salvar expediente'} disabled={busy || !!invalid} onPress={save} />
    </Screen>
  );
}
