import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, IconCircle, Row, Screen, SectionTitle, T, type IconName } from '@/components/ui';
import { brl } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

function Item({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Row gap={space.md}>
        <IconCircle icon={icon} />
        <View style={{ flex: 1 }}>
          <T v="h3">{title}</T>
          <T v="small" muted>{sub}</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Row>
    </Card>
  );
}

export default function Mais() {
  const s = useStore();
  const L = useLookup();
  const me = L.myPro;
  return (
    <Screen>
      <T v="display" style={{ marginTop: space.sm }}>MAIS</T>

      <SectionTitle title="Serviços" action="+ Novo" onAction={() => router.push('/servico/novo')} />
      {L.myServices.map((x) => (
        <Item key={x.id} icon="sparkles-outline" title={x.name}
          sub={`${brl(x.price)} · ${x.durationMin} min · sinal ${x.depositPercent}% · ${x.consumption.length} produto(s)`}
          onPress={() => router.push(`/servico/${x.id}`)} />
      ))}

      <SectionTitle title="Configurações" />
      <Item icon="heart-outline" title="Cartão fidelidade"
        sub={me.loyalty.enabled ? `Gastou ${brl(me.loyalty.goalAmount)} → ${me.loyalty.discountPercent}% OFF` : 'Desativado'}
        onPress={() => router.push('/config/fidelidade')} />
      <Item icon="flash-outline" title="Pix e política de cancelamento"
        sub={`Chave ${me.pixKey} · sinal em até ${me.depositDeadlineHours}h`}
        onPress={() => router.push('/config/fidelidade')} />
      <Item icon="eye-outline" title="Meu perfil público" sub="Como as clientes te veem" onPress={() => router.push(`/profissional/${me.id}`)} />

      <Button title="Trocar para área da cliente" variant="outline" icon="swap-horizontal" style={{ marginTop: space.lg }}
        onPress={() => { s.setRole('cliente'); router.replace('/cliente'); }} />
      <Button title="Sair" variant="ghost" onPress={() => { s.setRole(null); router.replace('/'); }} />
    </Screen>
  );
}
