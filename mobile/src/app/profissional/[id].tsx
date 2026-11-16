import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';

import { StoriesRow, activeStories } from '@/components/media';
import { Card, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { WidgetView } from '@/components/widgets';
import { useLookup, useStore } from '@/store/app-store';
import { colors } from '@/theme';

// Página da profissional montada pelos widgets que ela escolheu (Perfil → Edite sua página).
export default function PerfilProfissional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const p = L.pro(id);
  const fav = L.me.favorites.includes(id);
  const isOwner = s.role === 'profissional' && s.proId === id;
  const hasStories = activeStories(s.stories).some((x) => x.professionalId === id);

  return (
    <Screen bottomInset={40}>
      <Header
        title={isOwner ? 'Prévia da sua página' : undefined}
        right={
          isOwner ? (
            <Pressable onPress={() => router.push('/pro/perfil')} hitSlop={10} accessibilityLabel="Editar página">
              <Ionicons name="create-outline" size={24} />
            </Pressable>
          ) : (
            <Pressable onPress={() => s.toggleFavorite(id)} hitSlop={10} accessibilityLabel="Favoritar">
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={26} color={fav ? colors.danger : colors.text} />
            </Pressable>
          )
        }
      />
      {hasStories ? (
        <>
          <SectionTitle title="Stories · resultados recentes" />
          <StoriesRow onlyPro={id} showAdd={false} />
        </>
      ) : null}

      {p.widgets.map((w) => <WidgetView key={w.id} w={w} pro={p} />)}

      <Card tone="cream">
        <Row>
          <Ionicons name="shield-checkmark-outline" size={18} />
          <T v="small" style={{ flex: 1 }}>
            Política: o sinal via Pix deve ser pago em até {p.depositDeadlineHours}h após o agendamento. Sem o comprovante, o horário é liberado automaticamente.
          </T>
        </Row>
      </Card>
    </Screen>
  );
}
