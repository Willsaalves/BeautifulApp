// Estado global em memória. Quando o backend existir, cada ação vira uma chamada de API
// (mantendo as mesmas assinaturas) e este reducer passa a refletir as respostas.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { addFavorite, professionalFromCard, removeFavorite } from '@/api/catalog';
import { appointmentFromApi, partiesFromApi, workHoursSummary } from '@/api/scheduling';
import { API_ENABLED, type Me, type Schemas } from '@/api/client';

type AppointmentApiView = Schemas['AppointmentView'];
import * as mock from '@/data/mock';
import {
  canEarnFeedbackVoucher,
  computeDeposit,
  computePrice,
  consumeStock,
  depositDeadline,
  isDepositExpired,
  loyaltyProgress,
} from '@/domain/rules';
import type {
  Appointment,
  ChatMessage,
  Client,
  Design,
  Dream,
  Feedback,
  LoyaltyCard,
  Product,
  Professional,
  Service,
  StockMovement,
  Story,
  Voucher,
  Widget,
  WidgetType,
  WorkDay,
} from '@/domain/types';

export type Role = 'cliente' | 'profissional';

interface State {
  role: Role | null;
  clientId: string;
  proId: string;
  professionals: Professional[];
  services: Service[];
  products: Product[];
  productOwner: Record<string, string>;
  movements: StockMovement[];
  clients: Client[];
  appointments: Appointment[];
  feedbacks: Feedback[];
  vouchers: Voucher[];
  messages: ChatMessage[];
  designs: Design[];
  stories: Story[];
  loyaltyCards: LoyaltyCard[];   // progresso calculado no servidor (cliente com API)
  unread: number;                // notificações não lidas (sino)
}

const initial: State = {
  role: null,
  clientId: mock.ME_CLIENT_ID,
  proId: mock.ME_PRO_ID,
  professionals: mock.professionals,
  services: mock.services,
  products: mock.products,
  productOwner: mock.productOwner,
  movements: mock.movements,
  clients: mock.clients,
  appointments: mock.appointments,
  feedbacks: mock.feedbacks,
  vouchers: mock.vouchers,
  messages: [],
  designs: mock.designs,
  stories: mock.stories,
  loyaltyCards: [],
  unread: 0,
};

type Action =
  | { type: 'setRole'; role: Role | null }
  | { type: 'upsertAppointment'; appointment: Appointment }
  | { type: 'patchAppointment'; id: string; patch: Partial<Appointment> }
  | { type: 'set'; patch: Partial<State> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setRole':
      return { ...state, role: action.role };
    case 'upsertAppointment': {
      const exists = state.appointments.some((a) => a.id === action.appointment.id);
      return {
        ...state,
        appointments: exists
          ? state.appointments.map((a) => (a.id === action.appointment.id ? action.appointment : a))
          : [...state.appointments, action.appointment],
      };
    }
    case 'patchAppointment':
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case 'set':
      return { ...state, ...action.patch };
  }
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** UUID v4 local: blocos criados no app mantêm o mesmo id quando vão para a API. */
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/**
 * As ações leem o estado MAIS RECENTE (stateRef) no momento em que são chamadas.
 * Assim várias ações seguidas (ex.: sincronização com a API) não sobrescrevem umas às outras.
 */
