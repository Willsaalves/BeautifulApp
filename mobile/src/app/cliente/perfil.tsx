import { router } from 'expo-router';

import { logout } from '@/api/auth';
import { Pressable, View } from 'react-native';

import { Thumb } from '@/components/media';
import { ProfileHeader, handleOf } from '@/components/profile-header';

import { Badge, Button, Card, Empty, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl, fmtDate } from '@/domain/rules';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

export default function ClientePerfil() {
  const s = useStore();
  const L = useLookup();
  const me = L.me;
  // fidelidade com toda profissional que já atendeu ou é favorita
  const proIds = Array.from(
    new Set([...me.favorites, ...s.appointments.filter((a) => a.clientId === me.id).map((a) => a.professionalId)]),
  );
  const vouchers = s.vouchers.filter((v) => v.clientId === me.id);
  const loyaltyPros = Array.from(new Set([...proIds, ...s.loyaltyCards.map((c) => c.professionalId)]))
    .filter((id) => s.professionals.some((p) => p.id === id))
    .map(L.pro)
    .filter((p) => L.loyalty(p.id).enabled);
  const done = s.appointments.filter((a) => a.clientId === me.id && a.status === 'concluido').length;
  const myStories = s.stories.filter((x) => x.authorType === 'cliente' && x.authorId === me.id);

  return (
    <Screen>
      <View style={{ marginTop: space.sm }}>
        <ProfileHeader
          name={me.name}
          color={me.avatar}
          photo={me.photo}
          cover={me.cover}
          right={<Button small variant="outline" title="Editar perfil" onPress={() => router.push('/perfil/editar')} />}
        />
      </View>
      <View style={{ paddingHorizontal: 4, gap: 4 }}>
        <T v="title">{me.name}</T>
        <T v="small" muted>{handleOf(me.name)}</T>
        {me.bio ? <T style={{ marginTop: 4 }}>{me.bio}</T> : null}
        <Row gap={space.lg} style={{ marginTop: space.sm }}>
          <T v="small"><T v="small" style={{ fontWeight: '800' }}>{done}</T> atendimentos</T>
          <T v="small"><T v="small" style={{ fontWeight: '800' }}>{myStories.length}</T> stories</T>
          <T v="small"><T v="small" style={{ fontWeight: '800' }}>{me.favorites.length}</T> favoritas</T>
        </Row>
      </View>

      <SectionTitle title="Meus resultados" action="+ Story" onAction={() => router.push('/story/novo')} />
      {myStories.length === 0 ? <Empty icon="camera-outline" text="Poste a foto do seu procedimento no story e marque sua profissional." /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {myStories.map((st) => (
          <Pressable key={st.id} onPress={() => router.push(`/story/${st.professionalId}`)} style={{ width: '32.6%', aspectRatio: 0.8 }}>
            <Thumb src={st.image} style={{ flex: 1, borderRadius: 12 }} emojiSize={30} />
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Cartões fidelidade" />
      {loyaltyPros.length === 0 ? (
        <Empty icon="heart-outline" text="Seus cartões fidelidade aparecem aqui depois do primeiro atendimento." />
      ) : null}
      {loyaltyPros.map((p) => {
        const lp = L.loyalty(p.id);
        return (
          <Card key={p.id} onPress={() => router.push(`/profissional/${p.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3">{p.name}</T>
              <T v="h3">{lp.percent}%</T>
            </Row>
            <ProgressBar percent={lp.percent} height={10} />
            <T v="small" muted>
              {brl(lp.inCycle)} de {brl(lp.goal)} · ganha {lp.discountPercent}% de desconto ao completar
            </T>
          </Card>
        );
      })}

      <SectionTitle title="Vouchers" />
      {vouchers.length === 0 ? <Empty icon="gift-outline" text="Avalie seus atendimentos e complete cartões fidelidade para ganhar vouchers." /> : null}
      {vouchers.map((v) => (
        <Card key={v.id} tone={v.used ? 'white' : 'lilac'}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T v="title">{v.percent}% OFF</T>
              <T v="small">{v.label}</T>
              <T v="small" muted>desde {fmtDate(v.createdAt)}</T>
            </View>
            <Badge label={v.used ? 'Usado' : 'Disponível'} tone={v.used ? 'muted' : 'success'} />
          </Row>
        </Card>
      ))}

      <Button title="Trocar para área da profissional" variant="outline" icon="swap-horizontal" style={{ marginTop: space.lg }}
        onPress={() => { s.setRole('profissional'); router.replace('/pro'); }} />
      <Button title="Sair" variant="ghost" onPress={async () => { await logout(); s.setRole(null); router.replace('/'); }} />
      <T v="small" muted style={{ textAlign: 'center', color: colors.textMuted }}>Protótipo · dados de exemplo</T>
    </Screen>
  );
}
