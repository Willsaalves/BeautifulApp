import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { adminOverview, ago, type AdminOverview } from '@/api/admin';
import { logout } from '@/api/auth';
import { Button, Card, Header, IconCircle, Row, Screen, SectionTitle, T } from '@/components/ui';
import { brl } from '@/domain/rules';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

function Num({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 150, gap: 2 }}>
      <T v="overline" muted>{label}</T>
      <T v="title">{value}</T>
      {sub ? <T v="small" muted>{sub}</T> : null}
    </Card>
  );
}

function Go({ icon, title, sub, href, alert }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; href: string; alert?: boolean }) {
  return (
    <Card onPress={() => router.push(href as never)} tone={alert ? 'cream' : undefined}>
      <Row>
        <IconCircle icon={icon} bg={alert ? colors.card : colors.lilacSoft} color={alert ? colors.danger : colors.black} />
        <View style={{ flex: 1 }}>
          <T v="h3">{title}</T>
          <T v="small" muted>{sub}</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Row>
    </Card>
  );
}

// Painel de administração: números do app e atalhos para moderação e contas.
export default function AdminHome() {
  const s = useStore();
  const [o, setO] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    adminOverview().then(setO).catch((e) => setError((e as Error).message));
  }, []));

  const hasProfile = s.role !== null;

  return (
    <Screen bottomInset={40}>
      <Header title="Administração" back={hasProfile} />
      {error ? <T color={colors.danger}>{error}</T> : null}
      {!o && !error ? <ActivityIndicator style={{ marginTop: 32 }} /> : null}
      {o ? (
        <>
          {o.openReports ? (
            <Card tone={o.slaBreached ? 'black' : 'lilac'}>
              <Row>
                <Ionicons name={o.slaBreached ? 'alarm' : 'flag'} size={22} color={o.slaBreached ? colors.danger : colors.black} />
                <View style={{ flex: 1 }}>
                  <T v="h3" color={o.slaBreached ? colors.cardSolid : undefined}>
                    {o.openReports} denúncia{o.openReports > 1 ? 's' : ''} para revisar
                  </T>
                  <T v="small" color={o.slaBreached ? colors.offWhite : undefined}>
                    {o.slaBreached ? 'Passou de 24h! A App Store exige resposta em até 24 horas.' : `A mais antiga chegou ${ago(o.oldestOpenReportAt)}. Prazo: 24h.`}
                  </T>
                </View>
              </Row>
            </Card>
          ) : (
            <Card>
              <Row>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <T style={{ flex: 1 }}>Nenhuma denúncia pendente.</T>
              </Row>
            </Card>
          )}

          <SectionTitle title="Moderação e contas" />
          <Go icon="flag-outline" title="Denúncias" sub={`${o.openReports} aberta(s)`} href="/admin/denuncias" alert={o.slaBreached} />
          <Go icon="people-outline" title="Contas" sub={`Buscar, suspender, reativar ou excluir · ${o.suspendedAccounts} suspensa(s)`} href="/admin/contas" />
          <Go icon="document-text-outline" title="Histórico de ações" sub="Tudo o que a administração fez" href="/admin/historico" />

          <SectionTitle title="Números" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Num label="Clientes" value={String(o.clients)} />
            <Num label="Profissionais" value={String(o.professionals)} />
            <Num label="Contas novas" value={String(o.newAccounts7d)} sub="últimos 7 dias" />
            <Num label="Agendamentos" value={String(o.appointments7d)} sub="criados em 7 dias" />
            <Num label="Atendimentos" value={String(o.completed30d)} sub="concluídos em 30 dias" />
            <Num label="Movimentado" value={brl((o.revenue30dCents ?? 0) / 100)} sub="concluídos em 30 dias" />
          </View>
          {o.outboxPending ? (
            <T v="small" muted>⏳ {o.outboxPending} evento(s) aguardando envio para a fila.</T>
          ) : null}
        </>
      ) : null}
      {!hasProfile ? (
        <Button title="Sair" variant="ghost" onPress={async () => { await logout(); s.setRole(null); router.replace('/'); }} />
      ) : null}
    </Screen>
  );
}
