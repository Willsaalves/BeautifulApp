import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Button, Card, Chip, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { fmtDate, fmtDateTime, isLowStock, remainingServices } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

export default function Estoque() {
  const s = useStore();
  const L = useLookup();
  const products = [...L.myProducts].sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)));
  const myIds = new Set(products.map((p) => p.id));
  const movements = s.movements.filter((m) => myIds.has(m.productId)).slice(-8).reverse();

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="display">ESTOQUE</T>
        <Button small title="Compra" icon="add" onPress={() => router.push('/estoque/compra')} />
      </Row>
      <T muted>Cada atendimento concluído dá baixa automática nos produtos cadastrados no serviço.</T>

      <SectionTitle title="Quantos atendimentos o estoque cobre" />
      <Row style={{ flexWrap: 'wrap' }}>
        {L.myServices.filter((x) => x.consumption.length).map((x) => {
          const n = remainingServices(L.myProducts, x);
          return <Chip key={x.id} label={`${x.name}: ${n}`} icon={n < 5 ? '⚠️' : '✅'} />;
        })}
      </Row>

      <SectionTitle title="Produtos" />
      {products.map((p) => {
        const low = isLowStock(p);
        const pct = Math.min(100, (p.quantity / Math.max(p.minQuantity * 3, 1)) * 100);
        return (
          <Card key={p.id} onPress={() => router.push(`/estoque/compra?productId=${p.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T v="h3">{p.name}</T>
                <T v="small" muted>
                  mínimo {p.minQuantity} {p.unit}
                  {p.lot ? ` · lote ${p.lot}` : ''}
                  {p.expiresAt ? ` · validade ${fmtDate(p.expiresAt)}` : ''}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T v="title">{p.quantity}<T v="small" muted> {p.unit}</T></T>
                {low ? <Badge label="Comprar mais" tone="danger" /> : null}
              </View>
            </Row>
            <ProgressBar percent={pct} color={low ? colors.danger : colors.lilacDeep} />
          </Card>
        );
      })}

      {movements.length ? <SectionTitle title="Últimas movimentações" /> : null}
      {movements.map((m) => {
        const p = L.product(m.productId)!;
        return (
          <Row key={m.id} style={{ justifyContent: 'space-between' }}>
            <T v="small">{m.reason === 'compra' ? '🛒' : '💅'} {p.name}</T>
            <T v="small" color={m.delta > 0 ? colors.success : colors.danger} style={{ fontWeight: '700' }}>
              {m.delta > 0 ? '+' : ''}{m.delta} {p.unit}
            </T>
            <T v="small" muted>{fmtDateTime(m.createdAt)}</T>
          </Row>
        );
      })}
    </Screen>
  );
}
