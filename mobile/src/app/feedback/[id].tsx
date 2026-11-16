import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { myReviews, myVouchers, reviewAppointment } from '@/api/business';
import { API_ENABLED } from '@/api/client';
import { Button, Card, Field, Header, IconCircle, Row, Screen, T } from '@/components/ui';
import { useLookup, useStore } from '@/store/app-store';
import { colors, space } from '@/theme';

export default function Feedback() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const L = useLookup();
  const a = L.appointment(id)!;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [earned, setEarned] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!(API_ENABLED && a.remote)) return setEarned(s.submitFeedback(a.id, rating, comment || 'Amei!'));
    setBusy(true);
    setError('');
    try {
      const res = await reviewAppointment(a.id, rating, comment.trim());
      const [vouchers, reviews] = await Promise.all([myVouchers(s.clientId), myReviews()]);
      s.setRemoteClientData({ vouchers, reviews });
      setEarned(!!res.voucher);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (earned !== null) {
    return (
      <Screen bottomInset={40}>
        <Header back={false} />
        <Card tone={earned ? 'lilac' : 'white'} style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <IconCircle icon={earned ? 'gift' : 'heart'} bg={colors.card} size={64} />
          <T v="title" style={{ textAlign: 'center' }}>{earned ? 'Você ganhou 10% OFF!' : 'Obrigada pelo feedback!'}</T>
          <T style={{ textAlign: 'center' }}>
            {earned
              ? 'Seu bônus do mês já está na sua carteira e pode ser usado no próximo agendamento.'
              : 'Você já recebeu o bônus deste mês. Continue avaliando — no mês que vem tem mais.'}
          </T>
        </Card>
        <Button title="Voltar ao início" onPress={() => router.replace('/cliente')} />
      </Screen>
    );
  }

  return (
    <Screen bottomInset={40}>
      <Header title="Avaliar" />
      <T v="display">COMO FOI?</T>
      <T muted>{L.service(a.serviceId).name} com {L.pro(a.professionalId).name}</T>
      <Card style={{ alignItems: 'center' }}>
        <Row gap={space.md}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityLabel={`${n} estrelas`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color={colors.lilacDeep} />
            </Pressable>
          ))}
        </Row>
      </Card>
      <Field label="Seu depoimento" placeholder="Conte como foi sua experiência" value={comment} onChangeText={setComment} multiline style={{ minHeight: 110, textAlignVertical: 'top' }} />
      <T v="small" muted>Avaliações ajudam outras clientes e rendem um voucher mensal no app.</T>
      {error ? <T v="small" color={colors.danger}>{error}</T> : null}
      <Button title={busy ? 'Enviando…' : 'Enviar avaliação'} disabled={busy} onPress={submit} />
    </Screen>
  );
}
