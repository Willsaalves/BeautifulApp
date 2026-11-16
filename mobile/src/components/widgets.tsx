// Blocos da página da profissional (estilo perfil de restaurante no iFood).
// "servicos" e "agenda" são fixos; o resto ela adiciona, edita e reordena.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { NICHE_LABEL, brl, fmtDate, fmtTime, freeSlots, withBlocks } from '@/domain/rules';
import type { Professional, Widget, WidgetType } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, fonts, radius, space } from '@/theme';

import { Thumb } from './media';
import { Avatar, Badge, Button, Card, Chip, ProgressBar, Row, SectionTitle, T, type IconName } from './ui';

export const WIDGET_CATALOG: { type: WidgetType; label: string; icon: IconName; desc: string }[] = [
  { type: 'capa', label: 'Capa', icon: 'image-outline', desc: 'Foto, nome e frase de destaque' },
  { type: 'trending', label: 'Trending Designs', icon: 'flame-outline', desc: 'Seus designs com nome próprio (ex: PINK, MEGA)' },
  { type: 'galeria', label: 'Galeria', icon: 'images-outline', desc: 'Fotos dos seus trabalhos' },
  { type: 'porcentagem', label: 'Porcentagem', icon: 'pie-chart-outline', desc: 'Ex: agenda 80% preenchida' },
  { type: 'contagem', label: 'Contagem regressiva', icon: 'timer-outline', desc: 'Promoções e datas especiais' },
  { type: 'texto', label: 'Texto', icon: 'text-outline', desc: 'Sobre você, cuidados, avisos' },
  { type: 'fidelidade', label: 'Cartão fidelidade', icon: 'heart-outline', desc: 'Mostra o progresso da cliente' },
  { type: 'avaliacoes', label: 'Depoimentos', icon: 'star-outline', desc: 'Avaliações das clientes' },
  { type: 'servicos', label: 'Serviços', icon: 'sparkles-outline', desc: 'Fixo · lista de serviços e preços' },
  { type: 'agenda', label: 'Horários livres', icon: 'calendar-outline', desc: 'Fixo · próximos horários disponíveis' },
];

export const widgetLabel = (t: WidgetType) => WIDGET_CATALOG.find((x) => x.type === t)?.label ?? t;

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(target ?? 0).getTime() - now);
  return {
    d: Math.floor(ms / 86400_000),
    h: Math.floor((ms % 86400_000) / 3600_000),
    m: Math.floor((ms % 3600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
    over: ms === 0,
  };
}

export function WidgetView({ w, pro }: { w: Widget; pro: Professional }) {
  switch (w.type) {
    case 'capa':
      return <Capa w={w} pro={pro} />;
    case 'trending':
      return <Trending w={w} pro={pro} />;
    case 'galeria':
      return <Galeria w={w} />;
    case 'porcentagem':
      return (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="overline">{w.title}</T>
            <T v="title">{w.value ?? 0}%</T>
          </Row>
          <ProgressBar percent={w.value ?? 0} height={10} />
          {w.subtitle ? <T v="small" muted>{w.subtitle}</T> : null}
        </Card>
      );
    case 'contagem':
      return <Contagem w={w} />;
    case 'texto':
      return (
        <Card>
          {w.title ? <T v="overline">{w.title}</T> : null}
          <T>{w.body || 'Escreva algo aqui…'}</T>
        </Card>
      );
    case 'fidelidade':
      return <Fidelidade w={w} pro={pro} />;
    case 'avaliacoes':
      return <Avaliacoes w={w} pro={pro} />;
    case 'servicos':
      return <Servicos w={w} pro={pro} />;
    case 'agenda':
      return <Agenda w={w} pro={pro} />;
  }
}

function Capa({ w, pro }: { w: Widget; pro: Professional }) {
  return (
    <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: w.color ?? colors.lilac }}>
      <Thumb src={w.image ?? pro.cover} bg={w.color ?? colors.lilac} style={{ height: 170 }} emojiSize={64} />
      <View style={{ padding: space.lg, gap: 4, backgroundColor: colors.card }}>
        <Row gap={space.md}>
          <View style={{ marginTop: -44 }}>
            <Avatar name={pro.name} color={pro.avatar} photo={pro.photo} size={72} />
          </View>
          <View style={{ flex: 1 }}>
            <Badge label={NICHE_LABEL[pro.niche]} />
          </View>
        </Row>
        <T style={{ fontFamily: fonts.serifSemi, fontSize: 30, lineHeight: 36 }}>{w.title || pro.name}</T>
        {w.subtitle ? <T muted>{w.subtitle}</T> : null}
        <T v="small" muted>
          {pro.reviews ? `⭐ ${pro.rating.toFixed(1)} · ${pro.reviews} avaliações` : '✨ Novo no app'}
          {Number.isFinite(pro.distanceKm) ? ` · ${pro.distanceKm.toFixed(1)} km` : ''} · {pro.neighborhood}
        </T>
      </View>
    </View>
  );
}

