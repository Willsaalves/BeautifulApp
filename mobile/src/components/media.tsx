import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { STORY_TTL_MS, isUri } from '@/domain/rules';
import type { Story } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

import { T } from './ui';

/** Mostra a foto (URI) ou, nos dados de exemplo, um emoji sobre fundo lilás. */
export function Thumb({
  src,
  style,
  emojiSize = 28,
  bg = colors.lilacSoft,
}: {
  src?: string;
  style?: StyleProp<ViewStyle>;
  emojiSize?: number;
  bg?: string;
}) {
  return (
    <View style={[{ backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      {isUri(src) ? (
        <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{src || '✨'}</Text>
      )}
    </View>
  );
}

export function activeStories(stories: Story[], now = Date.now()) {
  return stories.filter((s) => now - new Date(s.createdAt).getTime() < STORY_TTL_MS);
}

/** Linha de stories agrupados por profissional marcada (estilo Instagram). */
export function StoriesRow({ onlyPro, showAdd = true }: { onlyPro?: string; showAdd?: boolean }) {
  const s = useStore();
  const L = useLookup();
  const list = activeStories(s.stories).filter((x) => !onlyPro || x.professionalId === onlyPro);
  const groups = Array.from(new Set(list.map((x) => x.professionalId)));
  // favoritas primeiro
  const favs = s.role === 'cliente' ? L.me.favorites : [];
  groups.sort((a, b) => Number(favs.includes(b)) - Number(favs.includes(a)));

  if (!groups.length && !showAdd) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingVertical: 2 }}>
      {showAdd ? (
        <Pressable onPress={() => router.push(onlyPro ? `/story/novo?proId=${onlyPro}` : '/story/novo')} style={{ alignItems: 'center', gap: 4, width: 68 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.lilacDeep, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
            <Ionicons name="add" size={26} color={colors.lilacDeep} />
          </View>
          <T v="small" style={{ fontSize: 10 }} numberOfLines={1}>Seu story</T>
        </Pressable>
      ) : null}
      {groups.map((proId) => {
        const p = L.pro(proId);
        const first = list.find((x) => x.professionalId === proId)!;
        return (
          <Pressable key={proId} onPress={() => router.push(`/story/${proId}`)} style={{ alignItems: 'center', gap: 4, width: 68 }}>
            <View style={{ width: 66, height: 66, borderRadius: 33, padding: 3, backgroundColor: colors.lilacDeep }}>
              <View style={{ flex: 1, borderRadius: 30, padding: 2, backgroundColor: colors.card }}>
                <Thumb src={first.image} style={{ flex: 1, borderRadius: 28 }} emojiSize={24} />
              </View>
            </View>
            <T v="small" style={{ fontSize: 10 }} numberOfLines={1}>{p.name.replace(/^Dra?\.\s*/, '').split(' ')[0]}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
