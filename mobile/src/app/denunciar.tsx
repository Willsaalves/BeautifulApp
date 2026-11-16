import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { API_ENABLED } from '@/api/client';
import { block, report, type ReportReason, type ReportTarget } from '@/api/moderation';
import { Button, Card, Field, Header, IconCircle, Row, Screen, T } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

const REASONS: { id: ReportReason; title: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'INAPPROPRIATE', title: 'Conteúdo impróprio', desc: 'Nudez, violência ou algo ofensivo', icon: 'eye-off-outline' },
  { id: 'HARASSMENT', title: 'Assédio ou ofensa', desc: 'Mensagens agressivas, ameaças ou preconceito', icon: 'hand-left-outline' },
  { id: 'FAKE', title: 'Golpe ou perfil falso', desc: 'Pede pagamento fora do combinado ou finge ser outra pessoa', icon: 'warning-outline' },
  { id: 'SPAM', title: 'Spam', desc: 'Propaganda ou mensagens repetidas', icon: 'megaphone-outline' },
  { id: 'OTHER', title: 'Outro motivo', desc: 'Conte nos detalhes abaixo', icon: 'ellipsis-horizontal' },
];

const WHAT: Record<ReportTarget, string> = {
  PROFESSIONAL: 'este perfil',
  CLIENT: 'esta cliente',
  STORY: 'este story',
  REVIEW: 'esta avaliação',
  MESSAGE: 'esta mensagem',
};

/**
 * Denunciar (e opcionalmente bloquear). Parâmetros:
 * type, id (alvo da denúncia), label (nome exibido), blockAccount / blockPro (quem pode ser bloqueada).
 */
export default function Denunciar() {
  const p = useLocalSearchParams<{ type: ReportTarget; id: string; label?: string; blockAccount?: string; blockPro?: string }>();
  const s = useStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const canBlock = !!(p.blockAccount || p.blockPro);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | { reported: boolean; blocked: boolean }>(null);
  const who = p.label || 'essa pessoa';
  const remote = API_ENABLED;

  const doBlock = async () => {
    const target = { accountId: p.blockAccount || undefined, professionalId: p.blockPro || undefined };
    if (remote) {
      const res = await block(p.blockPro ? { professionalId: p.blockPro } : { accountId: p.blockAccount });
      target.accountId = res.accountId ?? target.accountId;
    }
    s.applyBlock(target);
  };

  const submit = async (reportIt: boolean) => {
    setBusy(true);
    setError('');
    try {
      if (reportIt && reason) {
        if (remote) await report(p.type, p.id, reason, details);
        if (p.type === 'STORY') s.hideContent('story', p.id);
        if (p.type === 'REVIEW') s.hideContent('review', p.id);
        if (p.type === 'MESSAGE') s.hideContent('message', p.id);
      }
      const blocked = !reportIt || alsoBlock;
      if (blocked && canBlock) await doBlock();
      setDone({ reported: reportIt, blocked: blocked && canBlock });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    // perfil bloqueado: a página dela não abre mais, então volta para a busca/início
    if (done?.blocked && p.blockPro) router.replace(s.role === 'profissional' ? '/pro' : '/cliente/explorar');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (done) {
    return (
      <Screen bottomInset={40}>
        <Header back={false} />
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xl }}>
          <IconCircle icon="shield-checkmark" size={72} bg={colors.lilacSoft} />
          <T v="title" style={{ textAlign: 'center' }}>{done.reported ? 'Obrigada por avisar' : `${who} foi bloqueada`}</T>
          {done.reported ? (
            <T muted style={{ textAlign: 'center' }}>
              Nossa equipe analisa a denúncia em até 24 horas. {who} não fica sabendo quem denunciou.
            </T>
          ) : null}
          {done.blocked ? (
            <T muted style={{ textAlign: 'center' }}>
              Vocês não aparecem mais uma para a outra: sem stories, busca, agendamentos ou mensagens. Dá para desfazer em Perfil → Pessoas bloqueadas.
            </T>
          ) : null}
        </View>
        <Button title="Pronto" onPress={finish} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  return (
    <Screen bottomInset={40}>
      <Header title="Denunciar" />
      <T muted>Por que você quer denunciar {WHAT[p.type] ?? 'isto'}{p.label ? ` (${p.label})` : ''}?</T>

      {REASONS.map((r) => {
        const sel = reason === r.id;
        return (
          <Pressable key={r.id} onPress={() => setReason(r.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }}>
            <Card style={sel ? { borderWidth: 2, borderColor: colors.black } : undefined}>
              <Row gap={space.md}>
                <Ionicons name={r.icon} size={22} color={colors.lilacDeep} />
                <View style={{ flex: 1 }}>
                  <T v="h3">{r.title}</T>
                  <T v="small" muted>{r.desc}</T>
                </View>
                <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.black : colors.textMuted} />
              </Row>
            </Card>
          </Pressable>
        );
      })}

      <Field label={reason === 'OTHER' ? 'Detalhes' : 'Detalhes (opcional)'} placeholder="Conte o que aconteceu" value={details}
        onChangeText={setDetails} multiline maxLength={500} style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} />

      {canBlock ? (
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <T v="h3">Também bloquear {who}</T>
              <T v="small" muted>Vocês deixam de se ver no app</T>
            </View>
            <Switch value={alsoBlock} onValueChange={setAlsoBlock} accessibilityLabel={`Também bloquear ${who}`}
              trackColor={{ true: colors.lilacDeep, false: colors.bg }} />
          </Row>
        </Card>
      ) : null}

      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Enviando…' : 'Enviar denúncia'} icon="flag" disabled={busy || !reason || (reason === 'OTHER' && details.trim().length < 5)}
        onPress={() => submit(true)} />
      {canBlock ? <Button title={`Só bloquear ${who}`} variant="ghost" disabled={busy} onPress={() => submit(false)} /> : null}
    </Screen>
  );
}
