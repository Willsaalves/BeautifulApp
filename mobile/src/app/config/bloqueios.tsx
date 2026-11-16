import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { API_ENABLED } from '@/api/client';
import { addBlock, removeBlock } from '@/api/scheduling';
import { Button, Card, Chip, Empty, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { fmtDate, fmtDateTime, fmtTime } from '@/domain/rules';
import type { TimeBlock } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const REASONS = ['Almoço', 'Folga', 'Compromisso', 'Férias', 'Curso'];
const SPANS = [1, 3, 7, 15];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function at(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

// Bloquear período na agenda: as clientes deixam de ver esses horários como livres.
export default function Bloqueios() {
  const s = useStore();
  const L = useLookup();
  const remote = API_ENABLED && !!L.myPro.remote;
  const days = useMemo(() => {
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    return Array.from({ length: 45 }, (_, i) => {
      const d = new Date(d0);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);
  const [dayIdx, setDayIdx] = useState(0);
  const [allDay, setAllDay] = useState(false);
  const [span, setSpan] = useState(1);
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [reason, setReason] = useState('Almoço');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const day = days[dayIdx];
  const from = allDay ? at(day, '00:00') : at(day, start);
  const to = allDay ? (() => { const d = at(day, '00:00'); d.setDate(d.getDate() + span); return d; })() : at(day, end);
  const invalid = !allDay && (!TIME_RE.test(start) || !TIME_RE.test(end) || end <= start);
  const duplicate = s.blocks.some((b) => new Date(b.startsAt).getTime() <= from.getTime() && new Date(b.endsAt).getTime() >= to.getTime());
  const upcoming = s.blocks.filter((b) => new Date(b.endsAt) > new Date());

  // agendamentos ativos que caem no período (bloquear não cancela, só avisa)
  const clashes = s.appointments.filter(
    (a) =>
      a.professionalId === s.proId &&
      ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'].includes(a.status) &&
      new Date(a.startsAt) < to &&
      new Date(a.endsAt ?? new Date(a.startsAt).getTime() + 3600_000) > from,
  );

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const block: TimeBlock = remote
        ? await addBlock(from, to, reason || undefined)
        : { id: s.newId('b'), startsAt: from.toISOString(), endsAt: to.toISOString(), reason };
      s.setBlocks([...s.blocks, block]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      if (remote) await removeBlock(id);
      s.setBlocks(s.blocks.filter((b) => b.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Bloquear horário" />
      <T muted>Almoço, folga, curso ou férias: as clientes não conseguem agendar nesse período.</T>

      <SectionTitle title="Dia" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {days.map((d, i) => {
          const sel = i === dayIdx;
          return (
            <Pressable key={d.toISOString()} onPress={() => setDayIdx(i)} accessibilityLabel={`${WEEK[d.getDay()]} ${d.getDate()}`}
              style={{ width: 56, height: 72, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? colors.black : colors.card }}>
              <T v="small" color={sel ? colors.offWhite : colors.textMuted}>{WEEK[d.getDay()]}</T>
              <T style={{ fontSize: 18, fontWeight: '700' }} color={sel ? colors.cardSolid : colors.text}>{d.getDate()}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card>
        <Row>
          <Chip label="Só um período" selected={!allDay} onPress={() => setAllDay(false)} />
          <Chip label="Dia inteiro" selected={allDay} onPress={() => setAllDay(true)} />
        </Row>
        {allDay ? (
          <>
            <T v="overline" muted>Quantos dias</T>
            <Row>
              {SPANS.map((n) => <Chip key={n} label={n === 1 ? '1 dia' : `${n} dias`} selected={span === n} onPress={() => setSpan(n)} />)}
            </Row>
          </>
        ) : (
          <Row>
            {([['De', start, setStart], ['Até', end, setEnd]] as const).map(([label, value, set]) => (
              <View key={label} style={{ flex: 1, gap: 4 }}>
                <T v="overline" muted>{label}</T>
                <TextInput value={value} onChangeText={set} keyboardType="numbers-and-punctuation" accessibilityLabel={label}
                  style={{ backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, textAlign: 'center', fontSize: 16, color: colors.text }} />
              </View>
            ))}
          </Row>
        )}
        <T v="overline" muted>Motivo</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}
        </View>
        <T v="small" muted>
          {allDay ? `${fmtDate(from)}${span > 1 ? ` até ${fmtDate(new Date(to.getTime() - 1))}` : ''} · dia inteiro` : `${fmtDate(from)} · ${start}–${end}`}
        </T>
        {clashes.length ? (
          <Card tone="cream" style={{ padding: space.md }}>
            <T v="small">⚠️ Já existe{clashes.length > 1 ? 'm' : ''} {clashes.length} agendamento{clashes.length > 1 ? 's' : ''} nesse período. O bloqueio não cancela: fale com a cliente ou cancele pelo agendamento.</T>
          </Card>
        ) : null}
      </Card>
      {invalid ? <T v="small" color={colors.danger}>Use o formato 12:00 e o fim depois do início.</T> : null}
      {duplicate && !invalid ? <T v="small" muted>Esse período já está bloqueado.</T> : null}
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Bloqueando…' : 'Bloquear'} icon="lock-closed" disabled={busy || invalid || duplicate} onPress={save} />

      <SectionTitle title={`Próximos bloqueios (${upcoming.length})`} />
      {upcoming.length === 0 ? <Empty icon="lock-open-outline" text="Nenhum bloqueio. Sua agenda segue o expediente." /> : null}
      {upcoming.map((b) => {
        const s0 = new Date(b.startsAt);
        const e0 = new Date(b.endsAt);
        const whole = s0.getHours() === 0 && s0.getMinutes() === 0 && e0.getHours() === 0 && e0.getMinutes() === 0;
        return (
          <Card key={b.id}>
            <Row>
              <Ionicons name="lock-closed" size={18} color={colors.lilacDeep} />
              <View style={{ flex: 1 }}>
                <T v="h3">{b.reason || 'Bloqueado'}</T>
                <T v="small" muted>
                  {whole
                    ? `${fmtDate(s0)}${e0.getTime() - s0.getTime() > 86400_000 ? ` até ${fmtDate(new Date(e0.getTime() - 1))}` : ''} · dia inteiro`
                    : `${fmtDateTime(s0)}–${fmtTime(e0)}`}
                </T>
              </View>
              <Pressable onPress={() => remove(b.id)} hitSlop={8} accessibilityLabel="Remover bloqueio">
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
