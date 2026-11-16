import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { adjustProduct, deleteProduct, updateProduct } from '@/api/business';
import { API_ENABLED } from '@/api/client';
import { refreshStock } from '@/api/use-pro-sync';
import { Badge, Button, Card, Chip, Empty, Field, Header, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { fmtDate, fmtDateTime, isLowStock } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

const num = (v: string) => Number(v.replace(',', '.')) || 0;
const ADJUST_REASONS = ['Perda', 'Contagem', 'Uso pessoal', 'Vencido', 'Doação'];
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const toBr = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const toIso = (br: string) => {
  const m = DATE_RE.exec(br.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};

function confirm(msg: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(msg)) onYes();
    return;
  }
  Alert.alert('Remover produto', msg, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: onYes }]);
}

// Detalhe do produto: editar dados, ajuste manual (perda, contagem…) e histórico.
export default function ProdutoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const p = L.product(id);
  const remote = API_ENABLED && !!L.myPro.remote;

  const [name, setName] = useState(p?.name ?? '');
  const [min, setMin] = useState(String(p?.minQuantity ?? ''));
  const [lot, setLot] = useState(p?.lot ?? '');
  const [exp, setExp] = useState(toBr(p?.expiresAt));
  const [sign, setSign] = useState<1 | -1>(-1);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Perda');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  if (!p) {
    return (
      <Screen>
        <Header title="Produto" />
        <Empty icon="cube-outline" text="Produto não encontrado." />
      </Screen>
    );
  }

  const low = isLowStock(p);
  const pct = Math.min(100, (p.quantity / Math.max(p.minQuantity * 3, 1)) * 100);
  const history = s.movements.filter((m) => m.productId === p.id).slice().reverse().slice(0, 30);
  const usedIn = L.myServices.filter((x) => x.consumption.some((c) => c.productId === p.id));
  const expInvalid = exp.trim() !== '' && !toIso(exp);
  const delta = sign * num(qty);
  const dirty = name.trim() !== p.name || num(min) !== p.minQuantity || lot !== (p.lot ?? '') || exp !== toBr(p.expiresAt);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await fn();
      setSaved(ok);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = () =>
    run(async () => {
      const patch = { name: name.trim(), unit: p.unit, minQuantity: num(min), lot: lot.trim() || undefined, expiresAt: toIso(exp) };
      if (remote) {
        await updateProduct(p.id, patch);
        await refreshStock(s);
      } else s.updateProduct(p.id, patch);
    }, 'Dados salvos');

  const adjust = () =>
    run(async () => {
      if (remote) {
        await adjustProduct(p.id, delta, reason);
        await refreshStock(s);
      } else s.adjustStockLocal(p.id, delta, reason);
      setQty('');
    }, 'Ajuste registrado');

  const remove = () =>
    confirm(`Remover "${p.name}" do estoque?${usedIn.length ? ` Ele sai da baixa automática de ${usedIn.length} serviço(s).` : ''}`, () =>
      run(async () => {
        if (remote) {
          await deleteProduct(p.id);
          await refreshStock(s);
        } else s.removeProductLocal(p.id);
        router.back();
      }, ''),
    );

  return (
    <Screen bottomInset={40}>
      <Header title={p.name} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="display">{p.quantity}<T v="h3" muted> {p.unit}</T></T>
          {low ? <Badge label="Comprar mais" tone="danger" /> : <Badge label="Em dia" tone="success" />}
        </Row>
        <ProgressBar percent={pct} color={low ? colors.danger : colors.lilacDeep} />
        <T v="small" muted>
          mínimo {p.minQuantity} {p.unit}
          {usedIn.length ? ` · usado em ${usedIn.map((x) => x.name).join(', ')}` : ' · não está em nenhum serviço'}
        </T>
        <Button small title="Registrar compra" icon="cart" onPress={() => router.push(`/estoque/compra?productId=${p.id}`)} />
      </Card>

      <SectionTitle title="Ajuste manual" />
      <Card>
        <Row>
          <Chip label="− Saída" selected={sign === -1} onPress={() => setSign(-1)} />
          <Chip label="+ Entrada" selected={sign === 1} onPress={() => setSign(1)} />
        </Row>
        <Field label={`Quantidade (${p.unit})`} placeholder="Ex: 5" keyboardType="decimal-pad" value={qty} onChangeText={setQty} />
        <T v="overline" muted>Motivo</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ADJUST_REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}
        </View>
        {num(qty) > 0 ? (
          <T v="small" muted>
            {p.quantity} → {Math.max(0, p.quantity + delta)} {p.unit}
          </T>
        ) : null}
        <Button title="Registrar ajuste" icon="swap-vertical" disabled={busy || num(qty) <= 0} onPress={adjust} />
      </Card>

      <SectionTitle title="Dados do produto" />
      <Card>
        <Field label="Nome" value={name} onChangeText={setName} />
        <Field label={`Estoque mínimo (${p.unit})`} keyboardType="decimal-pad" value={min} onChangeText={setMin} />
        <Field label="Lote" placeholder="Opcional" value={lot} onChangeText={setLot} />
        <Field label="Validade" placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={exp} onChangeText={setExp} />
        {expInvalid ? <T v="small" color={colors.danger}>Use o formato dd/mm/aaaa.</T> : null}
        <Button title="Salvar dados" variant="outline" disabled={busy || !dirty || expInvalid || name.trim().length < 2} onPress={saveInfo} />
      </Card>

      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      {saved ? <T v="small" color={colors.success}>✓ {saved}</T> : null}

      <SectionTitle title="Histórico" />
      {history.length === 0 ? <Empty icon="time-outline" text="Nenhuma movimentação ainda." /> : null}
      {history.length ? (
        <Card>
          {history.map((m) => (
            <Row key={m.id} gap={space.md}>
              <View style={{ width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                <Ionicons
                  name={m.reason === 'compra' ? 'cart' : m.reason === 'atendimento' ? 'sparkles' : 'swap-vertical'}
                  size={16}
                  color={colors.lilacDeep}
                />
              </View>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: '700' }}>
                  {m.reason === 'compra' ? 'Compra' : m.reason === 'atendimento' ? 'Atendimento' : 'Ajuste'}
                  {m.note ? ` · ${m.note}` : ''}
                </T>
                <T v="small" muted>{fmtDateTime(m.createdAt)}</T>
              </View>
              <T v="small" color={m.delta > 0 ? colors.success : colors.danger} style={{ fontWeight: '700' }}>
                {m.delta > 0 ? '+' : ''}{m.delta} {p.unit}
              </T>
            </Row>
          ))}
        </Card>
      ) : null}

      {p.expiresAt ? <T v="small" muted style={{ textAlign: 'center' }}>Validade {fmtDate(p.expiresAt)}</T> : null}
      <Pressable onPress={remove} disabled={busy} style={{ alignItems: 'center', padding: space.md }} accessibilityRole="button">
        <T color={colors.danger}>Remover produto</T>
      </Pressable>
    </Screen>
  );
}
