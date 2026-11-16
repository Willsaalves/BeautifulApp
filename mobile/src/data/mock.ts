// Dados de exemplo enquanto o backend não existe. Datas relativas a "agora".
import type { Appointment, Client, Feedback, Product, Professional, Service, Voucher } from '@/domain/types';

const now = new Date();
const at = (days: number, h: number, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const ME_CLIENT_ID = 'c1';
export const ME_PRO_ID = 'p1';

export const professionals: Professional[] = [
  {
    id: 'p1',
    name: 'Camila Rocha',
    niche: 'unha',
    headline: 'Alongamento em gel e nail art',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    distanceKm: 1.2,
    rating: 4.9,
    reviews: 128,
    avatar: '#CDBCE7',
    portfolio: ['💅', '✨', '🌸', '💎', '🤍', '🦋'],
    pixKey: 'camila.nails@pix.com',
    depositDeadlineHours: 12,
    loyalty: { enabled: true, goalAmount: 500, discountPercent: 15 },
    workHours: { start: '09:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] },
  },
  {
    id: 'p2',
    name: 'Dra. Larissa Mendes',
    niche: 'estetica',
    headline: 'Botox, preenchimento labial e bioestimuladores',
    city: 'São Paulo',
    neighborhood: 'Jardins',
    distanceKm: 3.4,
    rating: 5.0,
    reviews: 86,
    avatar: '#E7E3E4',
    portfolio: ['💉', '👄', '✨', '🤍'],
    pixKey: '12.345.678/0001-90',
    depositDeadlineHours: 24,
    loyalty: { enabled: true, goalAmount: 3000, discountPercent: 10 },
    workHours: { start: '10:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  },
  {
    id: 'p3',
    name: 'Jéssica Lash',
    niche: 'cilios',
    headline: 'Volume russo e fio a fio',
    city: 'São Paulo',
    neighborhood: 'Vila Madalena',
    distanceKm: 2.1,
    rating: 4.8,
    reviews: 203,
    avatar: '#F6EEDD',
    portfolio: ['👁️', '🖤', '✨', '🤍'],
    pixKey: '(11) 98888-7777',
    depositDeadlineHours: 6,
    loyalty: { enabled: true, goalAmount: 400, discountPercent: 20 },
    workHours: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
  },
  {
    id: 'p4',
    name: 'Bia Brows',
    niche: 'sobrancelha',
    headline: 'Design, henna e brow lamination',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    distanceKm: 0.8,
    rating: 4.7,
    reviews: 64,
    avatar: '#EFE8F7',
    portfolio: ['✨', '🤎', '🌿'],
    pixKey: 'bia@brows.com',
    depositDeadlineHours: 12,
    loyalty: { enabled: false, goalAmount: 300, discountPercent: 10 },
    workHours: { start: '09:00', end: '17:00', days: [2, 3, 4, 5, 6] },
  },
];

export const products: Product[] = [
  { id: 'pr1', name: 'Gel construtor', unit: 'g', quantity: 42, minQuantity: 15 },
  { id: 'pr2', name: 'Tips de alongamento', unit: 'un', quantity: 180, minQuantity: 50 },
  { id: 'pr3', name: 'Lixa descartável', unit: 'un', quantity: 18, minQuantity: 20 },
  { id: 'pr4', name: 'Pincel de sobrancelha', unit: 'un', quantity: 150, minQuantity: 20 },
  { id: 'pr5', name: 'Esmalte em gel', unit: 'ml', quantity: 120, minQuantity: 30 },
  // estética (p2)
  { id: 'pr6', name: 'Ácido hialurônico', unit: 'ml', quantity: 7, minQuantity: 4, lot: 'HA-2291', expiresAt: at(180, 0) },
  { id: 'pr7', name: 'Toxina botulínica (U)', unit: 'un', quantity: 300, minQuantity: 100, lot: 'TB-0912', expiresAt: at(90, 0) },
];

/** Estoque por profissional (cada uma vê só o seu). */
export const productOwner: Record<string, string> = {
  pr1: 'p1', pr2: 'p1', pr3: 'p1', pr4: 'p1', pr5: 'p1', pr6: 'p2', pr7: 'p2',
};

export const services: Service[] = [
  {
    id: 's1',
    professionalId: 'p1',
    name: 'Alongamento em gel',
    niche: 'unha',
    durationMin: 150,
    price: 180,
    depositPercent: 30,
    returnIntervalDays: 21,
    requiresReference: true,
    options: [
      {
        id: 'formato',
        label: 'Formato',
        choices: [
          { id: 'quadrada', label: 'Quadrada', priceDelta: 0 },
          { id: 'amendoada', label: 'Amendoada', priceDelta: 0 },
          { id: 'stiletto', label: 'Stiletto', priceDelta: 20 },
          { id: 'bailarina', label: 'Bailarina', priceDelta: 10 },
        ],
      },
      {
        id: 'tamanho',
        label: 'Tamanho',
        choices: [
          { id: 'curto', label: 'Curto', priceDelta: 0 },
          { id: 'medio', label: 'Médio', priceDelta: 15 },
          { id: 'longo', label: 'Longo', priceDelta: 30 },
        ],
      },
      {
        id: 'decoracao',
        label: 'Decoração',
        choices: [
          { id: 'nenhuma', label: 'Sem decoração', priceDelta: 0 },
          { id: 'simples', label: 'Simples', priceDelta: 25 },
          { id: 'elaborada', label: 'Elaborada', priceDelta: 60 },
        ],
      },
    ],
    consumption: [
      { productId: 'pr1', amount: 6 },
      { productId: 'pr2', amount: 10 },
      { productId: 'pr3', amount: 1 },
      { productId: 'pr5', amount: 2 },
    ],
  },
  {
    id: 's2',
    professionalId: 'p1',
    name: 'Manutenção de gel',
    niche: 'unha',
    durationMin: 90,
    price: 120,
    depositPercent: 30,
    returnIntervalDays: 21,
    options: [],
    consumption: [
      { productId: 'pr1', amount: 3 },
      { productId: 'pr3', amount: 1 },
      { productId: 'pr5', amount: 1 },
    ],
  },
  {
    id: 's3',
    professionalId: 'p1',
    name: 'Design de sobrancelha',
    niche: 'sobrancelha',
    durationMin: 45,
    price: 60,
    depositPercent: 50,
    returnIntervalDays: 20,
    options: [],
    consumption: [{ productId: 'pr4', amount: 1 }],
  },
  {
    id: 's4',
    professionalId: 'p2',
    name: 'Preenchimento labial 2ml',
    niche: 'estetica',
    durationMin: 60,
    price: 1800,
    depositPercent: 20,
    returnIntervalDays: 270,
    options: [],
    consumption: [{ productId: 'pr6', amount: 2 }],
  },
  {
    id: 's5',
    professionalId: 'p2',
    name: 'Botox full face',
    niche: 'estetica',
    durationMin: 45,
    price: 1400,
    depositPercent: 20,
    returnIntervalDays: 120,
    options: [],
    consumption: [{ productId: 'pr7', amount: 50 }],
  },
  {
    id: 's6',
    professionalId: 'p3',
    name: 'Volume russo',
    niche: 'cilios',
    durationMin: 120,
    price: 220,
    depositPercent: 30,
    returnIntervalDays: 15,
    options: [
      {
        id: 'curvatura',
        label: 'Curvatura',
        choices: [
          { id: 'c', label: 'C', priceDelta: 0 },
          { id: 'd', label: 'D', priceDelta: 0 },
        ],
      },
    ],
    consumption: [],
  },
  {
    id: 's7',
    professionalId: 'p4',
    name: 'Brow lamination',
    niche: 'sobrancelha',
    durationMin: 60,
    price: 150,
    depositPercent: 30,
    returnIntervalDays: 45,
    options: [],
    consumption: [],
  },
];

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Bruna',
    phone: '(11) 99999-0000',
    avatar: '#CDBCE7',
    favorites: ['p1', 'p2'],
    dreams: [
      { id: 'd1', niche: 'unha', label: 'Unhas stiletto longas', targetDate: at(20, 0), done: true },
      { id: 'd2', niche: 'cilios', label: 'Cílios volume russo', targetDate: at(30, 0), done: false },
      { id: 'd3', niche: 'estetica', label: 'Criolipólise', targetDate: at(90, 0), done: false },
    ],
  },
  { id: 'c2', name: 'Ana Paula', phone: '(11) 98888-1111', avatar: '#F6EEDD', favorites: ['p1'], dreams: [] },
  { id: 'c3', name: 'Mariana Lopes', phone: '(11) 97777-2222', avatar: '#E7E3E4', favorites: [], dreams: [] },
  { id: 'c4', name: 'Juliana Souza', phone: '(11) 96666-3333', avatar: '#EFE8F7', favorites: ['p1'], dreams: [] },
  { id: 'c5', name: 'Fernanda Lima', phone: '(11) 95555-4444', avatar: '#CDBCE7', favorites: [], dreams: [] },
];

const appt = (a: Partial<Appointment> & Pick<Appointment, 'id' | 'clientId' | 'professionalId' | 'serviceId' | 'startsAt' | 'price' | 'status'>): Appointment => ({
  selections: {},
  depositAmount: Math.round(a.price * 0.3),
  depositDueAt: a.startsAt,
  createdAt: at(-1, 10),
  ...a,
});

export const appointments: Appointment[] = [
  // histórico da Bruna
  appt({ id: 'a1', clientId: 'c1', professionalId: 'p2', serviceId: 's5', startsAt: at(-112, 15), price: 1400, status: 'concluido' }),
  appt({ id: 'a2', clientId: 'c1', professionalId: 'p1', serviceId: 's1', startsAt: at(-40, 14), price: 225, status: 'concluido' }),
  appt({ id: 'a3', clientId: 'c1', professionalId: 'p1', serviceId: 's2', startsAt: at(-18, 14), price: 120, status: 'concluido' }),
  // próximo horário da Bruna (aguardando sinal)
  appt({
    id: 'a4', clientId: 'c1', professionalId: 'p1', serviceId: 's1', startsAt: at(3, 10), price: 230, status: 'aguardando_sinal',
    depositAmount: 69, depositDueAt: new Date(now.getTime() + 5 * 3600_000).toISOString(), createdAt: new Date().toISOString(),
    selections: { formato: 'stiletto', tamanho: 'medio', decoracao: 'simples' },
  }),
  // agenda de hoje da Camila
  appt({ id: 'a5', clientId: 'c2', professionalId: 'p1', serviceId: 's2', startsAt: at(0, 9), price: 120, status: 'confirmado', receiptImage: 'ok' }),
  appt({ id: 'a6', clientId: 'c3', professionalId: 'p1', serviceId: 's1', startsAt: at(0, 13), price: 195, status: 'sinal_enviado', receiptImage: 'comprovante' }),
  appt({ id: 'a7', clientId: 'c4', professionalId: 'p1', serviceId: 's3', startsAt: at(0, 17), price: 60, status: 'confirmado', receiptImage: 'ok' }),
  appt({ id: 'a8', clientId: 'c5', professionalId: 'p1', serviceId: 's1', startsAt: at(1, 11), price: 180, status: 'aguardando_sinal', depositAmount: 54, depositDueAt: new Date(now.getTime() + 2 * 3600_000).toISOString() }),
  // histórico para clientes atrasadas
  appt({ id: 'a9', clientId: 'c5', professionalId: 'p1', serviceId: 's2', startsAt: at(-35, 10), price: 120, status: 'concluido' }),
  appt({ id: 'a10', clientId: 'c2', professionalId: 'p1', serviceId: 's1', startsAt: at(-26, 10), price: 210, status: 'concluido' }),
  // faturamento do mês
  appt({ id: 'a12', clientId: 'c4', professionalId: 'p1', serviceId: 's1', startsAt: at(-4, 10), price: 240, status: 'concluido' }),
  appt({ id: 'a13', clientId: 'c2', professionalId: 'p1', serviceId: 's3', startsAt: at(-8, 15), price: 60, status: 'concluido' }),
  appt({ id: 'a11', clientId: 'c3', professionalId: 'p1', serviceId: 's3', startsAt: at(-30, 16), price: 60, status: 'concluido' }),
];

export const feedbacks: Feedback[] = [
  { id: 'f1', appointmentId: 'a2', clientId: 'c1', professionalId: 'p1', rating: 5, comment: 'Perfeitas, duraram muito!', createdAt: at(-39, 12) },
];

export const vouchers: Voucher[] = [];
