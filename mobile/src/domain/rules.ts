// Regras de negócio puras (sem UI). A mesma lógica vai para o backend depois.
import type {
  Appointment,
  Client,
  Dream,
  LoyaltyProgram,
  Product,
  Service,
  StockMovement,
  Voucher,
} from './types';

export const NICHE_LABEL: Record<string, string> = {
  unha: 'Nail designer',
  cilios: 'Lash designer',
  sobrancelha: 'Sobrancelha',
  estetica: 'Estética',
  cabelo: 'Cabelo',
  depilacao: 'Depilação',
};

export const NICHE_ICON: Record<string, string> = {
  unha: '💅',
  cilios: '👁️',
  sobrancelha: '✨',
  estetica: '💉',
  cabelo: '💇‍♀️',
  depilacao: '🌸',
};

/** Preço final = base + acréscimos das opções escolhidas (formato, tamanho, decoração…). */
export function computePrice(service: Service, selections: Record<string, string>): number {
  let total = service.price;
  for (const opt of service.options) {
    const choice = opt.choices.find((c) => c.id === selections[opt.id]);
    if (choice) total += choice.priceDelta;
  }
  return total;
}

export function computeDeposit(price: number, percent: number): number {
  return Math.round(price * percent) / 100;
}

/** Prazo do sinal: X horas após o agendamento, mas nunca depois do próprio horário. */
export function depositDeadline(createdAt: Date, startsAt: Date, hours: number): Date {
  const due = new Date(createdAt.getTime() + hours * 3600_000);
  return due < startsAt ? due : new Date(startsAt.getTime() - 3600_000);
}

/** Política de cancelamento: sinal não pago até o prazo → horário liberado. */
export function isDepositExpired(appt: Appointment, now = new Date()): boolean {
  return appt.status === 'aguardando_sinal' && new Date(appt.depositDueAt) < now;
}

/** Baixa automática do estoque ao concluir um atendimento. */
export function consumeStock(
  products: Product[],
  service: Service,
  appointmentId: string,
  now = new Date(),
): { products: Product[]; movements: StockMovement[] } {
  const movements: StockMovement[] = [];
  const updated = products.map((p) => {
    const c = service.consumption.find((x) => x.productId === p.id);
    if (!c) return p;
    movements.push({
      id: `mv_${appointmentId}_${p.id}`,
      productId: p.id,
      delta: -c.amount,
      reason: 'atendimento',
      appointmentId,
      createdAt: now.toISOString(),
    });
    return { ...p, quantity: Math.max(0, round(p.quantity - c.amount)) };
  });
  return { products: updated, movements };
}

export function isLowStock(p: Product) {
  return p.quantity <= p.minQuantity;
}

/** Quantos atendimentos o estoque atual ainda cobre para um serviço. */
export function remainingServices(products: Product[], service: Service): number {
  if (!service.consumption.length) return Infinity;
  return Math.min(
    ...service.consumption.map((c) => {
      const p = products.find((x) => x.id === c.productId);
      return p ? Math.floor(p.quantity / c.amount) : 0;
    }),
  );
}

/** Fidelidade: soma do que a cliente gastou com a profissional desde o último resgate. */
export function loyaltyProgress(
  appointments: Appointment[],
  clientId: string,
  professionalId: string,
  program: LoyaltyProgram,
) {
  const spent = appointments
    .filter((a) => a.clientId === clientId && a.professionalId === professionalId && a.status === 'concluido')
    .reduce((s, a) => s + a.price - (a.discountApplied ?? 0), 0);
  const cycles = Math.floor(spent / program.goalAmount);
  const inCycle = spent - cycles * program.goalAmount;
  return {
    spent,
    inCycle,
    percent: Math.min(100, Math.round((inCycle / program.goalAmount) * 100)),
    remaining: program.goalAmount - inCycle,
    cycles, // quantas vezes já atingiu a meta
  };
}

