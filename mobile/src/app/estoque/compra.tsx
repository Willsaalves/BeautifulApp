import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { createProduct, purchase } from '@/api/business';
import { API_ENABLED } from '@/api/client';
import { refreshStock } from '@/api/use-pro-sync';
import { Button, Card, Chip, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl } from '@/domain/rules';
import type { Unit } from '@/domain/types';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

// "Comprei 150 pincéis de sobrancelha" → entrada no estoque.
export default function Compra() {
  const params = useLocalSearchParams<{ productId?: string }>();
  const s = useStore();
  const L = useLookup();
  const [productId, setProductId] = useState<string | undefined>(params.productId);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('un');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  const [lot, setLot] = useState('');
  const isNew = !productId;
  const selected = productId ? L.product(productId) : undefined;
  const valid = num(qty) > 0 && (!isNew || name.trim().length > 1);
  const totalCost = num(qty) * num(cost);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remote = API_ENABLED && !!L.myPro.remote;

  const save = async () => {
    if (remote) {
      setBusy(true);
      setError('');
      try {
        const id = productId ?? (await createProduct({ name: name.trim(), unit, minQuantity: num(min), lot: lot || undefined })).id;
        await purchase(id, num(qty), num(cost) || undefined, lot || undefined);
        await refreshStock(s);
        router.back();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    s.registerPurchase({
      productId,
      name: name.trim(),
      unit,
      quantity: num(qty),
      unitCost: num(cost) || undefined,
      minQuantity: num(min),
      lot: lot || undefined,
    });
    router.back();
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Registrar compra" />
      <SectionTitle title="Produto" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label="+ Novo produto" selected={isNew} onPress={() => setProductId(undefined)} />
        {L.myProducts.map((p) => <Chip key={p.id} label={p.name} selected={productId === p.id} onPress={() => setProductId(p.id)} />)}
      </View>

      <Card>
        {isNew ? (
          <>
            <Field label="Nome do produto" placeholder="Ex: Pincel de sobrancelha" value={name} onChangeText={setName} />
            <T v="overline" muted>Unidade</T>
            <Row>
              {(['un', 'ml', 'g'] as Unit[]).map((u) => <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />)}
            </Row>
            <Field label="Avisar quando chegar em" keyboardType="numeric" placeholder="Ex: 20" value={min} onChangeText={setMin} />
          </>
        ) : (
          <T>Em estoque agora: <T style={{ fontWeight: '800' }}>{selected?.quantity} {selected?.unit}</T></T>
        )}
        <Field label={`Quantidade comprada (${selected?.unit ?? unit})`} keyboardType="numeric" placeholder="Ex: 150" value={qty} onChangeText={setQty} />
        <Field label="Custo por unidade (R$) — opcional" keyboardType="decimal-pad" placeholder="Ex: 1,20" value={cost} onChangeText={setCost} />
        <Field label="Lote — opcional" placeholder="Ex: HA-2291" value={lot} onChangeText={setLot} />
        {totalCost ? <T v="small" muted>Total da compra: {brl(totalCost)}</T> : null}
      </Card>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Salvando…' : 'Salvar compra'} disabled={!valid || busy} onPress={save} />
    </Screen>
  );
}
