// Estado global em memória. Quando o backend existir, cada ação vira uma chamada de API
// (mantendo as mesmas assinaturas) e este reducer passa a refletir as respostas.
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import type { Me } from '@/api/client';
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
  Product,
  Professional,
  Service,
  StockMovement,
  Story,
  Voucher,
  Widget,
  WidgetType,
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

function useActions(state: State, dispatch: React.Dispatch<Action>) {
  return useMemo(() => {
    const svc = (id: string) => state.services.find((s) => s.id === id)!;
    const pro = (id: string) => state.professionals.find((p) => p.id === id)!;
    const appt = (id: string) => state.appointments.find((a) => a.id === id)!;

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
        const design = state.designs.find((d) => d.id === input.designId);
        const price = computePrice(service, input.selections, design?.priceDelta ?? 0);
        let discountApplied = 0;
        const voucher = state.vouchers.find((v) => v.id === input.voucherId && !v.used);
        if (voucher) {
          discountApplied = Math.round(price * voucher.percent) / 100;
          dispatch({
            type: 'set',
            patch: { vouchers: state.vouchers.map((v) => (v.id === voucher.id ? { ...v, used: true } : v)) },
          });
        }
        const deposit = computeDeposit(price - discountApplied, service.depositPercent);
        const a: Appointment = {
          id: uid('a'),
          clientId: state.clientId,
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
        const earned = canEarnFeedbackVoucher(state.vouchers, a.clientId);
        const vouchers = earned
          ? [
              ...state.vouchers,
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
          : state.vouchers;
        dispatch({ type: 'set', patch: { feedbacks: [...state.feedbacks, fb], vouchers } });
        return earned;
      },

      toggleFavorite(proId: string) {
        dispatch({
          type: 'set',
          patch: {
            clients: state.clients.map((c) =>
              c.id !== state.clientId
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
          patch: { clients: state.clients.map((c) => (c.id === state.clientId ? { ...c, dreams } : c)) },
        });
      },

      sendMessage(appointmentId: string, from: ChatMessage['from'], text: string) {
        dispatch({
          type: 'set',
          patch: {
            messages: [
              ...state.messages,
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
        const own = state.products.filter((x) => state.productOwner[x.id] === p.id);
        const { products: consumed, movements } = consumeStock(own, service, id);
        const products = state.products.map((x) => consumed.find((c) => c.id === x.id) ?? x);

        const before = loyaltyProgress(state.appointments, a.clientId, p.id, p.loyalty);
        const nextAppts = state.appointments.map((x) => (x.id === id ? { ...x, status: 'concluido' as const } : x));
        const after = loyaltyProgress(nextAppts, a.clientId, p.id, p.loyalty);
        const reached = p.loyalty.enabled && after.cycles > before.cycles;
        const vouchers = reached
          ? [
              ...state.vouchers,
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
          : state.vouchers;

        dispatch({
          type: 'set',
          patch: { appointments: nextAppts, products, movements: [...state.movements, ...movements], vouchers },
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
        let products = state.products;
        let productOwner = state.productOwner;
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
          productOwner = { ...productOwner, [productId]: state.proId };
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
        dispatch({ type: 'set', patch: { products, productOwner, movements: [...state.movements, mv] } });
      },

      updateProduct(id: string, patch: Partial<Product>) {
        dispatch({ type: 'set', patch: { products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) } });
      },

      upsertService(service: Service) {
        const exists = state.services.some((s) => s.id === service.id);
        dispatch({
          type: 'set',
          patch: {
            services: exists
              ? state.services.map((s) => (s.id === service.id ? service : s))
              : [...state.services, service],
          },
        });
      },

      updateProfessional(patch: Partial<Professional>) {
        dispatch({
          type: 'set',
          patch: { professionals: state.professionals.map((p) => (p.id === state.proId ? { ...p, ...patch } : p)) },
        });
      },

      // ---------- Página (widgets) ----------
      addWidget(type: WidgetType) {
        const me = pro(state.proId);
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
        const w: Widget = { id: uid('w'), type, ...defaults[type] };
        // entra logo depois da capa
        const ws = [...me.widgets];
        const capaIdx = ws.findIndex((x) => x.type === 'capa');
        ws.splice(capaIdx + 1, 0, w);
        dispatch({ type: 'set', patch: { professionals: state.professionals.map((p) => (p.id === me.id ? { ...p, widgets: ws } : p)) } });
        return w.id;
      },
      updateWidget(id: string, patch: Partial<Widget>) {
        dispatch({
          type: 'set',
          patch: {
            professionals: state.professionals.map((p) =>
              p.id === state.proId ? { ...p, widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) } : p,
            ),
          },
        });
      },
      removeWidget(id: string) {
        dispatch({
          type: 'set',
          patch: {
            professionals: state.professionals.map((p) =>
              p.id === state.proId ? { ...p, widgets: p.widgets.filter((w) => w.id !== id || w.fixed) } : p,
            ),
          },
        });
      },
      moveWidget(id: string, dir: -1 | 1) {
        const me = pro(state.proId);
        const ws = [...me.widgets];
        const i = ws.findIndex((w) => w.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ws.length) return;
        [ws[i], ws[j]] = [ws[j], ws[i]];
        dispatch({ type: 'set', patch: { professionals: state.professionals.map((p) => (p.id === me.id ? { ...p, widgets: ws } : p)) } });
      },

      // ---------- Trending Designs ----------
      upsertDesign(d: Design) {
        const exists = state.designs.some((x) => x.id === d.id);
        dispatch({
          type: 'set',
          patch: { designs: exists ? state.designs.map((x) => (x.id === d.id ? d : x)) : [...state.designs, d] },
        });
      },
      removeDesign(id: string) {
        dispatch({ type: 'set', patch: { designs: state.designs.filter((x) => x.id !== id) } });
      },

      // ---------- Stories ----------
      postStory(input: Omit<Story, 'id' | 'createdAt' | 'authorType' | 'authorId'>) {
        const isPro = state.role === 'profissional';
        const st: Story = {
          ...input,
          id: uid('st'),
          authorType: isPro ? 'profissional' : 'cliente',
          authorId: isPro ? state.proId : state.clientId,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'set', patch: { stories: [st, ...state.stories] } });
        return st.id;
      },

      // ---------- Conta ----------
      /** Login por telefone (mock do OTP). Devolve o papel encontrado ou null se não houver conta. */
      login(phone: string): Role | null {
        const digits = (x?: string) => (x ?? '').replace(/\D/g, '');
        const c = state.clients.find((x) => digits(x.phone) === digits(phone));
        if (c) {
          dispatch({ type: 'set', patch: { role: 'cliente', clientId: c.id } });
          return 'cliente';
        }
        const p = state.professionals.find((x) => digits(x.phone) === digits(phone));
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
          dispatch({ type: 'set', patch: { clients: [...state.clients, c], clientId: c.id, role: 'cliente' } });
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
          dispatch({ type: 'set', patch: { professionals: [...state.professionals, p], proId: p.id, role: 'profissional' } });
        }
      },

      /**
       * Aplica a resposta do GET /me (API real) ao estado: cria/atualiza a cliente e/ou a profissional
       * e escolhe o papel. As demais telas continuam com dados de exemplo até os próximos módulos.
       */
      applyMe(me: Me, prefer?: Role): Role | null {
        const roles = me.roles ?? [];
        let clients = state.clients;
        let professionals = state.professionals;
        let clientId = state.clientId;
        let proId = state.proId;
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

      /** Edita o perfil de quem está logada (capa, foto, nome, bio). */
      updateMe(patch: { name?: string; photo?: string; cover?: string; bio?: string; email?: string }) {
        if (state.role === 'profissional') {
          const { bio, ...rest } = patch;
          dispatch({
            type: 'set',
            patch: {
              professionals: state.professionals.map((p) =>
                p.id === state.proId ? { ...p, ...rest, ...(bio != null ? { headline: bio } : {}) } : p,
              ),
            },
          });
        } else {
          dispatch({
            type: 'set',
            patch: { clients: state.clients.map((c) => (c.id === state.clientId ? { ...c, ...patch } : c)) },
          });
        }
      },

      newId: uid,
    };
  }, [state, dispatch]);
}

type Ctx = State & ReturnType<typeof useActions>;
const StoreContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const actions = useActions(state, dispatch);

  // Política de cancelamento: verifica a cada 30s se algum sinal venceu.
  useEffect(() => {
    const tick = () => {
      state.appointments.filter((a) => isDepositExpired(a)).forEach((a) =>
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
    }),
    [s],
  );
}
