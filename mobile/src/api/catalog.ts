// Fase 2: serviços, designs, página (widgets), busca e favoritas.
// Conversão entre o formato da API (centavos, chaves, enums MAIÚSCULOS) e o das telas (reais, URLs, minúsculas).
import type { Design, Niche, Professional, Service, Widget, WidgetType } from '@/domain/types';
import { isUri } from '@/domain/rules';

import { api, unwrap, type Schemas } from './client';
import { isLocalUri, uploadImage } from './media';

type ApiNiche = Schemas['ServiceInput']['niche'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrUndefined = (id?: string) => (id && UUID_RE.test(id) ? id : undefined);
const toNiche = (n?: string) => (n ?? 'UNHA').toLowerCase() as Niche;
const fromNiche = (n: Niche) => n.toUpperCase() as ApiNiche;
const reais = (cents?: number) => (cents ?? 0) / 100;
const cents = (value: number) => Math.round(value * 100);

// ---------- conversores ----------

export function serviceFromApi(v: Schemas['ServiceView'], existing?: Service): Service {
  return {
    id: v.id!,
    professionalId: v.professionalId!,
    name: v.name ?? '',
    niche: toNiche(v.niche),
    durationMin: v.durationMin ?? 60,
    price: reais(v.priceCents),
    depositPercent: v.depositPercent ?? 0,
    returnIntervalDays: v.returnIntervalDays ?? 0,
    requiresReference: v.requiresReference ?? false,
    options: (v.options ?? []).map((o) => ({
      id: o.id!,
      label: o.label ?? '',
      choices: (o.choices ?? []).map((c) => ({ id: c.id!, label: c.label ?? '', priceDelta: reais(c.priceDeltaCents) })),
    })),
    // consumo de estoque ainda é local (entra na fase 4)
    consumption: existing?.consumption ?? [],
  };
}

export function serviceToApi(s: Service): Schemas['ServiceInput'] {
  return {
    name: s.name,
    niche: fromNiche(s.niche),
    durationMin: s.durationMin,
    priceCents: cents(s.price),
    depositPercent: s.depositPercent,
    returnIntervalDays: s.returnIntervalDays,
    requiresReference: s.requiresReference ?? false,
    options: s.options.map((o) => ({
      id: uuidOrUndefined(o.id),
      label: o.label,
      choices: o.choices.map((c) => ({ id: uuidOrUndefined(c.id), label: c.label, priceDeltaCents: cents(c.priceDelta) })),
    })),
  };
}

export function designFromApi(d: Schemas['DesignView']): Design {
  return {
    id: d.id!,
    professionalId: d.professionalId!,
    serviceId: d.serviceId!,
    name: d.name ?? '',
    image: d.imageUrl ?? '',
    priceDelta: reais(d.priceDeltaCents),
  };
}

export function widgetFromApi(w: Schemas['WidgetView']): Widget {
  return {
    id: w.id!,
    type: (w.type ?? 'TEXTO').toLowerCase() as WidgetType,
    fixed: w.fixed,
    title: w.title,
    subtitle: w.subtitle,
    color: w.color,
    image: w.imageUrl,
    images: w.imageUrls ?? [],
    value: w.value,
    target: w.target,
    body: w.body,
  };
}

/** Só URLs reais vão para a API (emojis dos dados de exemplo ficam de fora). */
export function widgetToApi(w: Widget): Schemas['WidgetInput'] {
  return {
    id: uuidOrUndefined(w.id),
    type: w.type.toUpperCase() as Schemas['WidgetInput']['type'],
    title: w.title || undefined,
    subtitle: w.subtitle || undefined,
    color: w.color && /^#[0-9A-Fa-f]{6}/.test(w.color) ? w.color : undefined,
    imageKey: w.image && /^https?:/.test(w.image) ? w.image : undefined,
    images: (w.images ?? []).filter((x) => /^https?:/.test(x)),
    value: w.value,
    target: w.target,
    body: w.body || undefined,
  };
}

/** Assinatura do conteúdo (sem ids) — evita reenviar a mesma página em loop. */
export const widgetsSignature = (ws: Widget[]) =>
  JSON.stringify(ws.map((w) => ({ ...widgetToApi(w), id: undefined, local: [w.image, ...(w.images ?? [])].filter((x) => isLocalUri(x) && isUri(x)) })));

export function professionalFromPublic(p: Schemas['PublicProfessional'], existing?: Professional): Professional {
  return {
    ...(existing ?? baseProfessional(p.id!)),
    id: p.id!,
    name: p.studio ?? p.name ?? '',
    niche: toNiche(p.niche),
    headline: p.bio ?? '',
    city: p.city ?? '',
    neighborhood: p.neighborhood ?? '',
    photo: p.photoUrl,
    cover: p.coverUrl,
    pixKey: p.pixKey ?? '',
    depositDeadlineHours: p.depositDeadlineHours ?? 12,
    latitude: p.latitude,
    longitude: p.longitude,
    remote: true,
  };
}

export function professionalFromCard(c: Schemas['ProfessionalCard'], existing?: Professional): Professional {
  return {
    ...(existing ?? baseProfessional(c.id!)),
    id: c.id!,
    name: c.studio ?? c.name ?? '',
    niche: toNiche(c.niche),
    headline: c.bio ?? '',
    city: c.city ?? '',
    neighborhood: c.neighborhood ?? '',
    photo: c.photoUrl,
    cover: c.coverUrl,
    distanceKm: c.distanceKm ?? NaN,
    minPrice: c.minPriceCents != null ? reais(c.minPriceCents) : undefined,
    rating: c.rating ?? existing?.rating ?? 5,
    reviews: c.reviews ?? existing?.reviews ?? 0,
    remote: true,
  };
}

function baseProfessional(id: string): Professional {
  return {
    id,
    name: '',
    niche: 'unha',
    headline: '',
    city: '',
    neighborhood: '',
    distanceKm: NaN,
    rating: 5,
    reviews: 0,
    avatar: '#E8DCF2',
    portfolio: [],
    pixKey: '',
    depositDeadlineHours: 12,
    loyalty: { enabled: false, goalAmount: 500, discountPercent: 10 },
    workHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
    widgets: [],
    remote: true,
  };
}

// ---------- profissional logada ----------

export const myServices = () => unwrap(api.GET('/me/services'));
export const createService = (s: Service) => unwrap(api.POST('/me/services', { body: serviceToApi(s) }));
export const updateService = (s: Service) => unwrap(api.PUT('/me/services/{id}', { params: { path: { id: s.id } }, body: serviceToApi(s) }));
export const deleteService = (id: string) => unwrap(api.DELETE('/me/services/{id}', { params: { path: { id } } }));

export const myDesigns = () => unwrap(api.GET('/me/designs'));

/** Cria ou edita um design; sobe a foto antes se ela for local. */
export async function saveDesign(d: Design) {
  const image = isLocalUri(d.image) ? (await uploadImage('DESIGN', d.image)).publicUrl ?? d.image : d.image;
  const body = { serviceId: d.serviceId, name: d.name, imageKey: image, priceDeltaCents: cents(d.priceDelta) };
  return UUID_RE.test(d.id)
    ? unwrap(api.PUT('/me/designs/{id}', { params: { path: { id: d.id } }, body }))
    : unwrap(api.POST('/me/designs', { body }));
}
export const deleteDesign = (id: string) => unwrap(api.DELETE('/me/designs/{id}', { params: { path: { id } } }));

export const myWidgets = () => unwrap(api.GET('/me/page/widgets'));

/** Sobe imagens locais dos blocos e salva a página inteira. */
export async function saveWidgets(ws: Widget[]) {
  const uploaded: Widget[] = [];
  for (const w of ws) {
    const kindFor = w.type === 'capa' ? 'COVER' : 'PORTFOLIO';
    const image = w.image && isLocalUri(w.image) && isUri(w.image) ? (await uploadImage(kindFor, w.image)).publicUrl : w.image;
    const images: string[] = [];
    for (const x of w.images ?? []) images.push(isLocalUri(x) && isUri(x) ? ((await uploadImage('PORTFOLIO', x)).publicUrl ?? x) : x);
    uploaded.push({ ...w, image, images });
  }
  return unwrap(api.PUT('/me/page/widgets', { body: uploaded.map(widgetToApi) }));
}

export const setMyLocation = (latitude: number, longitude: number) =>
  unwrap(api.PATCH('/me/professional', { body: { latitude, longitude } }));

// ---------- cliente ----------

export const searchProfessionals = (q: { niche?: Niche | null; text?: string; lat?: number; lng?: number; radiusKm?: number }) =>
  unwrap(
    api.GET('/professionals', {
      params: {
        query: {
          niche: q.niche ? fromNiche(q.niche) : undefined,
          q: q.text || undefined,
          lat: q.lat,
          lng: q.lng,
          radiusKm: q.radiusKm,
        },
      },
    }),
  );

export const publicPage = (id: string) => unwrap(api.GET('/professionals/{id}', { params: { path: { id } } }));

export const trendingDesigns = (q: { niche?: Niche | null; lat?: number; lng?: number }) =>
  unwrap(api.GET('/designs/trending', { params: { query: { niche: q.niche ? fromNiche(q.niche) : undefined, lat: q.lat, lng: q.lng } } }));

export const addFavorite = (id: string) => unwrap(api.PUT('/me/favorites/{professionalId}', { params: { path: { professionalId: id } } }));
export const removeFavorite = (id: string) => unwrap(api.DELETE('/me/favorites/{professionalId}', { params: { path: { professionalId: id } } }));
