import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Thumb } from '@/components/media';
import { Button, Card, Chip, Empty, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { WidgetView, widgetLabel } from '@/components/widgets';
import { brl, fmtDateTime } from '@/domain/rules';
import type { Design } from '@/domain/types';
import { pickImage } from '@/lib/pick-image';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const COVER_COLORS = [colors.lilac, colors.lilacSoft, colors.cream, colors.offWhite, '#F3C9D6', '#BFD8D2'];
const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function EditarWidget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const me = L.myPro;
  const w = me.widgets.find((x) => x.id === id);
  const t0 = w?.target ? new Date(w.target) : null;
  const [days, setDays] = useState(() => {
    if (!t0) return '7';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(t0);
    d.setHours(0, 0, 0, 0);
    return String(Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400_000)));
  });
  const [hour, setHour] = useState(t0 ? `${String(t0.getHours()).padStart(2, '0')}:${String(t0.getMinutes()).padStart(2, '0')}` : '23:59');

  if (!w) return <Screen><Header /><Empty text="Bloco não encontrado." /></Screen>;
  const up = (patch: Parameters<typeof s.updateWidget>[1]) => s.updateWidget(w.id, patch);

  const setTarget = (d: string, h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    const t = new Date();
    t.setDate(t.getDate() + num(d));
    t.setHours(hh || 0, mm || 0, 0, 0);
    up({ target: t.toISOString() });
  };

  return (
    <Screen bottomInset={60}>
      <Header title={widgetLabel(w.type)} />
      <T v="overline" muted>Prévia</T>
      <WidgetView w={w} pro={me} />

      <SectionTitle title="Editar" />
      <Card>
        <Field label="Título" value={w.title ?? ''} onChangeText={(v) => up({ title: v })} />

        {w.type === 'capa' || w.type === 'porcentagem' || w.type === 'contagem' ? (
          <Field label={w.type === 'contagem' ? 'Texto antes da data' : 'Subtítulo'} value={w.subtitle ?? ''} onChangeText={(v) => up({ subtitle: v })} />
        ) : null}

        {w.type === 'capa' ? (
          <>
            <Button title={w.image ? 'Trocar foto da capa' : 'Escolher foto da capa'} variant="outline" icon="image-outline"
              onPress={async () => { const uri = await pickImage(); if (uri) up({ image: uri }); }} />
            <T v="overline" muted>Cor de fundo</T>
            <Row>
              {COVER_COLORS.map((c) => (
                <Pressable key={c} onPress={() => up({ color: c })} accessibilityLabel={`Cor ${c}`}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: w.color === c ? 3 : 1, borderColor: w.color === c ? colors.black : colors.border }} />
              ))}
            </Row>
          </>
        ) : null}

        {w.type === 'porcentagem' ? (
          <Row>
            <Button small variant="outline" title="-10" onPress={() => up({ value: Math.max(0, (w.value ?? 0) - 10) })} />
            <View style={{ flex: 1 }}>
              <Field label="Valor (%)" keyboardType="numeric" value={String(w.value ?? 0)} onChangeText={(v) => up({ value: Math.min(100, num(v)) })} />
            </View>
            <Button small variant="outline" title="+10" onPress={() => up({ value: Math.min(100, (w.value ?? 0) + 10) })} />
          </Row>
        ) : null}

        {w.type === 'contagem' ? (
          <>
            <Row>
              <View style={{ flex: 1 }}><Field label="Daqui a quantos dias" keyboardType="numeric" value={days} onChangeText={(v) => { setDays(v); setTarget(v, hour); }} /></View>
              <View style={{ flex: 1 }}><Field label="Horário" value={hour} onChangeText={(v) => { setHour(v); setTarget(days, v); }} /></View>
            </Row>
            <T v="small" muted>Termina em {fmtDateTime(w.target ?? new Date())}</T>
          </>
        ) : null}

        {w.type === 'texto' ? (
          <Field label="Texto" multiline value={w.body ?? ''} onChangeText={(v) => up({ body: v })} style={{ minHeight: 110, textAlignVertical: 'top' }} />
        ) : null}

        {w.type === 'galeria' ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(w.images ?? []).map((src, i) => (
                <View key={i}>
                  <Thumb src={src} style={{ width: 92, height: 92, borderRadius: 14 }} />
                  <Pressable onPress={() => up({ images: (w.images ?? []).filter((_, j) => j !== i) })} accessibilityLabel="Remover foto"
                    style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.black, borderRadius: 10 }}>
                    <Ionicons name="close" size={16} color={colors.card} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Button title="Adicionar foto" variant="outline" icon="add" onPress={async () => { const uri = await pickImage(); if (uri) up({ images: [...(w.images ?? []), uri] }); }} />
          </>
        ) : null}

        {w.fixed ? (
          <T v="small" muted>Bloco fixo do app. {w.type === 'servicos' ? 'Edite seus serviços e preços em Perfil → Serviços.' : 'Os horários vêm do seu expediente e da agenda.'}</T>
        ) : null}
      </Card>

      {w.type === 'trending' ? <DesignsEditor /> : null}

      <Button title="Pronto" onPress={() => router.back()} />
      {!w.fixed ? <Button title="Remover bloco" variant="ghost" onPress={() => { s.removeWidget(w.id); router.back(); }} /> : null}
    </Screen>
  );
}

