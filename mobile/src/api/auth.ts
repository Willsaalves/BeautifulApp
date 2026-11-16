import { api, unwrap, type Me, type Schemas } from './client';
import { unregisterPush } from '@/lib/push';

import { loadSession, saveSession } from './tokens';

export async function requestOtp(phone: string) {
  return unwrap(api.POST('/auth/otp/request', { body: { phone } }));
}

/** Confere o código e guarda a sessão. isNew=true → ainda não tem perfil (ir para o cadastro). */
export async function verifyOtp(phone: string, code: string) {
  const s = await unwrap(api.POST('/auth/otp/verify', { body: { phone, code } }));
  await saveSession({ accessToken: s.accessToken!, refreshToken: s.refreshToken! });
  return s;
}

export async function fetchMe(): Promise<Me> {
  return unwrap(api.GET('/me'));
}

export async function onboarding(body: Schemas['Onboarding']): Promise<Me> {
  return unwrap(api.POST('/me/onboarding', { body }));
}

export async function patchClient(body: Schemas['ClientPatch']): Promise<Me> {
  return unwrap(api.PATCH('/me/client-profile', { body }));
}

export async function patchProfessional(body: Schemas['ProfessionalPatch']): Promise<Me> {
  return unwrap(api.PATCH('/me/professional', { body }));
}

export async function logout() {
  await unregisterPush();
  const s = await loadSession();
  await saveSession(null);
  if (s) await api.POST('/auth/logout', { body: { refreshToken: s.refreshToken } }).catch(() => undefined);
}

export async function hasSession() {
  return (await loadSession()) != null;
}

/** TERMS: aceita a versão em vigor dos Termos e da Política. IMAGE_USE: autoriza/revoga o uso de imagem. */
export async function saveConsent(kind: 'TERMS' | 'IMAGE_USE', granted: boolean): Promise<Me> {
  return unwrap(api.POST('/me/consents', { body: { kind, granted } }));
}
