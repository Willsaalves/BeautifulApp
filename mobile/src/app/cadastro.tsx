import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { fetchMe, onboarding, requestOtp, verifyOtp } from '@/api/auth';
import { API_ENABLED, ApiError } from '@/api/client';
import { isLocalUri, uploadImage } from '@/api/media';
import { OtpInput, PhoneField, phoneValid } from '@/components/auth';
import { ProfileHeader, handleOf } from '@/components/profile-header';
import { Button, Card, Chip, Field, IconCircle, ProgressBar, Row, Screen, T } from '@/components/ui';
import { NICHE_ICON, NICHE_LABEL } from '@/domain/rules';
import type { Niche } from '@/domain/types';
import { useStore, type Role } from '@/store/app-store';
import { colors, space } from '@/theme';

type Step = 'perfil' | 'dados' | 'foto' | 'codigo';

export default function Cadastro() {
  const params = useLocalSearchParams<{ role?: Role; phone?: string; verified?: string }>();
  const s = useStore();
  const verified = params.verified === '1';
  const steps: Step[] = [...(params.role ? [] : ['perfil' as const]), 'dados', 'foto', ...(verified ? [] : ['codigo' as const])];
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  const [role, setRole] = useState<Role>(params.role ?? 'cliente');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(params.phone ?? '');
  const [email, setEmail] = useState('');
  const [studio, setStudio] = useState('');
  const [niche, setNiche] = useState<Niche>('unha');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [pixKey, setPixKey] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [cover, setCover] = useState<string>();
  const [bio, setBio] = useState('');
  const [terms, setTerms] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);
  const [code, setCode] = useState('');

  const isPro = role === 'profissional';
  const dadosOk = name.trim().length > 1 && phoneValid(phone) && (!isPro || (studio.trim().length > 1 && neighborhood.trim().length > 1));
  const last = idx === steps.length - 1;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const goHome = (r: Role | null) => router.replace(r === 'profissional' ? '/pro/perfil' : '/cliente');

  const finishWithApi = async () => {
    if (!verified) await verifyOtp(phone, code);
    const photoKey = photo && isLocalUri(photo) ? (await uploadImage('AVATAR', photo)).key : undefined;
    const coverKey = cover && isLocalUri(cover) ? (await uploadImage('COVER', cover)).key : undefined;
    try {
      const me = await onboarding({
        role: isPro ? 'PROFESSIONAL' : 'CLIENT',
        name: name.trim(),
        email: email.trim() || undefined,
        bio: bio.trim() || undefined,
        photoKey,
        coverKey,
        studio: isPro ? studio.trim() : undefined,
        niche: isPro ? (niche.toUpperCase() as 'UNHA') : undefined,
        neighborhood: isPro ? neighborhood.trim() : undefined,
        city: isPro ? city.trim() : undefined,
        pixKey: isPro ? pixKey.trim() || undefined : undefined,
        acceptedTerms: terms,
        imageConsent,
      });
      goHome(s.applyMe(me, role));
    } catch (e) {
      // já tinha esse perfil (ex: cadastro repetido): só entra
      if (e instanceof ApiError && e.code === 'PROFILE_EXISTS') return goHome(s.applyMe(await fetchMe(), role));
      throw e;
    }
  };

  const finish = async () => {
    if (!API_ENABLED) {
      s.register({ role, name: name.trim(), phone, email: email || undefined, photo, cover, bio, niche, studio, neighborhood, city, pixKey });
      return goHome(role);
    }
    setBusy(true);
    setError('');
    try {
      await finishWithApi();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (last) return finish();
    if (API_ENABLED && steps[idx + 1] === 'codigo') {
      setBusy(true);
      setError('');
      try {
        await requestOtp(phone);
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setIdx(idx + 1);
  };
  const back = () => (idx === 0 ? (router.canGoBack() ? router.back() : router.replace('/')) : setIdx(idx - 1));

  const canNext =
    step === 'perfil' ? true
    : step === 'dados' ? dadosOk
    : step === 'foto' ? terms
    : code.length === 6;

  return (
    <Screen bottomInset={40}>
      <Row style={{ paddingVertical: space.sm }}>
        <Pressable onPress={back} accessibilityLabel="Voltar" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={colors.cardSolid} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar percent={((idx + 1) / steps.length) * 100} height={6} />
        </View>
        <T v="small" muted>{idx + 1}/{steps.length}</T>
      </Row>

      {step === 'perfil' ? (
        <>
          <T v="display" style={{ marginTop: space.md }}>CRIE SUA{'\n'}CONTA ✨</T>
          <T muted>Como você vai usar o app?</T>
          {([
            { r: 'cliente' as Role, title: 'Sou cliente', sub: 'Quero encontrar profissionais, agendar e acompanhar meus procedimentos', icon: 'heart' as const, tone: 'lilac' as const },
            { r: 'profissional' as Role, title: 'Sou profissional', sub: 'Quero receber agendamentos, sinal via Pix e controlar estoque e lucro', icon: 'briefcase' as const, tone: 'black' as const },
          ]).map((o) => {
            const sel = role === o.r;
            return (
              <Card key={o.r} tone={o.tone} onPress={() => setRole(o.r)} style={{ borderWidth: 3, borderColor: sel ? (o.tone === 'black' ? colors.lilac : colors.black) : 'transparent' }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <T v="title" color={o.tone === 'black' ? colors.cardSolid : colors.text}>{o.title}</T>
                    <T color={o.tone === 'black' ? colors.offWhite : colors.text}>{o.sub}</T>
                  </View>
                  <IconCircle icon={sel ? 'checkmark' : o.icon} bg={o.tone === 'black' ? colors.lilac : colors.card} />
                </Row>
              </Card>
            );
          })}
        </>
      ) : null}

      {step === 'dados' ? (
        <>
          <T v="display" style={{ marginTop: space.md }}>{isPro ? 'SEU\nESTÚDIO' : 'SEUS\nDADOS'}</T>
          <Field label={isPro ? 'Seu nome' : 'Como quer ser chamada?'} placeholder="Ex: Bruna Alves" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <PhoneField value={phone} onChange={setPhone} />
          <Field label="E-mail (opcional)" placeholder="voce@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          {isPro ? (
            <>
              <Field label="Nome do estúdio / marca" placeholder="Ex: Camila Nails" value={studio} onChangeText={setStudio} />
              <T v="overline" muted>Sua especialidade</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {(Object.keys(NICHE_LABEL) as Niche[]).map((n) => (
                  <Chip key={n} icon={NICHE_ICON[n]} label={NICHE_LABEL[n]} selected={niche === n} onPress={() => setNiche(n)} />
                ))}
              </View>
              <Row>
                <View style={{ flex: 1 }}><Field label="Bairro" placeholder="Pinheiros" value={neighborhood} onChangeText={setNeighborhood} /></View>
                <View style={{ flex: 1 }}><Field label="Cidade" value={city} onChangeText={setCity} /></View>
              </Row>
              <Field label="Chave Pix (para o sinal)" placeholder="CPF, e-mail, celular ou aleatória" value={pixKey} onChangeText={setPixKey} autoCapitalize="none" />
            </>
          ) : null}
        </>
      ) : null}

      {step === 'foto' ? (
        <>
          <T v="display" style={{ marginTop: space.md }}>CAPA E{'\n'}FOTO 📸</T>
          <T muted>Toque na capa e na foto para escolher. Você pode trocar depois.</T>
          <ProfileHeader name={isPro ? studio || name : name} photo={photo} cover={cover} editable onChangePhoto={setPhoto} onChangeCover={setCover} />
          <View style={{ paddingHorizontal: 4, gap: 2 }}>
            <T v="title">{isPro ? studio || name : name}</T>
            <T v="small" muted>{handleOf(isPro ? studio || name : name)}</T>
          </View>
          <Field label="Bio" placeholder={isPro ? 'Ex: Alongamento em gel e nail art em Pinheiros' : 'Ex: Apaixonada por unhas e skincare 💜'} value={bio} onChangeText={setBio} multiline maxLength={160} />
          <T v="small" muted style={{ textAlign: 'right', marginTop: -6 }}>{bio.length}/160</T>

          <Pressable onPress={() => setTerms(!terms)} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Ionicons name={terms ? 'checkbox' : 'square-outline'} size={22} color={terms ? colors.black : colors.textMuted} />
            <T v="small" style={{ flex: 1 }}>Li e aceito os <T v="small" style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Termos de Uso</T> e a <T v="small" style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Política de Privacidade</T> (LGPD).</T>
          </Pressable>
          <Pressable onPress={() => setImageConsent(!imageConsent)} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Ionicons name={imageConsent ? 'checkbox' : 'square-outline'} size={22} color={imageConsent ? colors.black : colors.textMuted} />
            <T v="small" style={{ flex: 1 }}>Autorizo o uso das minhas fotos nos stories e na galeria quando eu publicar (opcional).</T>
          </Pressable>
        </>
      ) : null}

      {step === 'codigo' ? (
        <>
          <T v="display" style={{ marginTop: space.md }}>CONFIRME{'\n'}SEU NÚMERO</T>
          <T muted>Enviamos um código de 6 dígitos para <T style={{ fontWeight: '700' }}>{phone}</T>.</T>
          <OtpInput value={code} onChange={setCode} />
          <T v="small" muted>{API_ENABLED ? 'O código chega por SMS/WhatsApp em alguns segundos.' : 'Protótipo: qualquer código funciona.'}</T>
        </>
      ) : null}

      <Button
        title={busy ? 'Aguarde…' : last ? 'Criar conta' : 'Continuar'}
        icon={last ? 'sparkles' : undefined}
        disabled={!canNext || busy}
        onPress={next}
        style={{ marginTop: space.md }}
      />
      {error ? <T v="small" color={colors.danger} style={{ textAlign: 'center' }}>{error}</T> : null}
      {step === 'foto' && !terms ? <T v="small" muted style={{ textAlign: 'center' }}>Aceite os termos para continuar.</T> : null}
      {step === 'perfil' || step === 'dados' ? (
        <Pressable onPress={() => router.replace('/login')} style={{ alignItems: 'center', marginTop: space.sm }}>
          <T>Já tem conta? <T style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Entrar</T></T>
        </Pressable>
      ) : null}
    </Screen>
  );
}