function useActions(stateRef: React.RefObject<State>, dispatch: React.Dispatch<Action>) {
  return useMemo(() => {
    const svc = (id: string) => stateRef.current.services.find((s) => s.id === id)!;
    const pro = (id: string) => stateRef.current.professionals.find((p) => p.id === id)!;
    const appt = (id: string) => stateRef.current.appointments.find((a) => a.id === id)!;

    return {
      setRole: (role: Role | null) => dispatch({ type: 'setRole', role }),

      // ---------- Agendamento (cliente) ----------
      createAppointment(input: {
        serviceId: string;
        startsAt: Date;
        selections: Record<string, string>;
        referenceImage?: string;
        designId?: string;
        notes?: string;
        voucherId?: string;
      }) {
        const service = svc(input.serviceId);
        const p = pro(service.professionalId);
        const now = new Date();
        const design = stateRef.current.designs.find((d) => d.id === input.designId);
        const price = computePrice(service, input.selections, design?.priceDelta ?? 0);
        let discountApplied = 0;
        const voucher = stateRef.current.vouchers.find((v) => v.id === input.voucherId && !v.used);
        if (voucher) {
          discountApplied = Math.round(price * voucher.percent) / 100;
          dispatch({
            type: 'set',
            patch: { vouchers: stateRef.current.vouchers.map((v) => (v.id === voucher.id ? { ...v, used: true } : v)) },
          });
        }
        const deposit = computeDeposit(price - discountApplied, service.depositPercent);
        const a: Appointment = {
          id: uid('a'),
          clientId: stateRef.current.clientId,
          professionalId: p.id,
          serviceId: service.id,
          startsAt: input.startsAt.toISOString(),
          selections: input.selections,
          referenceImage: input.referenceImage ?? design?.image,
          designId: design?.id,
          notes: input.notes,
          price,
          discountApplied,
          depositAmount: deposit,
          depositDueAt: depositDeadline(now, input.startsAt, p.depositDeadlineHours).toISOString(),
          status: deposit > 0 ? 'aguardando_sinal' : 'confirmado',
          createdAt: now.toISOString(),
        };
        dispatch({ type: 'upsertAppointment', appointment: a });
        return a.id;
      },

      attachReceipt(id: string, uri: string) {
        dispatch({ type: 'patchAppointment', id, patch: { receiptImage: uri, status: 'sinal_enviado' } });
      },

      cancelAppointment(id: string) {
        dispatch({ type: 'patchAppointment', id, patch: { status: 'cancelado' } });
      },

      respondAdjustment(id: string, accept: boolean) {
        const a = appt(id);
        if (!a.adjustment) return;
        const back = a.receiptImage ? 'confirmado' : 'aguardando_sinal';
        dispatch({
          type: 'patchAppointment',
          id,
          patch: {
            status: back,
            price: accept ? a.adjustment.newPrice : a.price,
            adjustment: { ...a.adjustment, status: accept ? 'aceito' : 'recusado' },
          },
        });
      },

      submitFeedback(appointmentId: string, rating: number, comment: string) {
        const a = appt(appointmentId);
        const fb: Feedback = {
          id: uid('f'),
          appointmentId,
          clientId: a.clientId,
          professionalId: a.professionalId,
          rating,
          comment,
          createdAt: new Date().toISOString(),
        };
        const earned = canEarnFeedbackVoucher(stateRef.current.vouchers, a.clientId);
        const vouchers = earned
          ? [
              ...stateRef.current.vouchers,
              {
                id: uid('v'),
                clientId: a.clientId,
                kind: 'feedback' as const,
                percent: 10,
                label: 'Bônus do mês por avaliar',
                used: false,
                createdAt: new Date().toISOString(),
              },
            ]
          : stateRef.current.vouchers;
        dispatch({ type: 'set', patch: { feedbacks: [...stateRef.current.feedbacks, fb], vouchers } });
        return earned;
      },

      toggleFavorite(proId: string) {
        const me = stateRef.current.clients.find((c) => c.id === stateRef.current.clientId);
        const wasFav = !!me?.favorites.includes(proId);
        if (API_ENABLED && stateRef.current.role === 'cliente') {
          (wasFav ? removeFavorite(proId) : addFavorite(proId)).catch(() => {
            // desfaz se a API recusar
            dispatch({
              type: 'set',
              patch: {
                clients: stateRef.current.clients.map((c) =>
                  c.id !== stateRef.current.clientId ? c : { ...c, favorites: wasFav ? [...c.favorites, proId] : c.favorites.filter((f) => f !== proId) },
                ),
              },
            });
          });
        }
        dispatch({
          type: 'set',
          patch: {
            clients: stateRef.current.clients.map((c) =>
              c.id !== stateRef.current.clientId
                ? c
                : {
                    ...c,
                    favorites: c.favorites.includes(proId)
                      ? c.favorites.filter((f) => f !== proId)
                      : [...c.favorites, proId],
                  },
            ),
          },
        });
      },

      setDreams(dreams: Dream[]) {
        dispatch({
          type: 'set',
          patch: { clients: stateRef.current.clients.map((c) => (c.id === stateRef.current.clientId ? { ...c, dreams } : c)) },
        });
      },

      sendMessage(appointmentId: string, from: ChatMessage['from'], text: string) {
        dispatch({
          type: 'set',
          patch: {
            messages: [
              ...stateRef.current.messages,
              { id: uid('m'), appointmentId, from, text, createdAt: new Date().toISOString() },
            ],
          },
        });
      },

      // ---------- Profissional ----------
      confirmDeposit(id: string) {
        dispatch({ type: 'patchAppointment', id, patch: { status: 'confirmado' } });
      },
      rejectReceipt(id: string) {
        dispatch({ type: 'patchAppointment', id, patch: { status: 'aguardando_sinal', receiptImage: undefined } });
      },

      proposeAdjustment(id: string, newPrice: number, note: string) {
        dispatch({
          type: 'patchAppointment',
          id,
          patch: { status: 'ajuste_pendente', adjustment: { newPrice, note, status: 'pendente' } },
        });
      },

      /** Conclui: baixa estoque + atualiza fidelidade (gera voucher ao bater a meta). */
      completeAppointment(id: string) {
        const a = appt(id);
        const service = svc(a.serviceId);
        const p = pro(a.professionalId);
        const own = stateRef.current.products.filter((x) => stateRef.current.productOwner[x.id] === p.id);
        const { products: consumed, movements } = consumeStock(own, service, id);
        const products = stateRef.current.products.map((x) => consumed.find((c) => c.id === x.id) ?? x);

        const before = loyaltyProgress(stateRef.current.appointments, a.clientId, p.id, p.loyalty);
        const nextAppts = stateRef.current.appointments.map((x) => (x.id === id ? { ...x, status: 'concluido' as const } : x));
        const after = loyaltyProgress(nextAppts, a.clientId, p.id, p.loyalty);
        const reached = p.loyalty.enabled && after.cycles > before.cycles;
        const vouchers = reached
          ? [
              ...stateRef.current.vouchers,
              {
                id: uid('v'),
                clientId: a.clientId,
                professionalId: p.id,
                kind: 'fidelidade' as const,
                percent: p.loyalty.discountPercent,
                label: `Fidelidade ${p.name}`,
                used: false,
                createdAt: new Date().toISOString(),
              },
            ]
          : stateRef.current.vouchers;

        dispatch({
          type: 'set',
          patch: { appointments: nextAppts, products, movements: [...stateRef.current.movements, ...movements], vouchers },
        });
        return { reached, movements };
      },

      /** "Comprei 150 pincéis" — entrada no estoque, cria o produto se for novo. */
      registerPurchase(input: {
        productId?: string;
        name?: string;
        unit?: Product['unit'];
        quantity: number;
        unitCost?: number;
        minQuantity?: number;
        lot?: string;
        expiresAt?: string;
      }) {
        let products = stateRef.current.products;
        let productOwner = stateRef.current.productOwner;
        let productId = input.productId;
        if (!productId) {
          productId = uid('pr');
          products = [
            ...products,
            {
              id: productId,
              name: input.name ?? 'Produto',
              unit: input.unit ?? 'un',
              quantity: 0,
              minQuantity: input.minQuantity ?? 0,
              lot: input.lot,
              expiresAt: input.expiresAt,
            },
          ];
          productOwner = { ...productOwner, [productId]: stateRef.current.proId };
        }
        products = products.map((p) => {
          if (p.id !== productId) return p;
          // custo médio ponderado
          const unitCost =
            input.unitCost == null
              ? p.unitCost
              : p.unitCost == null || p.quantity <= 0
                ? input.unitCost
                : (p.unitCost * p.quantity + input.unitCost * input.quantity) / (p.quantity + input.quantity);
          return { ...p, quantity: p.quantity + input.quantity, unitCost, lot: input.lot ?? p.lot, expiresAt: input.expiresAt ?? p.expiresAt };
        });
        const mv: StockMovement = {
          id: uid('mv'),
          productId,
          delta: input.quantity,
          reason: 'compra',
          unitCost: input.unitCost,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'set', patch: { products, productOwner, movements: [...stateRef.current.movements, mv] } });
      },

      updateProduct(id: string, patch: Partial<Product>) {
        dispatch({ type: 'set', patch: { products: stateRef.current.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) } });
      },

      upsertService(service: Service) {
        const exists = stateRef.current.services.some((s) => s.id === service.id);
        dispatch({
          type: 'set',
          patch: {
            services: exists
              ? stateRef.current.services.map((s) => (s.id === service.id ? service : s))
              : [...stateRef.current.services, service],
          },
        });
      },

      updateProfessional(patch: Partial<Professional>) {
        dispatch({
          type: 'set',
          patch: { professionals: stateRef.current.professionals.map((p) => (p.id === stateRef.current.proId ? { ...p, ...patch } : p)) },
        });
      },

      // ---------- Página (widgets) ----------
      addWidget(type: WidgetType) {
        const me = pro(stateRef.current.proId);
        const defaults: Record<string, Partial<Widget>> = {
          capa: { title: me.name.toUpperCase(), subtitle: me.headline, color: me.avatar },
          galeria: { title: 'Galeria', images: [] },
          porcentagem: { title: 'Agenda do mês', subtitle: 'já preenchida', value: 50 },
          contagem: { title: 'Promoção', subtitle: 'Termina em', target: new Date(Date.now() + 7 * 86400_000).toISOString() },
          texto: { title: 'Sobre mim', body: '' },
          trending: { title: 'Trending Designs' },
          fidelidade: { title: 'Cartão fidelidade' },
          avaliacoes: { title: 'Depoimentos' },
        };
        const w: Widget = { id: uuid(), type, ...defaults[type] };
        // entra logo depois da capa
        const ws = [...me.widgets];
        const capaIdx = ws.findIndex((x) => x.type === 'capa');
        ws.splice(capaIdx + 1, 0, w);
        dispatch({ type: 'set', patch: { professionals: stateRef.current.professionals.map((p) => (p.id === me.id ? { ...p, widgets: ws } : p)) } });
        return w.id;
      },
      updateWidget(id: string, patch: Partial<Widget>) {
        dispatch({
          type: 'set',
          patch: {
            professionals: stateRef.current.professionals.map((p) =>
              p.id === stateRef.current.proId ? { ...p, widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) } : p,
            ),
          },
        });
      },
      removeWidget(id: string) {
        dispatch({
          type: 'set',
          patch: {
            professionals: stateRef.current.professionals.map((p) =>
              p.id === stateRef.current.proId ? { ...p, widgets: p.widgets.filter((w) => w.id !== id || w.fixed) } : p,
            ),
          },
        });
      },
      moveWidget(id: string, dir: -1 | 1) {
        const me = pro(stateRef.current.proId);
        const ws = [...me.widgets];
        const i = ws.findIndex((w) => w.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ws.length) return;
        [ws[i], ws[j]] = [ws[j], ws[i]];
        dispatch({ type: 'set', patch: { professionals: stateRef.current.professionals.map((p) => (p.id === me.id ? { ...p, widgets: ws } : p)) } });
      },

      // ---------- Trending Designs ----------
      upsertDesign(d: Design) {
        const exists = stateRef.current.designs.some((x) => x.id === d.id);
        dispatch({
          type: 'set',
          patch: { designs: exists ? stateRef.current.designs.map((x) => (x.id === d.id ? d : x)) : [...stateRef.current.designs, d] },
        });
      },
      removeDesign(id: string) {
        dispatch({ type: 'set', patch: { designs: stateRef.current.designs.filter((x) => x.id !== id) } });
      },

      // ---------- Stories ----------
      postStory(input: Omit<Story, 'id' | 'createdAt' | 'authorType' | 'authorId'>) {
        const isPro = stateRef.current.role === 'profissional';
        const st: Story = {
          ...input,
          id: uid('st'),
          authorType: isPro ? 'profissional' : 'cliente',
          authorId: isPro ? stateRef.current.proId : stateRef.current.clientId,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'set', patch: { stories: [st, ...stateRef.current.stories] } });
        return st.id;
      },

      // ---------- Conta ----------
      /** Login por telefone (mock do OTP). Devolve o papel encontrado ou null se não houver conta. */
      login(phone: string): Role | null {
        const digits = (x?: string) => (x ?? '').replace(/\D/g, '');
        const c = stateRef.current.clients.find((x) => digits(x.phone) === digits(phone));
        if (c) {
          dispatch({ type: 'set', patch: { role: 'cliente', clientId: c.id } });
          return 'cliente';
        }
        const p = stateRef.current.professionals.find((x) => digits(x.phone) === digits(phone));
        if (p) {
          dispatch({ type: 'set', patch: { role: 'profissional', proId: p.id } });
          return 'profissional';
        }
        return null;
      },

      register(input: {
        role: Role;
        name: string;
        phone: string;
        email?: string;
        photo?: string;
        cover?: string;
        bio?: string;
        niche?: Professional['niche'];
        studio?: string;
        neighborhood?: string;
        city?: string;
        pixKey?: string;
      }) {
        if (input.role === 'cliente') {
          const c: Client = {
            id: uid('c'),
            name: input.name,
            phone: input.phone,
            email: input.email,
            photo: input.photo,
            cover: input.cover,
            bio: input.bio,
            avatar: '#E8DCF2',
            favorites: [],
            dreams: [],
          };
          dispatch({ type: 'set', patch: { clients: [...stateRef.current.clients, c], clientId: c.id, role: 'cliente' } });
        } else {
          const base = {
            id: uid('p'),
            name: input.name,
            niche: input.niche ?? 'unha',
            headline: input.bio || 'Novo perfil',
            city: input.city || 'São Paulo',
            neighborhood: input.neighborhood || '',
            distanceKm: 0.5,
            rating: 5,
            reviews: 0,
            avatar: '#E8DCF2',
            photo: input.photo,
            cover: input.cover,
            phone: input.phone,
            email: input.email,
            portfolio: [],
            pixKey: input.pixKey || '',
            depositDeadlineHours: 12,
            loyalty: { enabled: false, goalAmount: 500, discountPercent: 10 },
            workHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
          };
          const p: Professional = {
            ...base,
            widgets: mock.defaultWidgets({ ...base, name: input.studio || input.name }).map((w) =>
              w.type === 'capa' ? { ...w, image: input.cover } : w,
            ),
          };
          dispatch({ type: 'set', patch: { professionals: [...stateRef.current.professionals, p], proId: p.id, role: 'profissional' } });
        }
      },

      /**
       * Aplica a resposta do GET /me (API real) ao estado: cria/atualiza a cliente e/ou a profissional
       * e escolhe o papel. As demais telas continuam com dados de exemplo até os próximos módulos.
       */
      applyMe(me: Me, prefer?: Role): Role | null {
        const roles = me.roles ?? [];
        let clients = stateRef.current.clients;
        let professionals = stateRef.current.professionals;
        let clientId = stateRef.current.clientId;
        let proId = stateRef.current.proId;
        if (me.client) {
          const id = me.accountId!;
          const existing = clients.find((c) => c.id === id);
          const c: Client = {
            ...(existing ?? { avatar: '#E8DCF2', favorites: [], dreams: [] }),
            id,
            name: me.client.name ?? '',
            phone: me.phone ?? '',
            email: me.email,
            bio: me.client.bio,
            photo: me.client.photoUrl,
            cover: me.client.coverUrl,
            favorites: (me.favorites as string[] | undefined) ?? existing?.favorites ?? [],
          };
          clients = existing ? clients.map((x) => (x.id === id ? c : x)) : [...clients, c];
          clientId = id;
        }
        if (me.professional) {
          const ap = me.professional;
          const id = ap.id!;
          const existing = professionals.find((p) => p.id === id);
          const base = existing ?? {
            id,
            rating: 5,
            reviews: 0,
            distanceKm: 0.5,
            avatar: '#E8DCF2',
            portfolio: [],
            loyalty: { enabled: false, goalAmount: 500, discountPercent: 10 },
            workHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
            widgets: [],
          };
          const p: Professional = {
            ...base,
            name: ap.studio ?? ap.name ?? '',
            ownerName: ap.name,
            niche: (ap.niche?.toLowerCase() ?? 'unha') as Professional['niche'],
            headline: ap.bio ?? '',
            city: ap.city ?? '',
            neighborhood: ap.neighborhood ?? '',
            photo: ap.photoUrl,
            cover: ap.coverUrl,
            phone: me.phone,
            email: me.email,
            pixKey: ap.pixKey ?? '',
            depositDeadlineHours: ap.depositDeadlineHours ?? 12,
            latitude: ap.latitude,
            longitude: ap.longitude,
            remote: true,
          };
          if (!p.widgets.length) {
            p.widgets = mock.defaultWidgets(p).map((w) => (w.type === 'capa' ? { ...w, image: ap.coverUrl } : w));
          }
          professionals = existing ? professionals.map((x) => (x.id === id ? p : x)) : [...professionals, p];
          proId = id;
        }
        const role: Role | null =
          prefer === 'profissional' && me.professional ? 'profissional'
          : prefer === 'cliente' && me.client ? 'cliente'
          : roles.includes('PROFESSIONAL') ? 'profissional'
          : roles.includes('CLIENT') ? 'cliente'
          : null;
        dispatch({ type: 'set', patch: { clients, professionals, clientId, proId, role } });
        return role;
      },

      /**
       * Junta dados vindos da API. replaceServicesOf/replaceDesignsOf: substitui o catálogo daquela profissional
       * (o que foi apagado no servidor some do app).
       */
      mergeRemote(input: {
        professionals?: Professional[];
        services?: Service[];
        designs?: Design[];
        replaceServicesOf?: string;
        replaceDesignsOf?: string;
        widgetsOf?: { professionalId: string; widgets: Widget[] };
      }) {
        let professionals = stateRef.current.professionals;
        for (const p of input.professionals ?? []) {
          professionals = professionals.some((x) => x.id === p.id) ? professionals.map((x) => (x.id === p.id ? p : x)) : [...professionals, p];
        }
        if (input.widgetsOf) {
          const { professionalId, widgets } = input.widgetsOf;
          professionals = professionals.map((p) => (p.id === professionalId ? { ...p, widgets } : p));
        }
        let services = stateRef.current.services;
        if (input.replaceServicesOf) services = services.filter((x) => x.professionalId !== input.replaceServicesOf);
        for (const sv of input.services ?? []) {
          services = services.some((x) => x.id === sv.id) ? services.map((x) => (x.id === sv.id ? sv : x)) : [...services, sv];
        }
        let designs = stateRef.current.designs;
        if (input.replaceDesignsOf) designs = designs.filter((x) => x.professionalId !== input.replaceDesignsOf);
        for (const d of input.designs ?? []) {
          designs = designs.some((x) => x.id === d.id) ? designs.map((x) => (x.id === d.id ? d : x)) : [...designs, d];
        }
        dispatch({ type: 'set', patch: { professionals, services, designs } });
      },

      /** Agendamentos vindos da API (+ cliente e profissional de cada um). */
      mergeAppointments(views: AppointmentApiView[]) {
        const incoming = views.map(appointmentFromApi);
        const { clients: cl, pros } = partiesFromApi(views);
        let clients = stateRef.current.clients;
        for (const c of cl) {
          const ex = clients.find((x) => x.id === c.id);
          // não sobrescreve o próprio perfil (favoritas, próximos procedimentos…)
          clients = ex ? clients.map((x) => (x.id === c.id ? { ...x, name: c.name || x.name, photo: c.photo ?? x.photo, phone: c.phone || x.phone } : x)) : [...clients, c];
        }
        let professionals = stateRef.current.professionals;
        for (const p of pros) {
          const ex = professionals.find((x) => x.id === p.id);
          const merged = ex
            ? { ...ex, pixKey: p.pixKey || ex.pixKey, photo: p.photo ?? ex.photo }
            : { ...professionalFromCard({ id: p.id, studio: p.name, photoUrl: p.photo, neighborhood: p.neighborhood, city: p.city }), pixKey: p.pixKey ?? '' };
          professionals = ex ? professionals.map((x) => (x.id === p.id ? merged : x)) : [...professionals, merged];
        }
        // serviço mínimo para agendamentos cujo serviço ainda não foi carregado (lista da cliente, home…)
        let services = stateRef.current.services;
        for (const a of incoming) {
          if (services.some((x) => x.id === a.serviceId)) continue;
          services = [...services, {
            id: a.serviceId,
            professionalId: a.professionalId,
            name: a.serviceName ?? 'Serviço',
            niche: professionals.find((p) => p.id === a.professionalId)?.niche ?? 'unha',
            durationMin: a.durationMin ?? 60,
            price: a.price,
            depositPercent: 0,
            returnIntervalDays: a.returnIntervalDays ?? 0,
            options: [],
            consumption: [],
          }];
        }
        let appointments = stateRef.current.appointments;
        for (const a of incoming) {
          appointments = appointments.some((x) => x.id === a.id) ? appointments.map((x) => (x.id === a.id ? a : x)) : [...appointments, a];
        }
        dispatch({ type: 'set', patch: { appointments, clients, professionals, services } });
        return incoming;
      },

      setWorkDays(professionalId: string, days: WorkDay[]) {
        dispatch({
          type: 'set',
          patch: {
            professionals: stateRef.current.professionals.map((p) =>
              p.id === professionalId ? { ...p, workDays: days, workHours: workHoursSummary(days) } : p,
            ),
          },
        });
      },

      /** Estoque da profissional vindo da API (substitui o local). */
      setRemoteStock(input: { products: Product[]; movements: StockMovement[]; consumption: { serviceId?: string; productId?: string; amount?: number }[] }) {
        const proId = stateRef.current.proId;
        const mineOld = new Set(Object.entries(stateRef.current.productOwner).filter(([, owner]) => owner === proId).map(([id]) => id));
        const products = [...stateRef.current.products.filter((p) => !mineOld.has(p.id)), ...input.products];
        const productOwner = { ...stateRef.current.productOwner };
        mineOld.forEach((id) => delete productOwner[id]);
        input.products.forEach((p) => { productOwner[p.id] = proId; });
        const mineNew = new Set(input.products.map((p) => p.id));
        const movements = [...stateRef.current.movements.filter((m) => !mineOld.has(m.productId) && !mineNew.has(m.productId)), ...[...input.movements].reverse()];
        const services = stateRef.current.services.map((sv) =>
          sv.professionalId !== proId
            ? sv
            : { ...sv, consumption: input.consumption.filter((c) => c.serviceId === sv.id).map((c) => ({ productId: c.productId!, amount: c.amount ?? 0 })) },
        );
        dispatch({ type: 'set', patch: { products, productOwner, movements, services } });
      },

      /** Cartões fidelidade, vouchers e avaliações da cliente vindos da API. */
      setRemoteClientData(input: { cards?: LoyaltyCard[]; vouchers?: Voucher[]; reviews?: { appointmentId?: string; professionalId?: string; rating?: number; comment?: string }[] }) {
        const patch: Partial<State> = {};
        if (input.cards) patch.loyaltyCards = input.cards;
        if (input.vouchers) patch.vouchers = [...stateRef.current.vouchers.filter((v) => v.clientId !== stateRef.current.clientId), ...input.vouchers];
        if (input.reviews) {
          const mine: Feedback[] = input.reviews.map((r) => ({
            id: `rv_${r.appointmentId}`,
            appointmentId: r.appointmentId!,
            clientId: stateRef.current.clientId,
            professionalId: r.professionalId!,
            rating: r.rating ?? 5,
            comment: r.comment ?? '',
            createdAt: new Date().toISOString(),
          }));
          patch.feedbacks = [...stateRef.current.feedbacks.filter((f) => !mine.some((m) => m.appointmentId === f.appointmentId)), ...mine];
        }
        dispatch({ type: 'set', patch });
      },

      /** Nota e depoimentos públicos de uma profissional (página pública). */
      setProfessionalReviews(professionalId: string, average: number, count: number, reviews: Feedback[]) {
        dispatch({
          type: 'set',
          patch: {
            professionals: stateRef.current.professionals.map((p) => (p.id === professionalId ? { ...p, rating: average || 5, reviews: count } : p)),
            // troca os depoimentos públicos dessa profissional (os públicos têm clientName)
            feedbacks: [...stateRef.current.feedbacks.filter((f) => !(f.professionalId === professionalId && f.clientName !== undefined)), ...reviews],
          },
        });
      },

      /** Stories ativos vindos da API (substituem os de exemplo) + profissionais marcadas. */
      setRemoteStories(stories: Story[]) {
        let professionals = stateRef.current.professionals;
        for (const st of stories) {
          if (professionals.some((p) => p.id === st.professionalId)) continue;
          professionals = [...professionals, professionalFromCard({ id: st.professionalId, studio: st.professionalStudio })];
        }
        dispatch({ type: 'set', patch: { stories, professionals } });
      },

      setMessages(appointmentId: string, list: ChatMessage[]) {
        dispatch({
          type: 'set',
          patch: { messages: [...stateRef.current.messages.filter((m) => m.appointmentId !== appointmentId), ...list] },
        });
      },

      setUnread(unread: number) {
        if (unread !== stateRef.current.unread) dispatch({ type: 'set', patch: { unread } });
      },

      removeServiceLocal(id: string) {
        dispatch({ type: 'set', patch: { services: stateRef.current.services.filter((x) => x.id !== id) } });
      },

      /** Edita o perfil de quem está logada (capa, foto, nome, bio). */
      updateMe(patch: { name?: string; photo?: string; cover?: string; bio?: string; email?: string }) {
        if (stateRef.current.role === 'profissional') {
          const { bio, ...rest } = patch;
          dispatch({
            type: 'set',
            patch: {
              professionals: stateRef.current.professionals.map((p) =>
                p.id === stateRef.current.proId ? { ...p, ...rest, ...(bio != null ? { headline: bio } : {}) } : p,
              ),
            },
          });
        } else {
          dispatch({
            type: 'set',
            patch: { clients: stateRef.current.clients.map((c) => (c.id === stateRef.current.clientId ? { ...c, ...patch } : c)) },
          });
        }
      },

      newId: uid,
    };
  }, [stateRef, dispatch]);
}

