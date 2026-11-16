import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { T } from './ui';

/** (11) 98765-4321 */
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export const phoneValid = (v: string) => v.replace(/\D/g, '').length === 11;

export function PhoneField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="overline" muted>Celular (WhatsApp)</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg }}>
        <T style={{ fontSize: 15, marginRight: 8 }}>🇧🇷 +55</T>
        <TextInput
          autoFocus={autoFocus}
          value={value}
          onChangeText={(v) => onChange(maskPhone(v))}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text }}
        />
      </View>
    </View>
  );
}

/** Seis caixinhas para o código recebido por SMS/WhatsApp. */
export function OtpInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length }).map((_, i) => {
        const active = i === value.length;
        return (
          <View key={i} style={{ width: 48, height: 58, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: active ? 2 : 1, borderColor: active ? colors.black : colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <T v="title">{value[i] ?? ''}</T>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        autoFocus
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        accessibilityLabel="Código de verificação"
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
