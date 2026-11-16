import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button, Card, Chip, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { setConsumption as saveConsumption } from '@/api/business';
import { createService, deleteService, serviceFromApi, updateService } from '@/api/catalog';
import { API_ENABLED } from '@/api/client';
import { NICHE_ICON, NICHE_LABEL } from '@/domain/rules';
import type { Consumption, Niche, Service } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function EditarServico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const existing = id !== 'novo' ? L.service(id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [niche, setNiche] = useState<Niche>(existing?.niche ?? L.myPro.niche);
  const [price, setPrice] = useState(String(existing?.price ?? ''));
  const [duration, setDuration] = useState(String(existing?.durationMin ?? 60));
  const [deposit, setDeposit] = useState(String(existing?.depositPercent ?? 30));
  const [ret, setRet] = useState(String(existing?.returnIntervalDays ?? 21));
  const [consumption, setConsumption] = useState<Consumption[]>(existing?.consumption ?? []);
  const [needsRef, setNeedsRef] = useState(existing?.requiresReference ?? false);
  // opções (Formato, Tamanho…) com escolhas e acréscimo de preço; preço guardado como texto enquanto edita
  const [options, setOptions] = useState(
    (existing?.options ?? []).map((o) => ({ ...o, choices: o.choices.map((c) => ({ ...c, priceText: String(c.priceDelta) })) })),
  );
  const newKey = () => s.newId('o');
  const setOpt = (i: number, patch: Partial<(typeof options)[number]>) => setOptions(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setChoice = (i: number, k: number, patch: Partial<(typeof options)[number]['choices'][number]>) =>
    setOpt(i, { choices: options[i].choices.map((c, j) => (j === k ? { ...c, ...patch } : c)) });
  const optionsValid = options.every((o) => o.label.trim() && o.choices.length > 0 && o.choices.every((c) => c.label.trim()));

  const unused = L.myProducts.filter((p) => !consumption.some((c) => c.productId === p.id));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const svc: Service = {
      id: existing?.id ?? s.newId('s'),
      professionalId: s.proId,
      name: name.trim(),
      niche,
      price: num(price),
      durationMin: num(duration),
      depositPercent: num(deposit),
      returnIntervalDays: num(ret),
      options: options.map((o) => ({
        id: o.id,
        label: o.label.trim(),
        choices: o.choices.map((c) => ({ id: c.id, label: c.label.trim(), priceDelta: num(c.priceText) })),
      })),
      consumption: consumption.filter((c) => c.amount > 0),
      requiresReference: needsRef,
    };
    if (!API_ENABLED || !L.myPro.remote) {
      s.upsertService(svc);
      return router.back();
    }
    setBusy(true);
    setError('');
    try {
      const saved = existing ? await updateService(svc) : await createService(svc);
      // consumo por atendimento: só produtos que já estão no servidor
      const remoteProducts = new Set(L.myProducts.map((p) => p.id));
      const items = svc.consumption.filter((c) => remoteProducts.has(c.productId) && /^[0-9a-f]{8}-/i.test(c.productId));
      await saveConsumption(saved.id!, items);
      s.mergeRemote({ services: [serviceFromApi(saved, { ...svc, consumption: items })] });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!existing) return;
    if (API_ENABLED && L.myPro.remote) {
      try {
        await deleteService(existing.id);
      } catch (e) {
        return setError((e as Error).message);
      }
    }
    s.removeServiceLocal(existing.id);
    router.back();
  };

  return (
    <Screen bottomInset={40}>
      <Header title={existing ? 'Editar serviço' : 'Novo serviço'} />
      <Card>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Preenchimento labial 2ml" />
        <T v="overline" muted>Nicho</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(Object.keys(NICHE_LABEL) as Niche[]).map((n) => <Chip key={n} icon={NICHE_ICON[n]} label={NICHE_LABEL[n]} selected={niche === n} onPress={() => setNiche(n)} />)}
        </View>
        <Row>
          <View style={{ flex: 1 }}><Field label="Preço (R$)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} /></View>
          <View style={{ flex: 1 }}><Field label="Duração (min)" keyboardType="numeric" value={duration} onChangeText={setDuration} /></View>
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="Sinal (%)" keyboardType="numeric" value={deposit} onChangeText={setDeposit} /></View>
          <View style={{ flex: 1 }}><Field label="Retorno (dias)" keyboardType="numeric" value={ret} onChangeText={setRet} /></View>
        </Row>
        <Chip label="Exigir foto de referência da cliente" icon={needsRef ? '✅' : '⬜'} selected={needsRef} onPress={() => setNeedsRef(!needsRef)} />
      </Card>

      <SectionTitle title="Opções que a cliente escolhe" action="+ Opção" onAction={() =>
        setOptions([...options, { id: newKey(), label: '', choices: [{ id: newKey(), label: '', priceDelta: 0, priceText: '0' }] }])} />
      <T v="small" muted>Ex: Formato (Quadrada, Stiletto +R$ 20), Tamanho, Decoração. O preço final é calculado sozinho.</T>
      {options.map((o, i) => (
        <Card key={o.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label={`Opção ${i + 1}`} placeholder="Ex: Formato" value={o.label} onChangeText={(v) => setOpt(i, { label: v })} />
            </View>
            <Pressable onPress={() => setOptions(options.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Remover opção" style={{ marginTop: 18 }}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </Row>
          {o.choices.map((c, k) => (
            <Row key={c.id}>
              <TextInput value={c.label} onChangeText={(v) => setChoice(i, k, { label: v })} placeholder="Escolha (ex: Stiletto)"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: colors.text }} />
              <T v="small" muted>+R$</T>
              <TextInput value={c.priceText} onChangeText={(v) => setChoice(i, k, { priceText: v })} keyboardType="decimal-pad"
                accessibilityLabel="Acréscimo"
                style={{ width: 70, textAlign: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, color: colors.text }} />
              <Pressable disabled={o.choices.length === 1} onPress={() => setOpt(i, { choices: o.choices.filter((_, j) => j !== k) })} hitSlop={8}
                accessibilityLabel="Remover escolha" style={{ opacity: o.choices.length === 1 ? 0.3 : 1 }}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </Row>
          ))}
          <Button small variant="outline" title="+ Escolha" style={{ alignSelf: 'flex-start' }}
            onPress={() => setOpt(i, { choices: [...o.choices, { id: newKey(), label: '', priceDelta: 0, priceText: '0' }] })} />
        </Card>
      ))}

      <SectionTitle title="Consumo por atendimento" />
      <T v="small" muted>O que sai do estoque toda vez que este serviço é concluído.</T>
      <Card>
        {consumption.length === 0 ? <T v="small" muted>Nenhum produto vinculado.</T> : null}
        {consumption.map((c) => {
          const p = L.product(c.productId);
          return (
            <Row key={c.productId}>
              <T style={{ flex: 1 }}>{p?.name}</T>
              <TextInput
                keyboardType="decimal-pad"
                value={String(c.amount)}
                onChangeText={(v) => setConsumption(consumption.map((x) => (x.productId === c.productId ? { ...x, amount: num(v) } : x)))}
                style={{ width: 70, textAlign: 'center', backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 8, color: colors.text }}
              />
              <T v="small" muted style={{ width: 22 }}>{p?.unit}</T>
              <Pressable hitSlop={8} onPress={() => setConsumption(consumption.filter((x) => x.productId !== c.productId))} accessibilityLabel="Remover produto">
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </Row>
          );
        })}
        {unused.length ? (
          <>
            <T v="overline" muted style={{ marginTop: space.sm }}>Adicionar produto</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {unused.map((p) => <Chip key={p.id} label={`+ ${p.name}`} onPress={() => setConsumption([...consumption, { productId: p.id, amount: 1 }])} />)}
            </View>
          </>
        ) : null}
      </Card>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      {!optionsValid ? <T v="small" color={colors.danger}>Dê nome a todas as opções e escolhas (ou remova as vazias).</T> : null}
      <Button title={busy ? 'Salvando…' : 'Salvar serviço'} disabled={!name.trim() || !num(price) || busy || !optionsValid} onPress={save} />
      {existing ? <Button title="Desativar serviço" variant="ghost" onPress={deactivate} /> : null}
    </Screen>
  );
}
