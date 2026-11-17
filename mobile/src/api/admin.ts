// Painel de administração (só contas ADMIN; o servidor confere em toda chamada).
import { api, unwrap, type Schemas } from './client';

export type AdminOverview = Schemas['Overview'];
export type ReportGroup = Schemas['ReportGroup'];
export type AccountRow = Schemas['AccountRow'];
export type AccountDetail = Schemas['AccountDetail'];
export type AuditEntry = Schemas['AuditEntry'];
export type Decision = 'DISMISS' | 'REMOVE_CONTENT' | 'SUSPEND_AUTHOR';

export const adminOverview = () => unwrap(api.GET('/admin/overview'));
export const adminReports = () => unwrap(api.GET('/admin/reports'));
export const resolveReport = (targetType: string, targetId: string, decision: Decision, note?: string) =>
  unwrap(api.POST('/admin/reports/{targetType}/{targetId}/resolve', {
    params: { path: { targetType, targetId } },
    body: { decision, note: note?.trim() || undefined },
  }));
export const adminAccounts = (q: string) => unwrap(api.GET('/admin/accounts', { params: { query: { q: q || undefined } } }));
export const adminAccount = (id: string) => unwrap(api.GET('/admin/accounts/{id}', { params: { path: { id } } }));
export const suspendAccount = (id: string, reason: string) =>
  unwrap(api.POST('/admin/accounts/{id}/suspend', { params: { path: { id } }, body: { reason } }));
export const reactivateAccount = (id: string) => unwrap(api.POST('/admin/accounts/{id}/reactivate', { params: { path: { id } } }));
export const deleteAccountByAdmin = (id: string, reason: string) =>
  unwrap(api.POST('/admin/accounts/{id}/delete', { params: { path: { id } }, body: { reason } }));
export const adminAudit = () => unwrap(api.GET('/admin/audit'));

export const TARGET_LABEL: Record<string, string> = {
  STORY: 'Story', REVIEW: 'Avaliação', MESSAGE: 'Mensagem', PROFESSIONAL: 'Perfil de profissional', CLIENT: 'Perfil de cliente',
};
export const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam', INAPPROPRIATE: 'Conteúdo impróprio', HARASSMENT: 'Assédio', FAKE: 'Golpe / perfil falso', OTHER: 'Outro',
};
export const ACTION_LABEL: Record<string, string> = {
  REPORT_DISMISSED: 'Manteve conteúdo', CONTENT_REMOVED: 'Removeu conteúdo', REPORT_ACTIONED: 'Denúncia procedente',
  ACCOUNT_SUSPENDED: 'Suspendeu conta', ACCOUNT_REACTIVATED: 'Reativou conta', ACCOUNT_DELETED: 'Excluiu conta',
};

/** "há 3 h", "há 2 d" */
export function ago(iso?: string) {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `há ${min} min`;
  if (min < 48 * 60) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
}
