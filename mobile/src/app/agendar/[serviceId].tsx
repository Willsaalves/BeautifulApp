import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Thumb } from '@/components/media';
import { Avatar, Button, Card, Chip, Divider, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl, computeDeposit, computePrice, depositDeadline, fmtDateTime, freeSlots, fmtTime } from '@/domain/rules';
import { pickImage } from '@/lib/pick-image';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default function Agendar() {
  const { serviceId, repeat, designId: designParam } = useLocalSearchParams<{ serviceId: string; repeat?: string; designId?: string }>();
  const s = useStore();
  const L = useLookup();
  const service = L.service(serviceId);
  const pro = L.pro(service.professionalId);
  const previous = repeat ? L.appointment(repeat) : undefined;

  const [selections, setSelections] = useState<Record<string, string>>(
    previous?.selections ?? Object.fromEntries(service.options.map((o) => [o.id, o.choices[0].id])),
  );
  const [reference, setReference] = useState<string | undefined>(previous?.designId ? undefined : previous?.referenceImage);
  const [designId, setDesignId] = useState<string | undefined>(designParam ?? previous?.designId);
  const designs = s.designs.filter((d) => d.serviceId === serviceId);
  const design = designs.find((d) => d.id === designId);
  const [notes, setNotes] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<Date | null>(null);
  const [voucherId, setVoucherId] = useState<string | undefined>();

  const days = useMemo(() => {
    const out: Date[] = [];
    const d0 = new Date();
    d0.setHours(0, 0, 0, 0);
    for (let i = 0; out.length < 14 && i < 30; i++) {
      const d = new Date(d0);
      d.setDate(d.getDate() + i);
      if (pro.workHours.days.includes(d.getDay())) out.push(d);
    }
    return out;
  }, [pro]);

  const durations = Object.fromEntries(s.services.map((x) => [x.id, x.durationMin]));
  const busy = s.appointments.filter((a) => a.professionalId === pro.id);
  const slots = freeSlots(days[dayIdx], pro.workHours, service.durationMin, busy, durations);

  const vouchers = s.vouchers.filter(
    (v) => v.clientId === s.clientId && !v.used && (!v.professionalId || v.professionalId === pro.id),
  );
  const voucher = vouchers.find((v) => v.id === voucherId);
  const price = computePrice(service, selections, design?.priceDelta ?? 0);
  const discount = voucher ? Math.round(price * voucher.percent) / 100 : 0;
  const deposit = computeDeposit(price - discount, service.depositPercent);
  const needsRef = service.requiresReference && !reference && !design;
  const canSubmit = !!slot && !needsRef;

  const submit = () => {
    if (!slot) return;
    const id = s.createAppointment({ serviceId, startsAt: slot, selections, referenceImage: reference, designId, notes, voucherId });
    router.replace(`/agendamento/${id}`);
  };

  return (
    <Screen bottomInset={140}>
      <Header title={repeat ? 'Reagendar' : 'Agendar'} />
      <Card>
        <Row gap={space.md}>
          <Avatar name={pro.name} color={pro.avatar} photo={pro.photo} />
          <View style={{ flex: 1 }}>
            <T v="h3">{service.name}</T>
            <T v="small" muted>{pro.name} · {service.durationMin} min</T>
          </View>
        </Row>
      </Card>

      {service.options.map((opt) => (
        <View key={opt.id} style={{ gap: space.sm }}>
          <SectionTitle title={opt.label} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {opt.choices.map((c) => (
              <Chip
                key={c.id}
                label={c.priceDelta ? `${c.label} +${brl(c.priceDelta)}` : c.label}
                selected={selections[opt.id] === c.id}
                onPress={() => setSelections({ ...selections, [opt.id]: c.id })}
              />
            ))}
          </View>
        </View>
      ))}

      {designs.length ? (
        <>
          <SectionTitle title="🔥 Trending Designs" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
            {designs.map((d) => {
              const sel = designId === d.id;
              return (
                <Pressable key={d.id} onPress={() => setDesignId(sel ? undefined : d.id)} style={{ width: 120 }}>
                  <Thumb src={d.image} style={{ width: 120, height: 140, borderRadius: radius.lg, borderWidth: sel ? 3 : 0, borderColor: colors.black }} emojiSize={44} />
                  <T v="small" style={{ fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{sel ? '✓ ' : ''}{d.name}</T>
                  <T v="small" muted>{d.priceDelta ? `+${brl(d.priceDelta)}` : 'sem acréscimo'}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <SectionTitle title={`Sua referência visual${service.requiresReference && !design ? ' (obrigatória)' : ' (opcional)'}`} />
      <Pressable
        onPress={async () => { const uri = await pickImage(); if (uri) setReference(uri); }}
        style={{ height: reference ? 200 : 110, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lilacDeep, backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {reference ? (
          <Image source={{ uri: reference }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <>
            <Ionicons name="image-outline" size={26} color={colors.lilacDeep} />
            <T v="small" muted>Anexe a foto de referência que você salvou</T>
          </>
        )}
      </Pressable>

      <Field label="Observações" placeholder="Ex: quero tom nude, alergia a…" value={notes} onChangeText={setNotes} multiline />

      <SectionTitle title="Data" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {days.map((d, i) => {
          const sel = i === dayIdx;
          return (
            <Pressable key={d.toISOString()} onPress={() => { setDayIdx(i); setSlot(null); }}
              style={{ width: 58, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: sel ? colors.black : colors.card }}>
              <T v="small" color={sel ? colors.lilac : colors.textMuted} style={{ fontSize: 10, fontWeight: '700' }}>{WEEK[d.getDay()]}</T>
              <T v="title" color={sel ? colors.card : colors.text}>{d.getDate()}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title="Horário" />
      {slots.length === 0 ? <T muted>Sem horários livres neste dia.</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {slots.map((t) => (
          <Chip key={t.toISOString()} label={fmtTime(t)} selected={slot?.getTime() === t.getTime()} onPress={() => setSlot(t)} />
        ))}
      </View>

      {vouchers.length ? (
        <>
          <SectionTitle title="Usar voucher" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {vouchers.map((v) => (
              <Chip key={v.id} icon="🎁" label={`${v.percent}% · ${v.label}`} selected={voucherId === v.id} onPress={() => setVoucherId(voucherId === v.id ? undefined : v.id)} />
            ))}
          </View>
        </>
      ) : null}

      <Card>
        <T v="overline">Resumo</T>
        {design ? <Row style={{ justifyContent: 'space-between' }}><T muted>Design</T><T>{design.name}</T></Row> : null}
        <Row style={{ justifyContent: 'space-between' }}><T muted>Valor do procedimento</T><T>{brl(price)}</T></Row>
        {discount ? <Row style={{ justifyContent: 'space-between' }}><T muted>Desconto</T><T color={colors.success}>- {brl(discount)}</T></Row> : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}><T v="h3">Sinal via Pix ({service.depositPercent}%)</T><T v="h3">{brl(deposit)}</T></Row>
        <T v="small" muted>
          {slot
            ? `Pague até ${fmtDateTime(depositDeadline(new Date(), slot, pro.depositDeadlineHours))} e anexe o comprovante. Depois disso o horário é liberado.`
            : 'Escolha um horário para ver o prazo do sinal.'}
        </T>
        <T v="small" muted>Restante ({brl(price - discount - deposit)}) é pago no dia do atendimento.</T>
      </Card>

      {needsRef ? <T v="small" color={colors.danger}>Escolha um Trending Design ou anexe sua referência para continuar.</T> : null}
      <Button title="Confirmar e pagar sinal" icon="flash" disabled={!canSubmit} onPress={submit} />
    </Screen>
  );
}