/** Trending Designs: a profissional sobe a foto e dá o nome que quiser (PINK, MEGA…). */
function DesignsEditor() {
  const s = useStore();
  const L = useLookup();
  const mine = s.designs.filter((d) => d.professionalId === s.proId);
  const services = L.myServices;
  const [editing, setEditing] = useState<Design | null>(null);

  const blank = (): Design => ({ id: s.newId('dz'), professionalId: s.proId, serviceId: services[0]?.id ?? '', name: '', image: '', priceDelta: 0 });

  return (
    <>
      <SectionTitle title={`Seus designs (${mine.length})`} action="+ Novo" onAction={() => setEditing(blank())} />
      {editing ? (
        <Card tone="soft">
          <Pressable onPress={async () => { const uri = await pickImage(); if (uri) setEditing({ ...editing, image: uri }); }}
            style={{ height: 170, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lilacDeep }}>
            {editing.image ? <Thumb src={editing.image} style={{ flex: 1 }} emojiSize={54} /> : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Ionicons name="image-outline" size={26} color={colors.lilacDeep} />
                <T v="small" muted>Foto do design</T>
              </View>
            )}
          </Pressable>
          <Field label="Nome do design" placeholder="Ex: PINK, MEGA" autoCapitalize="characters" value={editing.name} onChangeText={(v) => setEditing({ ...editing, name: v.toUpperCase() })} />
          <T v="overline" muted>Serviço</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {services.map((x) => <Chip key={x.id} label={x.name} selected={editing.serviceId === x.id} onPress={() => setEditing({ ...editing, serviceId: x.id })} />)}
          </View>
          <Field label="Acréscimo no preço (R$)" keyboardType="decimal-pad" value={String(editing.priceDelta)} onChangeText={(v) => setEditing({ ...editing, priceDelta: num(v) })} />
          <Row>
            <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(null)} />
            <Button title="Salvar" style={{ flex: 1 }} disabled={!editing.name.trim() || !editing.image || !editing.serviceId}
              onPress={() => { s.upsertDesign(editing); setEditing(null); }} />
          </Row>
        </Card>
      ) : null}
      {mine.map((d) => (
        <Card key={d.id}>
          <Row gap={space.md}>
            <Thumb src={d.image} style={{ width: 56, height: 56, borderRadius: 14 }} emojiSize={26} />
            <View style={{ flex: 1 }}>
              <T v="h3">{d.name}</T>
              <T v="small" muted>{L.service(d.serviceId).name}{d.priceDelta ? ` · +${brl(d.priceDelta)}` : ''}</T>
            </View>
            <Pressable onPress={() => setEditing(d)} hitSlop={8} accessibilityLabel="Editar design"><Ionicons name="create-outline" size={20} /></Pressable>
            <Pressable onPress={() => s.removeDesign(d.id)} hitSlop={8} accessibilityLabel="Remover design"><Ionicons name="trash-outline" size={20} color={colors.textMuted} /></Pressable>
          </Row>
        </Card>
      ))}
    </>
  );
}
