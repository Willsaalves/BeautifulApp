// Fase 3: expediente, horários livres, agendamentos e sinal via Pix (comprovante).
import type { Appointment, AppointmentStatus, Client, Professional, WorkDay } from '@/domain/types';

import { api, unwrap, type Schemas } from './client';
import { isLocalUri, uploadImage } from './media';

type View = Schemas['AppointmentView'];

const STATUS: Record<string, AppointmentStatus> = {
  AWAITING_DEPOSIT: 'aguardando_sinal',
  RECEIPT_SENT: 'sinal_enviado',
  CONFIRMED: 'confirmado',
  ADJUSTMENT_PENDING: 'ajuste_pendente',
  COMPLETED: 'concluido',
  CANCELLED: 'cancelado',
  EXPIRED: 'expirado',
};
const ADJ: Record<string, 'pendente' | 'aceito' | 'recusado'> = { PENDING: 'pendente', ACCEPTED: 'aceito', DECLINED: 'recusado' };
const reais = (c?: number) => (c ?? 0) / 100;
const hhmm = (t?: string) => (t ?? '00:00').slice(0, 5);

export function appointmentFromApi(v: View): Appointment {
  return {
    id: v.id!,
    clientId: v.client?.accountId ?? '',
    professionalId: v.professional?.id ?? '',
    serviceId: v.serviceId!,
    startsAt: v.startsAt!,
    endsAt: v.endsAt,
    serviceName: v.serviceName,
    durationMin: v.durationMin,
    returnIntervalDays: v.returnIntervalDays,
    selections: Object.fromEntries((v.selections ?? []).map((s) => [s.optionId!, s.choiceId!])),
    selectionLabels: (v.selections ?? []).map((s) => ({ option: s.optionLabel ?? '', choice: s.choiceLabel ?? '' })),
    referenceImage: v.referenceUrl,
    designId: v.designId,
    designName: v.designName,
    notes: v.notes,
    price: reais(v.priceCents),
    discountApplied: reais(v.discountCents),
    depositAmount: reais(v.depositCents),
    depositDueAt: v.depositDueAt ?? v.startsAt!,
    receiptImage: v.receiptUrl,
    status: STATUS[v.status ?? ''] ?? 'aguardando_sinal',
    adjustment: v.adjustment
      ? { newPrice: reais(v.adjustment.newPriceCents), note: v.adjustment.note ?? '', status: ADJ[v.adjustment.status ?? 'PENDING'] }
      : undefined,
    createdAt: v.createdAt ?? new Date().toISOString(),
    remote: true,
  };
}

/** Dados das partes (cliente / profissional) que vêm junto do agendamento. */
export function partiesFromApi(list: View[]) {
  const clients: Client[] = [];
  const pros: Partial<Professional>[] = [];
  for (const v of list) {
    if (v.client?.accountId && !clients.some((c) => c.id === v.client!.accountId)) {
      clients.push({
        id: v.client.accountId,
        name: v.client.name ?? 'Cliente',
        phone: v.client.phone ?? '',
        photo: v.client.photoUrl,
        avatar: '#E8DCF2',
        favorites: [],
        dreams: [],
      });
    }
    if (v.professional?.id && !pros.some((p) => p.id === v.professional!.id)) {
      pros.push({
        id: v.professional.id,
        name: v.professional.studio ?? '',
        photo: v.professional.photoUrl,
        neighborhood: v.professional.neighborhood ?? '',
        city: v.professional.city ?? '',
        pixKey: v.professional.pixKey ?? '',
      });
    }
  }
  return { clients, pros };
}

export const workDaysFromApi = (list: Schemas['WorkDay'][]): WorkDay[] =>
  list.map((d) => ({ weekday: d.weekday ?? 0, start: hhmm(d.start), end: hhmm(d.end) }));

/** Resumo no formato antigo do app (um horário para todos os dias). */
export function workHoursSummary(days: WorkDay[]) {
  if (!days.length) return { start: '09:00', end: '18:00', days: [] as number[] };
  return {
    start: days.map((d) => d.start).sort()[0],
    end: days.map((d) => d.end).sort().reverse()[0],
    days: days.map((d) => d.weekday),
  };
}

// ---------- profissional ----------

export const myWorkHours = async () => workDaysFromApi(await unwrap(api.GET('/me/work-hours')));
export const saveWorkHours = async (days: WorkDay[]) =>
  workDaysFromApi(await unwrap(api.PUT('/me/work-hours', { body: days.map((d) => ({ weekday: d.weekday, start: d.start, end: d.end })) })));

export const myAgenda = () => unwrap(api.GET('/me/agenda'));
export const confirmDeposit = (id: string) => unwrap(api.POST('/appointments/{id}/confirm-deposit', { params: { path: { id } } }));
export const rejectReceipt = (id: string) => unwrap(api.POST('/appointments/{id}/reject-receipt', { params: { path: { id } } }));
export const proposeAdjustment = (id: string, newPrice: number, note: string) =>
  unwrap(api.POST('/appointments/{id}/adjustment', { params: { path: { id } }, body: { newPriceCents: Math.round(newPrice * 100), note } }));
export const completeAppointment = (id: string) => unwrap(api.POST('/appointments/{id}/complete', { params: { path: { id } } }));

// ---------- cliente ----------

export const availability = (professionalId: string, date: string, serviceId: string) =>
  unwrap(api.GET('/professionals/{id}/availability', { params: { path: { id: professionalId }, query: { date, serviceId } } }));

export async function createAppointment(input: {
  serviceId: string;
  startsAt: Date;
  selections: Record<string, string>;
  designId?: string;
  referenceImage?: string;
  notes?: string;
}) {
  const referenceKey =
    input.referenceImage && isLocalUri(input.referenceImage) ? (await uploadImage('REFERENCE', input.referenceImage)).key : undefined;
  return unwrap(
    api.POST('/appointments', {
      body: {
        serviceId: input.serviceId,
        startsAt: input.startsAt.toISOString(),
        selections: Object.entries(input.selections).map(([optionId, choiceId]) => ({ optionId, choiceId })),
        designId: input.designId,
        referenceKey,
        notes: input.notes || undefined,
      },
    }),
  );
}

export const myAppointments = () => unwrap(api.GET('/me/appointments'));
export const getAppointment = (id: string) => unwrap(api.GET('/appointments/{id}', { params: { path: { id } } }));

export async function sendReceipt(id: string, uri: string) {
  const { key } = await uploadImage('RECEIPT', uri);
  return unwrap(api.POST('/appointments/{id}/receipt', { params: { path: { id } }, body: { receiptKey: key } }));
}
export const acceptAdjustment = (id: string) => unwrap(api.POST('/appointments/{id}/adjustment/accept', { params: { path: { id } } }));
export const declineAdjustment = (id: string) => unwrap(api.POST('/appointments/{id}/adjustment/decline', { params: { path: { id } } }));
export const cancelAppointment = (id: string) => unwrap(api.POST('/appointments/{id}/cancel', { params: { path: { id } } }));
