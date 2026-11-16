// Fase 4: estoque, consumo por serviço, fidelidade, vouchers, avaliações e relatórios.
import type { Feedback, LoyaltyCard, Product, StockMovement, Unit, Voucher } from '@/domain/types';

import { api, unwrap, type Schemas } from './client';

const reais = (c?: number | null) => (c ?? 0) / 100;
const cents = (v: number) => Math.round(v * 100);
const REASON: Record<string, StockMovement['reason']> = { PURCHASE: 'compra', ATTENDANCE: 'atendimento', ADJUSTMENT: 'ajuste' };

// ---------- conversores ----------

export const productFromApi = (p: Schemas['ProductView']): Product => ({
  id: p.id!,
  name: p.name ?? '',
  unit: (p.unit ?? 'UN').toLowerCase() as Unit,
  quantity: p.quantity ?? 0,
  minQuantity: p.minQuantity ?? 0,
  unitCost: p.avgCostCents != null ? reais(p.avgCostCents) : undefined,
  lot: p.lot,
  expiresAt: p.expiresAt,
});

export const movementFromApi = (m: Schemas['MovementView']): StockMovement => ({
  id: m.id!,
  productId: m.productId!,
  delta: m.delta ?? 0,
  reason: REASON[m.reason ?? 'ADJUSTMENT'],
  appointmentId: m.appointmentId,
  unitCost: m.unitCostCents != null ? reais(m.unitCostCents) : undefined,
  createdAt: m.createdAt ?? new Date().toISOString(),
});

export const voucherFromApi = (v: Schemas['VoucherView'], clientId: string): Voucher => ({
  id: v.id!,
  clientId,
  professionalId: v.professionalId,
  kind: v.kind === 'LOYALTY' ? 'fidelidade' : 'feedback',
  percent: v.percent ?? 0,
  label: v.label ?? '',
  used: v.used ?? false,
  createdAt: v.createdAt ?? new Date().toISOString(),
});

export const cardFromApi = (c: Schemas['CardView']): LoyaltyCard => ({
  professionalId: c.professionalId!,
  studio: c.studio,
  photo: c.photoUrl,
  enabled: c.enabled ?? false,
  goal: reais(c.goalCents),
  discountPercent: c.discountPercent ?? 0,
  spent: reais(c.spentCents),
  inCycle: reais(c.inCycleCents),
  percent: c.percent ?? 0,
  remaining: reais(c.remainingCents),
  cycles: c.cycles ?? 0,
});

export const reviewFromApi = (r: Schemas['ReviewView'], professionalId: string): Feedback => ({
  id: r.id!,
  appointmentId: r.appointmentId ?? '',
  clientId: '',
  professionalId,
  rating: r.rating ?? 5,
  comment: r.comment ?? '',
  createdAt: r.createdAt ?? new Date().toISOString(),
  clientName: r.clientName,
  clientPhoto: r.clientPhotoUrl,
});

// ---------- estoque (profissional) ----------

export const myProducts = async () => (await unwrap(api.GET('/me/products'))).map(productFromApi);
export const myMovements = async () => (await unwrap(api.GET('/me/stock-movements', { params: { query: { limit: 50 } } }))).map(movementFromApi);
export const myConsumption = () => unwrap(api.GET('/me/consumption'));

export const createProduct = async (p: { name: string; unit: Unit; minQuantity: number; lot?: string }) =>
  productFromApi(await unwrap(api.POST('/me/products', { body: { name: p.name, unit: p.unit.toUpperCase() as 'UN', minQuantity: p.minQuantity, lot: p.lot } })));

export const purchase = async (productId: string, quantity: number, unitCost?: number, lot?: string) =>
  productFromApi(
    await unwrap(
      api.POST('/me/products/{id}/purchases', {
        params: { path: { id: productId } },
        body: { quantity, unitCostCents: unitCost != null ? cents(unitCost) : undefined, lot },
      }),
    ),
  );

export const setConsumption = (serviceId: string, items: { productId: string; amount: number }[]) =>
  unwrap(api.PUT('/me/services/{serviceId}/consumption', { params: { path: { serviceId } }, body: items }));

// ---------- fidelidade ----------

export const myLoyaltyProgram = () => unwrap(api.GET('/me/loyalty-program'));
export const saveLoyaltyProgram = (enabled: boolean, goal: number, discountPercent: number) =>
  unwrap(api.PUT('/me/loyalty-program', { body: { enabled, goalCents: cents(goal), discountPercent } }));
export const myLoyaltyCards = async () => (await unwrap(api.GET('/me/loyalty'))).map(cardFromApi);
export const myVouchers = (clientId: string) => unwrap(api.GET('/me/vouchers')).then((l) => l.map((v) => voucherFromApi(v, clientId)));

// ---------- avaliações ----------

export const reviewAppointment = (id: string, rating: number, comment: string) =>
  unwrap(api.POST('/appointments/{id}/review', { params: { path: { id } }, body: { rating, comment } }));
export const myReviews = () => unwrap(api.GET('/me/reviews'));

// ---------- relatórios ----------

export const profitReport = (from: Date, to: Date) =>
  unwrap(api.GET('/me/analytics/profit', { params: { query: { from: from.toISOString(), to: to.toISOString() } } }));
export const overdueClients = () => unwrap(api.GET('/me/analytics/overdue-clients'));
