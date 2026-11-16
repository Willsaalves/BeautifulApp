import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { designFromApi, professionalFromPublic, publicPage, serviceFromApi, widgetFromApi } from '@/api/catalog';
import { reviewFromApi } from '@/api/business';
import { API_ENABLED } from '@/api/client';

import { StoriesRow, activeStories } from '@/components/media';
import { Card, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { WidgetView } from '@/components/widgets';
import { useLookup, useStore } from '@/store/app-store';
import { colors } from '@/theme';

// Página da profissional montada pelos widgets que ela escolheu (Perfil → Edite sua página).
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default function PerfilProfissional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const [loadError, setLoadError] = useState('');
  const latest = useRef(s);
  latest.current = s;

  // API ligada: perfil + serviços + designs + blocos vêm do servidor
  useEffect(() => {
    if (!API_ENABLED || UUID_LIKE.test(id) === false) return;
    publicPage(id)
      .then((page) => {
        const st = latest.current;
        const existing = st.professionals.find((x) => x.id === id);
        const pro = professionalFromPublic(page.professional!, existing);
        st.mergeRemote({
          professionals: [{ ...pro, widgets: (page.widgets ?? []).map(widgetFromApi) }],
          services: (page.services ?? []).map((v) => serviceFromApi(v, st.services.find((x) => x.id === v.id))),
          replaceServicesOf: id,
          designs: (page.designs ?? []).map(designFromApi),
          replaceDesignsOf: id,
        });
        latest.current.setProfessionalReviews(id, page.rating?.average ?? 0, page.rating?.count ?? 0,
          (page.reviews ?? []).map((r) => reviewFromApi(r, id)));
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [id]);

  const p = s.professionals.find((x) => x.id === id);
  if (!p) {
    return (
      <Screen bottomInset={40}>
        <Header />
        {loadError ? <T color={colors.danger}>{loadError}</T> : <ActivityIndicator style={{ marginTop: 40 }} />}
      </Screen>
    );
  }
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
