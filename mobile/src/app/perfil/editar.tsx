import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { patchClient, patchProfessional } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { isLocalUri, uploadImage } from '@/api/media';
import { ProfileHeader, handleOf } from '@/components/profile-header';
import { Button, Field, Header, Screen, T } from '@/components/ui';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

// Editar perfil (cliente ou profissional): capa + foto estilo Twitter, nome e bio.
export default function EditarPerfil() {
  const s = useStore();
  const L = useLookup();
  const isPro = s.role === 'profissional';
  const me = isPro ? L.myPro : L.me;
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState((isPro ? L.myPro.headline : L.me.bio) ?? '');
  const [email, setEmail] = useState(me.email ?? '');
  const [photo, setPhoto] = useState(me.photo);
  const [cover, setCover] = useState(me.cover);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveApi = async () => {
    const photoKey = photo && isLocalUri(photo) ? (await uploadImage('AVATAR', photo)).key : undefined;
    const coverKey = cover && isLocalUri(cover) ? (await uploadImage('COVER', cover)).key : undefined;
    const body = { name: name.trim(), bio, email: email.trim(), photoKey, coverKey };
    const me = isPro ? await patchProfessional(body) : await patchClient(body);
    s.applyMe(me, isPro ? 'profissional' : 'cliente');
  };

  const save = async () => {
    if (API_ENABLED) {
      setBusy(true);
      setError('');
      try {
        await saveApi();
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    s.updateMe({ name: name.trim(), bio, email: email || undefined, photo, cover });
    // capa do perfil também vira a capa da página pública da profissional
    if (isPro) {
      const capa = L.myPro.widgets.find((w) => w.type === 'capa');
      if (capa && cover) s.updateWidget(capa.id, { image: cover });
    }
    router.back();
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Editar perfil" />
      <ProfileHeader name={name} color={me.avatar} photo={photo} cover={cover} editable onChangePhoto={setPhoto} onChangeCover={setCover} />
      <View style={{ paddingHorizontal: 4 }}>
        <T v="small" muted>{handleOf(name)}</T>
      </View>
      <Field label="Nome" value={name} onChangeText={setName} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={160} placeholder="Conte um pouco sobre você" />
      <T v="small" muted style={{ textAlign: 'right', marginTop: -6 }}>{bio.length}/160</T>
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Salvando…' : 'Salvar'} disabled={name.trim().length < 2 || busy} onPress={save} style={{ marginTop: space.sm }} />
    </Screen>
  );
}