/** Voucher do app por feedback: 1 por mês por cliente. */
export function canEarnFeedbackVoucher(vouchers: Voucher[], clientId: string, now = new Date()) {
  return !vouchers.some((v) => {
    const d = new Date(v.createdAt);
    return (
      v.clientId === clientId &&
      v.kind === 'feedback' &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });
}

/** Progresso dos "procedimentos dos sonhos". */
export function dreamsProgress(dreams: Dream[]) {
  if (!dreams.length) return 0;
  return Math.round((dreams.filter((d) => d.done).length / dreams.length) * 100);
}

/** Último atendimento concluído de um serviço + quando é a próxima manutenção. */
export function lastDoneOf(appointments: Appointment[], services: Service[], clientId: string) {
  const done = appointments
    .filter((a) => a.clientId === clientId && a.status === 'concluido')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return done.map((a) => {
    const svc = services.find((s) => s.id === a.serviceId)!;
    const next = new Date(new Date(a.startsAt).getTime() + svc.returnIntervalDays * 86400_000);
    return { appointment: a, service: svc, nextAt: next };
  });
}

/** Clientes atrasadas para retorno (visão da profissional). */
export function overdueClients(
  appointments: Appointment[],
  services: Service[],
  clients: Client[],
  professionalId: string,
  now = new Date(),
) {
  const result: { client: Client; service: Service; daysLate: number; lastAt: Date }[] = [];
  for (const c of clients) {
    const last = lastDoneOf(
      appointments.filter((a) => a.professionalId === professionalId),
      services,
      c.id,
    )[0];
    if (!last) continue;
    const hasFuture = appointments.some(
      (a) =>
        a.clientId === c.id &&
        a.professionalId === professionalId &&
        ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'].includes(a.status),
    );
    const daysLate = Math.floor((now.getTime() - last.nextAt.getTime()) / 86400_000);
    if (!hasFuture && daysLate > 0)
      result.push({ client: c, service: last.service, daysLate, lastAt: new Date(last.appointment.startsAt) });
  }
  return result.sort((a, b) => b.daysLate - a.daysLate);
}

/** Gera horários livres de um dia, dado expediente, duração e agenda já ocupada. */
export function freeSlots(
  day: Date,
  work: { start: string; end: string; days: number[] },
  durationMin: number,
  busy: Appointment[],
  durations: Record<string, number>,
  now = new Date(),
): Date[] {
  if (!work.days.includes(day.getDay())) return [];
  const [sh, sm] = work.start.split(':').map(Number);
  const [eh, em] = work.end.split(':').map(Number);
  const start = new Date(day);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(day);
  end.setHours(eh, em, 0, 0);
  const slots: Date[] = [];
  for (let t = start.getTime(); t + durationMin * 60_000 <= end.getTime(); t += 30 * 60_000) {
    const s = t;
    const e = t + durationMin * 60_000;
    if (s < now.getTime()) continue;
    const clash = busy.some((a) => {
      if (['cancelado', 'expirado'].includes(a.status)) return false;
      const as = new Date(a.startsAt).getTime();
      const ae = as + (durations[a.serviceId] ?? 60) * 60_000;
      return s < ae && e > as;
    });
    if (!clash) slots.push(new Date(s));
  }
  return slots;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export const brl = (n: number) =>
  'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTH = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const fmtDate = (d: Date | string) => {
  const x = new Date(d);
  return `${WEEK[x.getDay()]}, ${x.getDate()} ${MONTH[x.getMonth()]}`;
};
export const fmtTime = (d: Date | string) => {
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
export const fmtDateTime = (d: Date | string) => `${fmtDate(d)} · ${fmtTime(d)}`;
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400_000);

export const STATUS_LABEL: Record<string, { label: string; tone: 'warning' | 'success' | 'muted' | 'danger' | 'lilac' }> = {
  aguardando_sinal: { label: 'Aguardando sinal', tone: 'warning' },
  sinal_enviado: { label: 'Comprovante enviado', tone: 'lilac' },
  confirmado: { label: 'Confirmado', tone: 'success' },
  ajuste_pendente: { label: 'Novo valor proposto', tone: 'warning' },
  concluido: { label: 'Concluído', tone: 'muted' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
  expirado: { label: 'Expirado (sinal não pago)', tone: 'danger' },
};
