import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Thumb, activeStories } from '@/components/media';
import { Avatar, Button, T } from '@/components/ui';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const DURATION = 5000;

function ago(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  return h < 1 ? 'agora' : `${h}h`;
}

// Visualizador: todos os stories que marcam uma profissional, em sequência.
export default function StoryViewer() {
  const { proId } = useLocalSearchParams<{ proId: string }>();
  const s = useStore();
  const L = useLookup();
  const list = activeStories(s.stories)
    .filter((x) => x.professionalId === proId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const next = () => { if (i < list.length - 1) { setI(i + 1); setElapsed(0); } else close(); };
  const prev = () => { setI(Math.max(0, i - 1)); setElapsed(0); };

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(t);
  }, [i]);
  useEffect(() => {
    if (elapsed >= DURATION) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const st = list[i];
  if (!st) return null;
  const pro = L.pro(proId);
  const author = st.authorType === 'profissional' ? { name: L.pro(st.authorId).name, avatar: L.pro(st.authorId).avatar } : L.client(st.authorId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <Thumb src={st.image} bg="#1A1622" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} emojiSize={140} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ paddingHorizontal: space.md, gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: space.sm }}>
            {list.map((x, j) => (
              <View key={x.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: colors.card, width: j < i ? '100%' : j === i ? `${Math.min(100, (elapsed / DURATION) * 100)}%` : '0%' }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Avatar name={author.name} color={author.avatar} size={36} />
            <View style={{ flex: 1 }}>
              <T v="h3" color={colors.card}>{author.name} <T v="small" color={colors.offWhite}>· {ago(st.createdAt)}</T></T>
              {st.authorType === 'cliente' ? <T v="small" color={colors.lilac}>com {pro.name}{st.serviceId ? ` · ${L.service(st.serviceId).name}` : ''}</T> : null}
            </View>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={28} color={colors.card} />
            </Pressable>
          </View>
        </View>

        {/* áreas de toque: esquerda volta, direita avança */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 1 }} onPress={prev} accessibilityLabel="Story anterior" />
          <Pressable style={{ flex: 2 }} onPress={next} accessibilityLabel="Próximo story" />
        </View>

        <View style={{ padding: space.lg, gap: space.md }}>
          {st.caption ? <T v="h3" color={colors.card} style={{ textShadowColor: '#000', textShadowRadius: 6 }}>{st.caption}</T> : null}
          {s.role === 'cliente' ? (
            <Button title={`Agendar com ${pro.name.split(' ')[0]}`} variant="lilac" icon="calendar"
              onPress={() => router.replace(`/profissional/${pro.id}`)} />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
