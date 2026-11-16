import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Card, Chip, Empty, ProgressBar, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { brl, isLowStock, profitability } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const PERIODS = [
  { label: 'Este mês', range: () => { const a = new Date(); a.setDate(1); a.setHours(0, 0, 0, 0); const b = new Date(a); b.setMonth(b.getMonth() + 1); return [a, b]; } },
  { label: 'Mês passado', range: () => { const b = new Date(); b.setDate(1); b.setHours(0, 0, 0, 0); const a = new Date(b); a.setMonth(a.getMonth() - 1); return [a, b]; } },
  { label: '90 dias', range: () => { const b = new Date(); b.setDate(b.getDate() + 1); const a = new Date(); a.setDate(a.getDate() - 90); return [a, b]; } },
];

// Painel de lucratividade: faturamento − custo de material (consumo × custo médio de compra).
export default function Lucro() {
  const s = useStore();
  const L = useLookup();
  const [pi, setPi] = useState(0);
  const [from, to] = PERIODS[pi].range();
  const r = profitability(s.appointments, s.services, L.myProducts, s.movements, s.proId, from, to);
  const missingCost = L.myProducts.filter((p) => p.unitCost == null);
  const best = r.rows[0];

  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>PAINEL DE{'\n'}LUCRATIVIDADE</T>
      <Row>
        {PERIODS.map((p, i) => <Chip key={p.label} label={p.label} selected={pi === i} onPress={() => setPi(i)} />)}
      </Row>

      <Card tone="black">
        <T v="overline" color={colors.lilac}>Lucro no período</T>
        <T v="display" color={colors.cardSolid}>{brl(r.profit)}</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small" color={colors.offWhite}>Margem {r.margin}%</T>
          <T v="small" color={colors.offWhite}>{r.count} atendimento(s)</T>
        </Row>
        <ProgressBar percent={r.margin} color={colors.lilac} track={colors.plumSoft} height={8} />
      </Card>

      <Card>
        <Row>
          <Stat label="Faturamento" value={brl(r.revenue)} />
          <Stat label="Custo material" value={brl(r.cost)} />
        </Row>
        <Row>
          <Stat label="Ticket médio" value={brl(r.ticket)} />
          <Stat label="Compras de estoque" value={brl(r.purchases)} sub="saída de caixa" />
        </Row>
      </Card>

      {best ? (
        <Card tone="lilac">
          <T v="overline">Serviço mais lucrativo</T>
          <T v="title">{best.service.name}</T>
          <T v="small">Lucro de {brl((best.revenue - best.cost) / best.count)} por atendimento · custo de material {brl(best.cost / best.count)}</T>
        </Card>
      ) : null}

      <SectionTitle title="Por serviço" />
      {r.rows.length === 0 ? <Empty icon="trending-up" text="Conclua atendimentos para ver a lucratividade do período." /> : null}
      {r.rows.map((row) => {
        const profit = row.revenue - row.cost;
        const margin = row.revenue ? Math.round((profit / row.revenue) * 100) : 0;
        return (
          <Card key={row.service.id} onPress={() => router.push(`/servico/${row.service.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T v="h3">{row.service.name}</T>
                <T v="small" muted>{row.count}x · faturou {brl(row.revenue)} · material {brl(row.cost)}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="h3" color={colors.success}>{brl(profit)}</T>
                <T v="small" muted>{margin}%</T>
              </View>
            </Row>
            <ProgressBar percent={margin} />
          </Card>
        );
      })}

      {missingCost.length || L.myProducts.some(isLowStock) ? (
        <Card tone="cream" onPress={() => router.push('/pro/estoque')}>
          <T v="small">
            {missingCost.length ? `Informe o custo de compra de ${missingCost.map((p) => p.name).join(', ')} para o cálculo ficar exato. ` : ''}
            {L.myProducts.some(isLowStock) ? 'Há produtos abaixo do mínimo no estoque.' : ''}
          </T>
        </Card>
      ) : null}
    </Screen>
  );
}