type Ctx = State & ReturnType<typeof useActions>;
const StoreContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const stateRef = useRef(initial);
  // dispatch síncrono: o ref já reflete a mudança antes do próximo comando
  const dispatch = useCallback((action: Action) => {
    stateRef.current = reducer(stateRef.current, action);
    setState(stateRef.current);
  }, []);
  const actions = useActions(stateRef, dispatch);

  // Política de cancelamento: verifica a cada 30s se algum sinal venceu.
  useEffect(() => {
    const tick = () => {
      state.appointments.filter((a) => !a.remote && isDepositExpired(a)).forEach((a) =>
        dispatch({ type: 'patchAppointment', id: a.id, patch: { status: 'expirado' } }),
      );
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [state.appointments]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fora do AppStoreProvider');
  return ctx;
}

/** Atalhos derivados usados em várias telas. */
export function useLookup() {
  const s = useStore();
  return useMemo(
    () => ({
      service: (id: string) => s.services.find((x) => x.id === id)!,
      pro: (id: string) => s.professionals.find((x) => x.id === id)!,
      client: (id: string) => s.clients.find((x) => x.id === id)!,
      appointment: (id: string) => s.appointments.find((x) => x.id === id),
      product: (id: string) => s.products.find((x) => x.id === id),
      me: s.clients.find((x) => x.id === s.clientId)!,
      myPro: s.professionals.find((x) => x.id === s.proId)!,
      myProducts: s.products.filter((p) => s.productOwner[p.id] === s.proId),
      myServices: s.services.filter((x) => x.professionalId === s.proId),
      /** Progresso do cartão fidelidade: do servidor quando houver, senão calculado no app (protótipo). */
      loyalty: (professionalId: string) => {
        const pro = s.professionals.find((x) => x.id === professionalId);
        const card = s.loyaltyCards.find((c) => c.professionalId === professionalId);
        if (card) return { ...card, inCycle: card.inCycle, remaining: card.remaining };
        const program = pro?.loyalty ?? { enabled: false, goalAmount: 500, discountPercent: 10 };
        const lp = loyaltyProgress(s.appointments, s.clientId, professionalId, program);
        return { professionalId, enabled: program.enabled, goal: program.goalAmount, discountPercent: program.discountPercent, ...lp };
      },
    }),
    [s],
  );
}
