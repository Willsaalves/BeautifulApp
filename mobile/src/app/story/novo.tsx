import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Thumb } from '@/components/media';
import { pickImage } from '@/lib/pick-image';
import { Avatar, Button, Chip, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

// Postar no story a foto do procedimento que acabou de fazer.
export default function NovoStory() {
  const params = useLocalSearchParams<{ proId?: string; appointmentId?: string }>();
  const s = useStore();
  const L = useLookup();
  const isPro = s.role === 'profissional';
  const appt = params.appointmentId ? L.appointment(params.appointmentId) : undefined;

  // cliente marca profissionais com quem já fez atendimento (ou favoritas); profissional marca a si mesma
  const options = isPro
    ? [s.proId]
    : Array.from(new Set([
        ...s.appointments.filter((a) => a.clientId === s.clientId && a.status === 'concluido').map((a) => a.professionalId),
        ...L.me.favorites,
      ]));
  const [proId, setProId] = useState(appt?.professionalId ?? params.proId ?? options[0]);
  const [image, setImage] = useState<string | undefined>();
  const [caption, setCaption] = useState('');

  const post = () => {
    if (!image || !proId) return;
    s.postStory({ professionalId: proId, serviceId: appt?.serviceId, image, caption });
    router.replace(`/story/${proId}`);
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Novo story" />
      <Pressable onPress={async () => { const uri = await pickImage(); if (uri) setImage(uri); }}
        style={{ height: 420, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.black }}>
        {image ? <Thumb src={image} style={{ flex: 1 }} /> : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
            <Ionicons name="camera-outline" size={40} color={colors.lilac} />
            <T color={colors.card} v="h3">Escolher foto</T>
            <T v="small" color={colors.offWhite}>Mostre o resultado do seu procedimento ✨</T>
          </View>
        )}
      </Pressable>
      <Field label="Legenda" placeholder="Ex: amei o resultado! 💜" value={caption} onChangeText={setCaption} />
      {!isPro && options.length ? (
        <>
          <SectionTitle title="Marcar profissional" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {options.map((id) => {
              const p = L.pro(id);
              const sel = proId === id;
              return (
                <Pressable key={id} onPress={() => setProId(id)}>
                  <Row gap={6} style={{ backgroundColor: sel ? colors.black : colors.card, borderRadius: 999, paddingRight: 12 }}>
                    <Avatar name={p.name} color={p.avatar} photo={p.photo} size={32} />
                    <T v="small" color={sel ? colors.card : colors.text} style={{ fontWeight: '700' }}>{p.name}</T>
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      {appt ? <Chip icon="💅" label={L.service(appt.serviceId).name} selected /> : null}
      <T v="small" muted>O story fica visível por 24h na sua página inicial e na página da profissional marcada.</T>
      <Button title="Publicar story" icon="paper-plane" disabled={!image || !proId} onPress={post} />
    </Screen>
  );
}
