import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, View } from 'react-native';

import { fmtTime, type SlotStatus } from '@/domain/rules';
import { colors, fonts, gradients, radius, space } from '@/theme';

import { Row, T } from './ui';

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Faixa de dias: pílulas altas, a escolhida em ameixa. */
export function DayStrip({ days, index, onChange }: { days: Date[]; index: number; onChange: (i: number) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <T style={{ fontSize: 36, fontFamily: fonts.serif }}>{MONTHS[days[index].getMonth()]}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 4 }}>
        {days.map((d, i) => {
          const sel = i === index;
          return (
            <Pressable key={d.toISOString()} onPress={() => onChange(i)} accessibilityLabel={`${WEEK[d.getDay()]} ${d.getDate()}`}
              style={{ width: 60, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: sel ? colors.black : colors.card }}>
              <T style={{ fontSize: 14 }} color={sel ? colors.offWhite : colors.textMuted}>{WEEK[d.getDay()]}</T>
              <T style={{ fontSize: 20, fontWeight: '600' }} color={sel ? colors.cardSolid : colors.text}>{d.getDate()}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Legend() {
  const dot = (bg: React.ReactNode, label: string) => (
    <Row gap={6}>
      {bg}
      <T v="small" muted>{label}</T>
    </Row>
  );
  return (
    <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
      {dot(<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.cardSolid }} />, 'Livre')}
      {dot(<LinearGradient colors={gradients.chosen} style={{ width: 14, height: 14, borderRadius: 7 }} />, 'Escolhido')}
      {dot(<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.offWhite }} />, 'Ocupado')}
      {dot(<View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.border }} />, 'Passou')}
    </Row>
  );
}

/** Horários agrupados em Manhã / Tarde / Noite, com livre, escolhido, ocupado e passado. */
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: { time: Date; status: SlotStatus }[];
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const groups = [
    { label: 'Manhã', items: slots.filter((s) => s.time.getHours() < 12) },
    { label: 'Tarde', items: slots.filter((s) => s.time.getHours() >= 12 && s.time.getHours() < 17) },
    { label: 'Noite', items: slots.filter((s) => s.time.getHours() >= 17) },
  ].filter((g) => g.items.length);

  if (!slots.length) return <T muted>A profissional não atende neste dia.</T>;
  return (
    <View style={{ gap: space.md }}>
      <Legend />
      {groups.map((g) => (
        <View key={g.label} style={{ gap: space.sm }}>
          <T muted style={{ fontSize: 15 }}>{g.label}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {g.items.map(({ time, status }) => {
              const chosen = selected?.getTime() === time.getTime();
              const disabled = status !== 'livre';
              const label = (
                <T style={{ fontSize: 15, textDecorationLine: status === 'ocupado' ? 'line-through' : 'none' }}
                  color={status === 'livre' || chosen ? colors.text : colors.textMuted}>
                  {fmtTime(time)}
                </T>
              );
              const base = { width: 78, height: 44, borderRadius: radius.pill, alignItems: 'center' as const, justifyContent: 'center' as const };
              return (
                <Pressable key={time.toISOString()} disabled={disabled} onPress={() => onSelect(time)}
                  accessibilityLabel={`${fmtTime(time)} ${status}`} accessibilityState={{ disabled, selected: chosen }}>
                  {chosen ? (
                    <LinearGradient colors={gradients.chosen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[base, { borderWidth: 1, borderColor: colors.blush }]}>{label}</LinearGradient>
                  ) : (
                    <View style={[base, {
                      backgroundColor: status === 'livre' ? colors.cardSolid : status === 'ocupado' ? colors.offWhite : 'transparent',
                      borderWidth: status === 'passado' ? 1 : 0,
                      borderColor: colors.border,
                      opacity: status === 'passado' ? 0.6 : 1,
                    }]}>{label}</View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
