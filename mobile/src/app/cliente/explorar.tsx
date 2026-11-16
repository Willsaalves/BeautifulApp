import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Avatar, Card, Chip, Empty, Row, Screen, T } from '@/components/ui';
import { NICHE_ICON, NICHE_LABEL, brl } from '@/domain/rules';
import type { Niche } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const NICHES = Object.keys(NICHE_LABEL) as Niche[];

export default function Explorar() {
  const params = useLocalSearchParams<{ niche?: Niche }>();
  const s = useStore();
  const L = useLookup();
  const [niche, setNiche] = useState<Niche | null>(params.niche ?? null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [q, setQ] = useState('');

  const list = s.professionals
    .filter((p) => !niche || p.niche === niche || s.services.some((x) => x.professionalId === p.id && x.niche === niche))
    .filter((p) => !onlyFav || L.me.favorites.includes(p.id))
    .filter((p) => !q || `${p.name} ${p.headline} ${p.neighborhood}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>ENCONTRE{'\n'}PERTO DE VOCÊ</T>
      <Row style={{ backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 50 }}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ex: nail designer perto de mim"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, fontSize: 15, color: colors.text }}
        />
        <Ionicons name="location" size={18} color={colors.lilacDeep} />
        <T v="small" muted>Pinheiros</T>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="Favoritas" icon="❤️" selected={onlyFav} onPress={() => setOnlyFav(!onlyFav)} />
        {NICHES.map((n) => (
          <Chip key={n} label={NICHE_LABEL[n]} icon={NICHE_ICON[n]} selected={niche === n} onPress={() => setNiche(niche === n ? null : n)} />
        ))}
      </ScrollView>

      <T v="small" muted>{list.length} profissiona{list.length === 1 ? 'l' : 'is'} encontrada{list.length === 1 ? '' : 's'}</T>

      {list.length === 0 ? <Empty icon="search" text="Nenhuma profissional com esse filtro ainda." /> : null}
      {list.map((p) => {
        const fav = L.me.favorites.includes(p.id);
        const from = Math.min(...s.services.filter((x) => x.professionalId === p.id).map((x) => x.price));
        return (
          <Card key={p.id} onPress={() => router.push(`/profissional/${p.id}`)}>
            <Row gap={space.md}>
              <Avatar name={p.name} color={p.avatar} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3">{p.name}</T>
                <T v="small" muted numberOfLines={1}>{p.headline}</T>
                <Row gap={10}>
                  <T v="small">⭐ {p.rating.toFixed(1)} ({p.reviews})</T>
                  <T v="small" muted>{p.distanceKm.toFixed(1)} km · {p.neighborhood}</T>
                </Row>
              </View>
              <Pressable hitSlop={10} onPress={() => s.toggleFavorite(p.id)} accessibilityLabel="Favoritar">
                <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={fav ? colors.danger : colors.text} />
              </Pressable>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                {p.portfolio.slice(0, 4).map((e, i) => (
                  <View key={i} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <T style={{ fontSize: 18 }}>{e}</T>
                  </View>
                ))}
              </Row>
              {Number.isFinite(from) ? <T v="small" style={{ fontWeight: '700' }}>a partir de {brl(from)}</T> : null}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
