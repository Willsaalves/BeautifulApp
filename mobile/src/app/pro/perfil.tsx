import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ProfileHeader, handleOf } from '@/components/profile-header';
import { Button, Card, IconCircle, Row, Screen, SectionTitle, T, type IconName } from '@/components/ui';
import { WIDGET_CATALOG } from '@/components/widgets';
import { brl } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

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

function IconBtn({ icon, onPress, disabled, label }: { icon: IconName; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} accessibilityLabel={label}
      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, opacity: disabled ? 0.3 : 1 }}>
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );
}

// "Edite seu perfil": a profissional monta a página com blocos (widgets).
export default function ProPerfil() {
  const s = useStore();
  const L = useLookup();
  const me = L.myPro;
  const ws = me.widgets;
  const meta = (t: string) => WIDGET_CATALOG.find((x) => x.type === t)!;

  return (
    <Screen>
      <View style={{ marginTop: space.sm }}>
        <ProfileHeader
          name={me.name}
          color={me.avatar}
          photo={me.photo}
          cover={me.cover}
          right={
            <Row>
              <Button small variant="outline" title="Editar perfil" onPress={() => router.push('/perfil/editar')} />
              <Button small title="Ver página" icon="eye" onPress={() => router.push(`/profissional/${me.id}`)} />
            </Row>
          }
        />
      </View>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <T v="title">{me.name}</T>
        <T v="small" muted>{handleOf(me.name)} · {me.neighborhood}</T>
        <T style={{ marginTop: 4 }}>{me.headline}</T>
      </View>
      <T v="display" style={{ marginTop: space.md }}>EDITE SUA{'\n'}PÁGINA</T>
      <T muted>Monte sua página como quiser. Agenda e serviços são fixos — mantenha seus dias e horários sempre atualizados.</T>

      <SectionTitle title={`Blocos da página (${ws.length})`} />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {ws.map((w, i) => {
          const m = meta(w.type);
          return (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: i < ws.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Pressable onPress={() => router.push(`/widget/${w.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconCircle icon={m.icon} size={36} bg={w.fixed ? colors.offWhite : colors.lilacSoft} />
                <View style={{ flex: 1 }}>
                  <Row gap={4}>
                    <T v="h3" style={{ fontSize: 14 }}>{m.label}</T>
                    {w.fixed ? <Ionicons name="lock-closed" size={12} color={colors.textMuted} /> : null}
                  </Row>
                  <T v="small" muted numberOfLines={1}>{w.title || m.desc}</T>
                </View>
              </Pressable>
              <IconBtn icon="chevron-up" label="Subir" disabled={i === 0} onPress={() => s.moveWidget(w.id, -1)} />
              <IconBtn icon="chevron-down" label="Descer" disabled={i === ws.length - 1} onPress={() => s.moveWidget(w.id, 1)} />
              <IconBtn icon="trash-outline" label="Remover" disabled={w.fixed} onPress={() => s.removeWidget(w.id)} />
            </View>
          );
        })}
      </Card>

      <SectionTitle title="Adicionar bloco" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {WIDGET_CATALOG.filter((c) => c.type !== 'servicos' && c.type !== 'agenda').map((c) => (
          <Pressable key={c.type} onPress={() => { const id = s.addWidget(c.type); router.push(`/widget/${id}`); }}
            style={({ pressed }) => ({ width: '48.5%', backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: 6, opacity: pressed ? 0.8 : 1 })}>
            <Row gap={6}>
              <Ionicons name={c.icon} size={18} color={colors.lilacDeep} />
              <T v="h3" style={{ fontSize: 13 }}>{c.label}</T>
            </Row>
            <T v="small" muted style={{ fontSize: 11 }}>{c.desc}</T>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Serviços" action="+ Novo" onAction={() => router.push('/servico/novo')} />
      {L.myServices.map((x) => (
        <Item key={x.id} icon="sparkles-outline" title={x.name}
          sub={`${brl(x.price)} · ${x.durationMin} min · sinal ${x.depositPercent}% · ${x.consumption.length} produto(s)`}
          onPress={() => router.push(`/servico/${x.id}`)} />
      ))}

      <SectionTitle title="Configurações" />
      <Item icon="heart-outline" title="Fidelidade, Pix e cancelamento"
        sub={`${me.loyalty.enabled ? `${brl(me.loyalty.goalAmount)} → ${me.loyalty.discountPercent}% OFF` : 'Fidelidade desativada'} · sinal em ${me.depositDeadlineHours}h`}
        onPress={() => router.push('/config/fidelidade')} />

      <Button title="Trocar para área da cliente" variant="outline" icon="swap-horizontal" style={{ marginTop: space.lg }}
        onPress={() => { s.setRole('cliente'); router.replace('/cliente'); }} />
      <Button title="Sair" variant="ghost" onPress={() => { s.setRole(null); router.replace('/'); }} />
    </Screen>
  );
}