function Trending({ w, pro }: { w: Widget; pro: Professional }) {
  const s = useStore();
  const L = useLookup();
  const designs = s.designs.filter((d) => d.professionalId === pro.id);
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title={`🔥 ${w.title ?? 'Trending Designs'}`} />
      {designs.length === 0 ? <T v="small" muted>Nenhum design cadastrado ainda.</T> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
        {designs.map((d) => (
          <Pressable key={d.id} onPress={() => router.push(`/agendar/${d.serviceId}?designId=${d.id}`)} style={{ width: 150 }}>
            <Thumb src={d.image} style={{ width: 150, height: 180, borderRadius: radius.lg }} emojiSize={54} />
            <T v="h3" style={{ marginTop: 6, fontWeight: '800' }} numberOfLines={1}>{d.name}</T>
            <T v="small" muted numberOfLines={1}>
              {L.service(d.serviceId).name}{d.priceDelta ? ` · +${brl(d.priceDelta)}` : ''}
            </T>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Galeria({ w }: { w: Widget }) {
  const imgs = w.images ?? [];
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title={w.title ?? 'Galeria'} />
      {imgs.length === 0 ? <T v="small" muted>Sem fotos ainda.</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {imgs.map((src, i) => (
          <Thumb key={i} src={src} bg={i % 2 ? colors.lilacSoft : colors.lilac} style={{ width: '31.5%', aspectRatio: 1, borderRadius: 16 }} emojiSize={30} />
        ))}
      </View>
    </View>
  );
}

function Contagem({ w }: { w: Widget }) {
  const c = useCountdown(w.target);
  const box = (n: number, l: string) => (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.plumSoft, borderRadius: radius.md, paddingVertical: 10 }}>
      <T v="title" color={colors.cardSolid}>{String(n).padStart(2, '0')}</T>
      <T v="small" color={colors.lilac} style={{ fontSize: 10 }}>{l}</T>
    </View>
  );
  return (
    <Card tone="black">
      <T v="h3" color={colors.cardSolid}>{w.title}</T>
      <T v="small" color={colors.offWhite}>{c.over ? 'Encerrado' : `${w.subtitle ?? 'Termina em'} · ${fmtDate(w.target ?? new Date())}`}</T>
      <Row>
        {box(c.d, 'DIAS')}
        {box(c.h, 'HORAS')}
        {box(c.m, 'MIN')}
        {box(c.s, 'SEG')}
      </Row>
    </Card>
  );
}

function Fidelidade({ w, pro }: { w: Widget; pro: Professional }) {
  const s = useStore();
  const L = useLookup();
  const lp = L.loyalty(pro.id);
  if (!lp.enabled) return null;
  return (
    <Card tone="lilac">
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="overline">{w.title}</T>
        <T v="h3">{s.role === 'cliente' ? `${lp.percent}%` : ''}</T>
      </Row>
      {s.role === 'cliente' ? <ProgressBar percent={lp.percent} color={colors.black} track={colors.card} height={10} /> : null}
      <T v="small">Gaste {brl(lp.goal)} e ganhe {lp.discountPercent}% OFF automaticamente.</T>
    </Card>
  );
}

function Avaliacoes({ w, pro }: { w: Widget; pro: Professional }) {
  const s = useStore();
  const L = useLookup();
  // com a API: depoimentos públicos (têm clientName); no protótipo: os locais
  const publicOnes = s.feedbacks.filter((f) => f.professionalId === pro.id && f.clientName !== undefined);
  const reviews = (publicOnes.length ? publicOnes.slice(0, 3) : s.feedbacks.filter((f) => f.professionalId === pro.id).slice(-3).reverse());
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title={w.title ?? 'Depoimentos'} />
      {reviews.length === 0 ? <T v="small" muted>Ainda sem depoimentos.</T> : null}
      {reviews.map((r) => (
        <Card key={r.id} tone="soft">
          <T v="small">{'⭐'.repeat(r.rating)}</T>
          <T>“{r.comment}”</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small" muted>— {r.clientName ?? s.clients.find((c) => c.id === r.clientId)?.name ?? 'Cliente'}</T>
            {r.clientId !== s.clientId || s.role !== 'cliente' ? (
              <Pressable hitSlop={8} accessibilityLabel="Denunciar avaliação"
                onPress={() => router.push({ pathname: '/denunciar', params: { type: 'REVIEW', id: r.id } })}>
                <T v="small" muted style={{ textDecorationLine: 'underline' }}>Denunciar</T>
              </Pressable>
            ) : null}
          </Row>
        </Card>
      ))}
    </View>
  );
}

function Servicos({ w, pro }: { w: Widget; pro: Professional }) {
  const s = useStore();
  const services = s.services.filter((x) => x.professionalId === pro.id);
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title={w.title ?? 'Serviços'} />
      {services.map((svc) => (
        <Card key={svc.id}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">{svc.name}</T>
              <T v="small" muted>{svc.durationMin} min · sinal {svc.depositPercent}% · retorno a cada {svc.returnIntervalDays} dias</T>
            </View>
            <T v="h3">{svc.options.length ? 'a partir de ' : ''}{brl(svc.price)}</T>
          </Row>
          <Button title="Agendar" small onPress={() => router.push(`/agendar/${svc.id}`)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ))}
    </View>
  );
}

function Agenda({ w, pro }: { w: Widget; pro: Professional }) {
  const s = useStore();
  const services = s.services.filter((x) => x.professionalId === pro.id);
  const shortest = [...services].sort((a, b) => a.durationMin - b.durationMin)[0];
  if (!shortest) return null;
  const { busy, durations } = withBlocks(
    s.appointments.filter((a) => a.professionalId === pro.id),
    Object.fromEntries(s.services.map((x) => [x.id, x.durationMin])),
    pro.id === s.proId ? s.blocks : [],
  );
  const out: Date[] = [];
  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14 && out.length < 6; i++) {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    out.push(...freeSlots(d, pro.workHours, shortest.durationMin, busy, durations).slice(0, 6 - out.length));
  }
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title={w.title ?? 'Próximos horários livres'} />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {out.map((t) => (
            <Chip key={t.toISOString()} label={`${fmtDate(t).split(',')[0]} ${fmtTime(t)}`} onPress={() => router.push(`/agendar/${shortest.id}`)} />
          ))}
        </View>
        <T v="small" muted>Atende {pro.workHours.start}–{pro.workHours.end}. Toque para agendar.</T>
      </Card>
    </View>
  );
}
