import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, Chip, Field, Header, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { NICHE_ICON, NICHE_LABEL, daysBetween, dreamsProgress, fmtDate } from '@/domain/rules';
import type { Niche } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const HORIZONS = [
  { label: '1 mês', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
];

export default function Sonhos() {
  const s = useStore();
  const L = useLookup();
  const dreams = L.me.dreams;
  const [niche, setNiche] = useState<Niche>('unha');
  const [label, setLabel] = useState('');
  const [horizon, setHorizon] = useState(90);

  const add = () => {
    const d = new Date();
    d.setDate(d.getDate() + horizon);
    s.setDreams([...dreams, { id: s.newId('d'), niche, label: label || NICHE_LABEL[niche], targetDate: d.toISOString(), done: false }]);
    setLabel('');
  };
  const toggle = (id: string) => s.setDreams(dreams.map((d) => (d.id === id ? { ...d, done: !d.done } : d)));
  const remove = (id: string) => s.setDreams(dreams.filter((d) => d.id !== id));
  const pct = dreamsProgress(dreams);

  return (
    <Screen bottomInset={40}>
      <Header title="Procedimentos dos sonhos" />
      <T v="display">MEU SONHO{'\n'}IDEAL ✨</T>
      <Card tone="lilac">
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="overline">Progresso</T>
          <T v="title">{pct}%</T>
        </Row>
        <ProgressBar percent={pct} color={colors.black} track={colors.card} height={10} />
      </Card>

      {dreams.map((d) => {
        const left = daysBetween(new Date(), new Date(d.targetDate));
        // carteira: favoritas que atendem esse nicho
        const wallet = s.professionals.filter(
          (p) => L.me.favorites.includes(p.id) && s.services.some((x) => x.professionalId === p.id && x.niche === d.niche),
        );
        return (
          <Card key={d.id}>
            <Row>
              <Pressable onPress={() => toggle(d.id)} hitSlop={8} accessibilityLabel="Marcar como feito">
                <Ionicons name={d.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={d.done ? colors.lilacDeep : colors.text} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <T v="h3" style={{ textDecorationLine: d.done ? 'line-through' : 'none' }}>{NICHE_ICON[d.niche]} {d.label}</T>
                <T v="small" muted>até {fmtDate(d.targetDate)} · {left > 0 ? `faltam ${left} dias` : 'prazo passou'}</T>
              </View>
              <Pressable onPress={() => remove(d.id)} hitSlop={8} accessibilityLabel="Remover">
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Row>
            {!d.done ? (
              wallet.length ? (
                <Row style={{ flexWrap: 'wrap' }}>
                  {wallet.map((p) => (
                    <Pressable key={p.id} onPress={() => router.push(`/profissional/${p.id}`)}>
                      <Row gap={6} style={{ backgroundColor: colors.lilacSoft, borderRadius: 999, paddingRight: 12 }}>
                        <Avatar name={p.name} color={p.avatar} size={30} />
                        <T v="small" style={{ fontWeight: '700' }}>{p.name}</T>
                      </Row>
                    </Pressable>
                  ))}
                </Row>
              ) : (
                <Button small variant="outline" title="Encontrar profissional" onPress={() => router.push(`/cliente/explorar?niche=${d.niche}`)} style={{ alignSelf: 'flex-start' }} />
              )
            ) : null}
          </Card>
        );
      })}

      <SectionTitle title="Adicionar sonho" />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(Object.keys(NICHE_LABEL) as Niche[]).map((n) => (
            <Chip key={n} icon={NICHE_ICON[n]} label={NICHE_LABEL[n]} selected={niche === n} onPress={() => setNiche(n)} />
          ))}
        </View>
        <Field label="Qual procedimento?" placeholder="Ex: criolipólise, cílios volume russo" value={label} onChangeText={setLabel} />
        <T v="overline" muted>Até quando?</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {HORIZONS.map((h) => <Chip key={h.days} label={h.label} selected={horizon === h.days} onPress={() => setHorizon(h.days)} />)}
        </Row>
        <Button title="Adicionar" icon="add" onPress={add} />
      </Card>
    </Screen>
  );
}
