import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { fetchMe, requestOtp, verifyOtp } from '@/api/auth';
import { API_ENABLED } from '@/api/client';
import { OtpInput, PhoneField, phoneValid } from '@/components/auth';
import { Button, Card, Header, Screen, T } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

// Login sem senha: celular + código. Com EXPO_PUBLIC_API_URL usa a API real; sem ela, o protótipo.
export default function Login() {
  const s = useStore();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setError('');
    if (API_ENABLED) {
      setBusy(true);
      try {
        await requestOtp(phone);
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep('code'); setCode(''); setWait(30);
  };

  const go = (role: 'cliente' | 'profissional' | null) => {
    if (role === 'cliente') router.replace('/cliente');
    else if (role === 'profissional') router.replace('/pro');
    else router.replace(`/cadastro?phone=${encodeURIComponent(phone)}&verified=1`);
  };

  const verify = async (c: string) => {
    if (c.length < 6 || busy) return;
    if (API_ENABLED) {
      setBusy(true);
      try {
        const session = await verifyOtp(phone, c);
        if (session.isNew) return go(null);
        go(s.applyMe(await fetchMe()));
      } catch (e) {
        setError((e as Error).message);
        setCode('');
      } finally {
        setBusy(false);
      }
      return;
    }
    // protótipo: qualquer código de 6 dígitos é aceito, exceto 000000 (simula erro)
    if (c === '000000') { setError('Código incorreto. Confira e tente de novo.'); return; }
    go(s.login(phone));
  };

  return (
    <Screen bottomInset={40}>
      <Header />
      {step === 'phone' ? (
        <>
          <T v="display" style={{ marginTop: space.md }}>BEM-VINDA{'\n'}DE VOLTA ✨</T>
          <T muted>Entre com o seu celular. Vamos enviar um código por SMS ou WhatsApp. Sem senha para lembrar.</T>
          <View style={{ marginTop: space.lg, gap: space.md }}>
            <PhoneField value={phone} onChange={setPhone} autoFocus />
            <Button title={busy ? 'Enviando…' : 'Enviar código'} icon="chatbubble-ellipses-outline" disabled={!phoneValid(phone) || busy} onPress={sendCode} />
          </View>
          {error ? <T v="small" color={colors.danger}>{error}</T> : null}
          {API_ENABLED ? null : <Card tone="soft" style={{ marginTop: space.md }}>
            <T v="small">Protótipo: use <T v="small" style={{ fontWeight: '800' }}>(11) 99999-0000</T> para entrar como cliente (Bruna) ou <T v="small" style={{ fontWeight: '800' }}>(11) 98765-4321</T> como profissional (Camila). Outro número leva ao cadastro.</T>
          </Card>}
          <Pressable onPress={() => router.replace('/cadastro')} style={{ alignItems: 'center', marginTop: space.lg }}>
            <T>Ainda não tem conta? <T style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Cadastre-se</T></T>
          </Pressable>
        </>
      ) : (
        <>
          <T v="display" style={{ marginTop: space.md }}>DIGITE O{'\n'}CÓDIGO</T>
          <T muted>Enviamos um código de 6 dígitos para <T style={{ fontWeight: '700' }}>{phone}</T>.</T>
          <View style={{ marginTop: space.lg, gap: space.md }}>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); if (v.length === 6) verify(v); }} />
            {error ? <T v="small" color={colors.danger}>{error}</T> : <T v="small" muted>{API_ENABLED ? 'O código chega por SMS/WhatsApp em alguns segundos.' : 'Protótipo: qualquer código funciona.'}</T>}
            <Button title={busy ? 'Entrando…' : 'Entrar'} disabled={code.length < 6 || busy} onPress={() => verify(code)} />
            <Button title={wait > 0 ? `Reenviar em ${wait}s` : 'Reenviar código'} variant="ghost" disabled={wait > 0} onPress={sendCode} />
            <Button title="Trocar número" variant="ghost" onPress={() => setStep('phone')} />
          </View>
        </>
      )}
    </Screen>
  );
}
