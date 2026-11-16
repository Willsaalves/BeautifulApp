import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STATUS_LABEL } from '@/domain/rules';
import { colors, radius, space, type } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Tipografia ----------
type Variant = keyof typeof type;
export function T({
  v = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; muted?: boolean; color?: string }) {
  return (
    <Text
      {...rest}
      style={[{ color: color ?? (muted ? colors.textMuted : colors.text) }, type[v], style]}
    />
  );
}

// ---------- Layout ----------
export function Screen({
  children,
  scroll = true,
  padded = true,
  bottomInset = 110,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = [padded && { paddingHorizontal: space.lg }, { gap: space.md }, style];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: bottomInset, paddingTop: space.sm }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Header({ title, right, back = true }: { title?: string; right?: React.ReactNode; back?: boolean }) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.card} />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      {title ? <T v="h3" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{title}</T> : <View style={{ flex: 1 }} />}
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Card({
  children,
  style,
  tone = 'white',
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'white' | 'lilac' | 'black' | 'cream' | 'soft';
  onPress?: () => void;
}) {
  const bg = {
    white: colors.card,
    lilac: colors.lilac,
    black: colors.black,
    cream: colors.cream,
    soft: colors.lilacSoft,
  }[tone];
  const content = <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }}>
      {content}
    </Pressable>
  );
}

export function Row({ children, style, gap = space.sm }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <T v="overline">{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T v="small" muted>{action}</T>
        </Pressable>
      ) : null}
    </Row>
  );
}

// ---------- Controles ----------
export function Button({
  title,
  onPress,
  variant = 'black',
  icon,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  variant?: 'black' | 'lilac' | 'outline' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { black: colors.black, lilac: colors.lilac, outline: 'transparent', ghost: 'transparent', danger: colors.danger }[variant];
  const fg = variant === 'black' || variant === 'danger' ? colors.card : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.black },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={small ? 14 : 18} color={fg} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 11 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.black, borderColor: colors.black }]}>
      {icon ? <Text style={{ fontSize: 13 }}>{icon}</Text> : null}
      <Text style={[type.small, { color: selected ? colors.card : colors.text, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="overline" muted>{label}</T>
      <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, style]} />
    </View>
  );
}

// ---------- Visual ----------
export function ProgressBar({
  percent,
  color = colors.lilacDeep,
  track = colors.lilacSoft,
  height = 8,
}: {
  percent: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** Anel de progresso feito só com Views (dois semicírculos) — sem dependência de SVG. */
export function Ring({ percent, size = 112, stroke = 12, label, sub }: { percent: number; size?: number; stroke?: number; label?: string; sub?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const half = size / 2;
  const rightDeg = Math.min(p, 50) * 3.6 - 180;
  const leftDeg = Math.max(p - 50, 0) * 3.6 - 180;
  const ringBase = { width: size, height: size, borderRadius: half, borderWidth: stroke, position: 'absolute' as const };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${p}%`}>
      <View style={[ringBase, { borderColor: colors.lilacSoft }]} />
      {/* metade direita */}
      <View style={{ position: 'absolute', width: half, height: size, left: half, overflow: 'hidden' }}>
        <View style={{ width: size, height: size, left: -half, transform: [{ rotate: `${rightDeg}deg` }] }}>
          <View style={{ width: half, height: size, overflow: 'hidden' }}>
            <View style={[ringBase, { borderColor: colors.lilacDeep }]} />
          </View>
        </View>
      </View>
      {/* metade esquerda */}
      <View style={{ position: 'absolute', width: half, height: size, left: 0, overflow: 'hidden' }}>
        <View style={{ width: size, height: size, transform: [{ rotate: `${leftDeg}deg` }] }}>
          <View style={{ width: half, height: size, left: half, overflow: 'hidden' }}>
            <View style={[ringBase, { borderColor: colors.lilacDeep, left: -half }]} />
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <T v="title">{label ?? `${p}%`}</T>
        {sub ? <T v="small" muted>{sub}</T> : null}
      </View>
    </View>
  );
}

export function Avatar({ name, color = colors.lilac, size = 44 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .replace(/^Dra?\.\s*/, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card }}>
      <Text style={{ fontWeight: '800', fontSize: size * 0.36, color: colors.black }}>{initials}</Text>
    </View>
  );
}

const toneColor = {
  warning: { bg: '#FBEEDC', fg: colors.warning },
  success: { bg: '#E1F2E9', fg: colors.success },
  muted: { bg: colors.offWhite, fg: colors.textMuted },
  danger: { bg: '#F8E1E3', fg: colors.danger },
  lilac: { bg: colors.lilacSoft, fg: colors.lilacDeep },
};

export function Badge({ label, tone = 'lilac' }: { label: string; tone?: keyof typeof toneColor }) {
  const c = toneColor[tone];
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status];
  return <Badge label={s.label} tone={s.tone} />;
}

export function IconCircle({ icon, bg = colors.lilacSoft, color = colors.black, size = 40 }: { icon: IconName; bg?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </View>
  );
}

export function Empty({ icon = 'sparkles-outline', text }: { icon?: IconName; text: string }) {
  return (
    <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
      <Ionicons name={icon} size={28} color={colors.lilacDeep} />
      <T muted style={{ textAlign: 'center' }}>{text}</T>
    </Card>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="overline" muted>{label}</T>
      <T v="title">{value}</T>
      {sub ? <T v="small" muted>{sub}</T> : null}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.xs }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  btn: { height: 50, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.xl },
  btnSmall: { height: 34, paddingHorizontal: space.md },
  btnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  input: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
});
