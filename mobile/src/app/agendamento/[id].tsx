import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, TextInput, View } from 'react-native';

import { Thumb } from '@/components/media';
import { Avatar, Button, Card, Divider, Empty, Field, Header, Row, Screen, SectionTitle, StatusBadge, T } from '@/components/ui';
import { brl, fmtDateTime, fmtTime, isLowStock } from '@/domain/rules';
import { pickImage } from '@/lib/pick-image';
import { useLookup, useStore } from '@/store/app-store';
import { colors, radius, space } from '@/theme';

function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') window.alert(msg ? `${title}\n\n${msg}` : title);
  else Alert.alert(title, msg);
}

function useCountdown(to: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function Agendamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const a = L.appointment(id);
  const isPro = s.role === 'profissional';
  const countdown = useCountdown(a?.depositDueAt ?? new Date().toISOString());
  const [receipt, setReceipt] = useState<string | undefined>();
  const [adjPrice, setAdjPrice] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [showAdj, setShowAdj] = useState(false);
  const [msg, setMsg] = useState('');

  if (!a) return <Screen><Header /><Empty text="Agendamento não encontrado." /></Screen>;

  const svc = L.service(a.serviceId);
  const pro = L.pro(a.professionalId);
  const client = L.client(a.clientId);
  const total = a.price - (a.discountApplied ?? 0);
  const messages = s.messages.filter((m) => m.appointmentId === a.id);
  const feedback = s.feedbacks.find((f) => f.appointmentId === a.id);
  const open = ['aguardando_sinal', 'sinal_enviado', 'confirmado', 'ajuste_pendente'].includes(a.status);

  const complete = () => {
    const { reached, movements } = s.completeAppointment(a.id);
    const lines = movements.map((m) => {
      const p = L.product(m.productId)!;
      const after = p.quantity + m.delta;
      return `• ${p.name}: ${m.delta} ${p.unit} (resta ${Math.max(0, after)}${isLowStock({ ...p, quantity: after }) ? ' ⚠️ comprar mais' : ''})`;
    });
    notify(
      'Atendimento concluído',
      [lines.length ? `Baixa automática no estoque:\n${lines.join('\n')}` : 'Sem consumo de estoque cadastrado.', reached ? `\n🎉 ${client.name} completou o cartão fidelidade e ganhou ${pro.loyalty.discountPercent}% OFF!` : '']
        .join('\n'),
    );
  };

  return (
    <Screen bottomInset={60}>
      <Header title="Agendamento" />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={a.status} />
          <T v="small" muted>#{a.id.slice(-5)}</T>
        </Row>
        <T v="title">{svc.name}</T>
        <T>{fmtDateTime(a.startsAt)} · {svc.durationMin} min</T>
        <Row gap={space.md} style={{ marginTop: space.sm }}>
          <Avatar name={isPro ? client.name : pro.name} color={isPro ? client.avatar : pro.avatar} size={38} />
          <View style={{ flex: 1 }}>
            <T v="h3">{isPro ? client.name : pro.name}</T>
            <T v="small" muted>{isPro ? client.phone : `${pro.neighborhood}, ${pro.city}`}</T>
          </View>
        </Row>
        {Object.keys(a.selections).length ? (
          <>
            <Divider />
            {svc.options.map((o) => {
              const c = o.choices.find((x) => x.id === a.selections[o.id]);
              return c ? (
                <Row key={o.id} style={{ justifyContent: 'space-between' }}>
                  <T muted>{o.label}</T>
                  <T>{c.label}</T>
                </Row>
              ) : null;
            })}
          </>
        ) : null}
        {a.designId ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>Design</T>
            <T style={{ fontWeight: '800' }}>{s.designs.find((d) => d.id === a.designId)?.name}</T>
          </Row>
        ) : null}
        {a.notes ? <T v="small" muted>Obs.: {a.notes}</T> : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}><T muted>Total</T><T v="h3">{brl(total)}</T></Row>
        <Row style={{ justifyContent: 'space-between' }}><T muted>Sinal</T><T>{brl(a.depositAmount)}</T></Row>
      </Card>

      {a.referenceImage ? (
        <>
          <SectionTitle title="Referência da cliente" />
          <Thumb src={a.referenceImage} style={{ height: 220, borderRadius: radius.lg }} emojiSize={80} />
        </>
      ) : null}

      {/* ---------- Pix do sinal (cliente) ---------- */}
      {!isPro && a.status === 'aguardando_sinal' ? (
        <Card tone="black">
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="overline" color={colors.lilac}>Pague o sinal via Pix</T>
            <T v="h3" color={colors.card}>⏱ {countdown}</T>
          </Row>
          <T v="display" color={colors.card}>{brl(a.depositAmount)}</T>
          <T v="small" color={colors.offWhite}>Chave Pix de {pro.name}</T>
          <Pressable
            onPress={async () => { await Clipboard.setStringAsync(pro.pixKey); notify('Chave Pix copiada'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1C1C1C', borderRadius: radius.md, padding: space.md }}>
            <T color={colors.card} style={{ flex: 1 }} selectable>{pro.pixKey}</T>
            <Ionicons name="copy-outline" size={18} color={colors.lilac} />
          </Pressable>
          <Pressable
            onPress={async () => { const uri = await pickImage(); if (uri) setReceipt(uri); }}
            style={{ height: receipt ? 180 : 90, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lilac, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {receipt ? (
              <Image source={{ uri: receipt }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="receipt-outline" size={22} color={colors.lilac} />
                <T v="small" color={colors.offWhite}>Anexar comprovante (obrigatório)</T>
              </>
            )}
          </Pressable>
          <Button title="Enviar comprovante" variant="lilac" disabled={!receipt} onPress={() => receipt && s.attachReceipt(a.id, receipt)} />
          <T v="small" color={colors.offWhite}>
            Se o comprovante não for enviado até {fmtDateTime(a.depositDueAt)}, o horário é cancelado automaticamente e você precisa agendar de novo.
          </T>
        </Card>
      ) : null}

      {!isPro && a.status === 'sinal_enviado' ? (
        <Card tone="soft"><T>Comprovante enviado! Aguardando {pro.name} confirmar o recebimento.</T></Card>
      ) : null}

      {/* ---------- Ajuste de valor ---------- */}
      {a.status === 'ajuste_pendente' && a.adjustment ? (
        <Card tone="cream">
          <T v="overline">Novo valor sugerido</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted style={{ textDecorationLine: 'line-through' }}>{brl(a.price)}</T>
            <T v="title">{brl(a.adjustment.newPrice)}</T>
          </Row>
          {a.adjustment.note ? <T>“{a.adjustment.note}”</T> : null}
          {isPro ? (
            <T v="small" muted>Aguardando a cliente aceitar.</T>
          ) : (
            <Row>
              <Button title="Recusar" variant="outline" style={{ flex: 1 }} onPress={() => s.respondAdjustment(a.id, false)} />
              <Button title="Aceitar" style={{ flex: 1 }} onPress={() => s.respondAdjustment(a.id, true)} />
            </Row>
          )}
        </Card>
      ) : null}

      {/* ---------- Ações da profissional ---------- */}
      {isPro && a.status === 'sinal_enviado' ? (
        <Card>
          <T v="overline">Comprovante do sinal</T>
          {a.receiptImage && a.receiptImage.includes(':') ? (
            <Image source={{ uri: a.receiptImage }} style={{ height: 220, borderRadius: radius.md }} contentFit="contain" />
          ) : (
            <View style={{ height: 120, borderRadius: radius.md, backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt" size={30} color={colors.lilacDeep} />
              <T v="small" muted>comprovante_pix.jpg</T>
            </View>
          )}
          <Row>
            <Button title="Recusar" variant="outline" style={{ flex: 1 }} onPress={() => s.rejectReceipt(a.id)} />
            <Button title="Confirmar" style={{ flex: 1 }} onPress={() => s.confirmDeposit(a.id)} />
          </Row>
        </Card>
      ) : null}

      {isPro && open && a.status !== 'ajuste_pendente' ? (
        <Card>
          {showAdj ? (
            <>
              <Field label="Novo valor (R$)" keyboardType="decimal-pad" value={adjPrice} onChangeText={setAdjPrice} placeholder={String(a.price)} />
              <Field label="Motivo" value={adjNote} onChangeText={setAdjNote} placeholder="Ex: decoração extra em 4 unhas" />
              <Row>
                <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setShowAdj(false)} />
                <Button
                  title="Enviar"
                  style={{ flex: 1 }}
                  disabled={!Number(adjPrice.replace(',', '.'))}
                  onPress={() => { s.proposeAdjustment(a.id, Number(adjPrice.replace(',', '.')), adjNote); setShowAdj(false); }}
                />
              </Row>
            </>
          ) : (
            <Button title="Sugerir novo valor" variant="outline" icon="pricetag-outline" onPress={() => setShowAdj(true)} />
          )}
          {a.status === 'confirmado' ? (
            <>
              <Button title="Concluir atendimento" icon="checkmark-done" onPress={complete} />
              {svc.consumption.length ? (
                <T v="small" muted>
                  Ao concluir sai do estoque: {svc.consumption.map((c) => `${c.amount}${L.product(c.productId)?.unit} ${L.product(c.productId)?.name}`).join(', ')}
                </T>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {/* ---------- Pós-atendimento (cliente) ---------- */}
      {!isPro && a.status === 'concluido' ? (
        feedback ? (
          <Card tone="soft"><T>Sua avaliação: {'⭐'.repeat(feedback.rating)} — “{feedback.comment}”</T></Card>
        ) : (
          <Button title="Avaliar e ganhar bônus" icon="star" variant="lilac" onPress={() => router.push(`/feedback/${a.id}`)} />
        )
      ) : null}
      {!isPro && a.status === 'concluido' ? (
        <Button title="Repetir este serviço" icon="repeat" onPress={() => router.push(`/agendar/${svc.id}?repeat=${a.id}`)} />
      ) : null}
      {a.status === 'concluido' ? (
        <Button title={isPro ? 'Postar resultado no story' : 'Postar no meu story'} icon="camera" variant="outline"
          onPress={() => router.push(`/story/novo?appointmentId=${a.id}`)} />
      ) : null}
      {!isPro && (a.status === 'expirado' || a.status === 'cancelado') ? (
        <Button title="Agendar de novo" icon="calendar" onPress={() => router.replace(`/agendar/${svc.id}?repeat=${a.id}`)} />
      ) : null}

      {/* ---------- Chat ---------- */}
      {open ? (
        <>
          <SectionTitle title="Conversa" />
          <Card>
            {messages.length === 0 ? <T v="small" muted>Combine detalhes ou valores aqui, sem precisar do WhatsApp.</T> : null}
            {messages.map((m) => {
              const mine = (m.from === 'profissional') === isPro;
              return (
                <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.black : colors.lilacSoft, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <T color={mine ? colors.card : colors.text}>{m.text}</T>
                  <T v="small" color={mine ? colors.offWhite : colors.textMuted} style={{ fontSize: 10, textAlign: 'right' }}>{fmtTime(m.createdAt)}</T>
                </View>
              );
            })}
            <Row>
              <TextInput
                value={msg}
                onChangeText={setMsg}
                placeholder="Escreva uma mensagem"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: space.lg, height: 44, color: colors.text }}
              />
              <Pressable
                accessibilityLabel="Enviar"
                onPress={() => { if (msg.trim()) { s.sendMessage(a.id, isPro ? 'profissional' : 'cliente', msg.trim()); setMsg(''); } }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="send" size={16} color={colors.card} />
              </Pressable>
            </Row>
          </Card>
          <Button title="Cancelar agendamento" variant="ghost" onPress={() => s.cancelAppointment(a.id)} />
        </>
      ) : null}
    </Screen>
  );
}
