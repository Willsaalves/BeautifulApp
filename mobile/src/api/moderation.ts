// Exclusão de conta, denúncias e bloqueios (exigências da App Store / Play Store).
import { api, unwrap } from './client';
import { unregisterPush } from '@/lib/push';
import { saveSession } from './tokens';

export type ReportTarget = 'PROFESSIONAL' | 'CLIENT' | 'STORY' | 'REVIEW' | 'MESSAGE';
export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'FAKE' | 'OTHER';

export const report = (targetType: ReportTarget, targetId: string, reason: ReportReason, details?: string) =>
  unwrap(api.POST('/reports', { body: { targetType, targetId, reason, details: details?.trim() || undefined } }));

export const block = (target: { accountId?: string; professionalId?: string }) => unwrap(api.POST('/me/blocked', { body: target }));

export const unblock = (accountId: string) => unwrap(api.DELETE('/me/blocked/{accountId}', { params: { path: { accountId } } }));

export const myBlocked = () => unwrap(api.GET('/me/blocked'));

/** Exclui a conta no servidor e limpa a sessão do aparelho. */
export async function deleteAccount() {
  await unregisterPush().catch(() => undefined);
  await unwrap(api.DELETE('/me'));
  await saveSession(null);
}
