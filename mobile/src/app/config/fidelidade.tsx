import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { patchProfessional } from '@/api/auth';
import { setMyLocation } from '@/api/catalog';
import { API_ENABLED } from '@/api/client';
import { Button, Card, Chip, Field, Header, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl } from '@/domain/rules';
import { currentCoords } from '@/lib/location';
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

  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState('');
  const saveMyLocation = async () => {
    setLocBusy(true);
    setLocMsg('');
    const c = await currentCoords(true);
    if (!c) {
      setLocBusy(false);
      return setLocMsg('Permita o acesso à localização nas configurações do celular.');
    }
    try {
      if (API_ENABLED && me.remote) s.applyMe(await setMyLocation(c.lat, c.lng), 'profissional');
      else s.updateProfessional({ latitude: c.lat, longitude: c.lng });
      setLocMsg('✓ Localização salva');
    } catch (e) {
      setLocMsg((e as Error).message);
    } finally {
      setLocBusy(false);
    }
  };

  const [error, setError] = useState('');
  const save = async () => {
    // fidelidade ainda é local (fase 4); Pix e prazo do sinal vão para a API
    if (API_ENABLED && me.remote) {
      try {
        s.applyMe(await patchProfessional({ pixKey: pix.trim(), depositDeadlineHours: num(hours) }), 'profissional');
      } catch (e) {
        return setError((e as Error).message);
      }
    }
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
      <SectionTitle title="Localização do estúdio" />
      <Card>
        <T v="small" muted>
          {me.latitude != null
            ? `Localização salva (${me.latitude.toFixed(4)}, ${me.longitude?.toFixed(4)}). As clientes veem a distância até você.`
            : 'Sem localização: você aparece no fim da busca "perto de mim". Faça isso estando no estúdio.'}
        </T>
        <Button small variant="outline" icon="location-outline" title={locBusy ? 'Buscando…' : 'Usar minha localização atual'} disabled={locBusy} onPress={saveMyLocation} />
        {locMsg ? <T v="small" color={locMsg.startsWith('✓') ? colors.success : colors.danger}>{locMsg}</T> : null}
      </Card>

      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title="Salvar" onPress={save} />
    </Screen>
  );
}
