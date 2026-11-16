import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function ConfigFidelidade() {
  const s = useStore();
  const me = useLookup().myPro;
  const [enabled, setEnabled] = useState(me.loyalty.enabled);
  const [goal, setGoal] = useState(String(me.loyalty.goalAmount));
  const [disc, setDisc] = useState(String(me.loyalty.discountPercent));
  const [pix, setPix] = useState(me.pixKey);
  const [hours, setHours] = useState(String(me.depositDeadlineHours));

  const save = () => {
    s.updateProfessional({
      loyalty: { enabled, goalAmount: num(goal), discountPercent: num(disc) },
      pixKey: pix.trim(),
      depositDeadlineHours: num(hours),
    });
    router.back();
  };

  return (
    <Screen bottomInset={40}>
      <Header title="Fidelidade e Pix" />
      <SectionTitle title="Cartão fidelidade" />
      <Card>
        <Row>
          <Chip label="Ativado" selected={enabled} onPress={() => setEnabled(true)} />
          <Chip label="Desativado" selected={!enabled} onPress={() => setEnabled(false)} />
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field label="Valor a gastar (R$)" keyboardType="decimal-pad" value={goal} onChangeText={setGoal} /></View>
          <View style={{ flex: 1 }}><Field label="Desconto (%)" keyboardType="numeric" value={disc} onChangeText={setDisc} /></View>
        </Row>
        <Card tone="soft" style={{ padding: space.md }}>
          <T v="small">A barra da cliente sobe a cada procedimento concluído. Ao gastar {brl(num(goal))}, ela ganha automaticamente um voucher de {num(disc)}% OFF.</T>
        </Card>
      </Card>

      <SectionTitle title="Sinal via Pix" />
      <Card>
        <Field label="Chave Pix" value={pix} onChangeText={setPix} />
        <Field label="Prazo para pagar o sinal (horas)" keyboardType="numeric" value={hours} onChangeText={setHours} />
        <T v="small" color={colors.textMuted}>Sem comprovante até o prazo, o agendamento é cancelado automaticamente e o horário volta a ficar livre.</T>
      </Card>
      <Button title="Salvar" onPress={save} />
    </Screen>
  );
}
