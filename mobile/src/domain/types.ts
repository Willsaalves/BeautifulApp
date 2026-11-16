// Tipos de domínio — pensados para serem compartilhados com o backend depois.

export type Niche = 'unha' | 'cilios' | 'sobrancelha' | 'estetica' | 'cabelo' | 'depilacao';

export type Unit = 'un' | 'ml' | 'g';

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  quantity: number;      // saldo atual em estoque
  minQuantity: number;   // abaixo disso: alerta de recompra
  unitCost?: number;     // custo médio por unidade (para lucratividade)
  lot?: string;
  expiresAt?: string;    // ISO
}

export interface StockMovement {
  id: string;
  productId: string;
  delta: number;         // + compra / - consumo
  reason: 'compra' | 'atendimento' | 'ajuste';
  appointmentId?: string;
  unitCost?: number;     // custo unitário na compra
  createdAt: string;
}

export interface ServiceOption {
  id: string;
  label: string;                 // ex: "Formato"
  choices: { id: string; label: string; priceDelta: number }[];
}

export interface Consumption {
  productId: string;
  amount: number;                // ex: 2 (ml) de ácido, 1 (un) pincel
}

export interface Service {
  id: string;
  professionalId: string;
  name: string;
  niche: Niche;
  durationMin: number;
  price: number;                 // preço base
  depositPercent: number;        // % de sinal
  returnIntervalDays: number;    // intervalo de manutenção sugerido
  options: ServiceOption[];
  consumption: Consumption[];    // baixa automática no estoque
  requiresReference?: boolean;   // pede foto de referência
}

export interface Professional {
  id: string;
  name: string;
  niche: Niche;
  headline: string;
  city: string;
  neighborhood: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  avatar: string;
  photo?: string;
  cover?: string;
  phone?: string;
  email?: string;
  portfolio: string[];
  pixKey: string;
  depositDeadlineHours: number;  // prazo para pagar o sinal
  loyalty: LoyaltyProgram;
  workHours: { start: string; end: string; days: number[] }; // 0=dom
  widgets: Widget[];
}

export interface LoyaltyProgram {
  enabled: boolean;
  goalAmount: number;            // valor a ser gasto até o desconto
  discountPercent: number;
}

export type AppointmentStatus =
  | 'aguardando_sinal'   // criado, cliente precisa pagar o Pix
  | 'sinal_enviado'      // comprovante anexado, profissional confere
  | 'confirmado'
  | 'ajuste_pendente'    // profissional propôs novo valor, cliente aceita
  | 'concluido'
  | 'cancelado'
  | 'expirado';          // perdeu o horário por não pagar o sinal

export interface PriceAdjustment {
  newPrice: number;
  note: string;
  status: 'pendente' | 'aceito' | 'recusado';
}

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  startsAt: string;                       // ISO
  selections: Record<string, string>;     // optionId -> choiceId
  referenceImage?: string;
  designId?: string;
  notes?: string;
  price: number;
  depositAmount: number;
  depositDueAt: string;                   // ISO
  receiptImage?: string;                  // comprovante Pix (obrigatório)
  status: AppointmentStatus;
  adjustment?: PriceAdjustment;
  discountApplied?: number;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  avatar: string;               // cor de fundo quando não há foto
  photo?: string;               // foto de perfil
  cover?: string;               // capa (estilo Twitter)
  bio?: string;
  email?: string;
  favorites: string[];          // professionalIds
  dreams: Dream[];
}

export interface Dream {
  id: string;
  niche: Niche;
  label: string;
  targetDate: string;           // ISO
  done: boolean;
}

export interface Feedback {
  id: string;
  appointmentId: string;
  clientId: string;
  professionalId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Voucher {
  id: string;
  clientId: string;
  professionalId?: string;      // undefined = voucher do app
  kind: 'fidelidade' | 'feedback';
  percent: number;
  label: string;
  used: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  appointmentId: string;
  from: 'cliente' | 'profissional';
  text: string;
  createdAt: string;
}

// ---------- Página personalizável (widgets) ----------
export type WidgetType =
  | 'capa'
  | 'galeria'
  | 'porcentagem'
  | 'contagem'
  | 'texto'
  | 'trending'
  | 'fidelidade'
  | 'avaliacoes'
  | 'servicos'   // fixo
  | 'agenda';    // fixo

export interface Widget {
  id: string;
  type: WidgetType;
  fixed?: boolean;               // itens padrão do app: não podem ser removidos
  title?: string;
  subtitle?: string;
  color?: string;
  image?: string;                // capa
  images?: string[];             // galeria
  value?: number;                // porcentagem
  target?: string;               // contagem regressiva (ISO)
  body?: string;                 // texto
}

/** Trending Designs: cada profissional dá o próprio nome (ex: PINK, MEGA). */
export interface Design {
  id: string;
  professionalId: string;
  serviceId: string;
  name: string;
  image: string;                 // URI da foto ou emoji (placeholder)
  priceDelta: number;
}

// ---------- Stories ----------
export interface Story {
  id: string;
  authorType: 'cliente' | 'profissional';
  authorId: string;
  professionalId: string;        // profissional marcada
  serviceId?: string;
  image: string;                 // URI ou emoji (placeholder)
  caption: string;
  createdAt: string;
}
