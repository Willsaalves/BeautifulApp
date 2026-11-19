import { StyleSheet, type TextStyle } from 'react-native';

// Identidade Glammi (guia da marca): branco, rosa #E946AE, vinho #941741 e preto.
// Vinho nos botões, barra inferior e cards de destaque; rosa nos anéis, barras e detalhes.
export const brand = {
  wine: '#941741',
  pink: '#E946AE',
  black: '#000000',
  white: '#FFFFFF',
};

export const colors = {
  lilac: '#FBE0F0',       // rosa clarinho (fundos de destaque)
  lilacSoft: '#FDF0F7',
  lilacDeep: brand.pink,  // anéis, barras de progresso, ícones de destaque
  blush: '#F9CFE7',
  black: brand.wine,      // cor principal: botões, barra inferior, cards escuros
  plumSoft: '#7A1236',
  offWhite: '#FBE4F0',    // texto claro sobre o vinho
  bg: '#FFF7FB',
  card: '#FFFFFF',
  cardSolid: '#FFFFFF',
  text: '#1C1418',
  textMuted: '#8A7580',
  border: '#F3C9E2',      // contorno rosa dos cards (como no layout)
  success: '#2E9E6E',
  warning: '#D9822B',
  danger: '#D63D5B',
  cream: '#FFF1F7',
  pink: brand.pink,
  plumDeep: '#6E0F2F',
  wine: brand.wine,
};

export const gradients = {
  screen: ['#FFFFFF', '#FFF8FC', '#FDEFF7'] as const,
  chosen: ['#FBD3EA', '#F7C2E2'] as const,
  /** degradê da marca (anel de porcentagem, quadrados das categorias) */
  brand: [brand.pink, brand.wine] as const,
  /** fundo da abertura */
  splash: ['#F7A8D6', brand.pink, '#E0158F'] as const,
};

/** Nunito Sans (carregada em app/_layout.tsx). Os nomes "serif*" ficaram por compatibilidade e apontam para a Nunito Sans. */
export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semibold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extrabold: 'NunitoSans_800ExtraBold',
  serif: 'NunitoSans_600SemiBold',
  serifSemi: 'NunitoSans_700Bold',
  serifBold: 'NunitoSans_800ExtraBold',
  serifItalic: 'NunitoSans_600SemiBold_Italic',
};

const BY_WEIGHT: Record<string, string> = {
  '100': fonts.regular, '200': fonts.regular, '300': fonts.regular, '400': fonts.regular, normal: fonts.regular,
  '500': fonts.medium, '600': fonts.semibold, '700': fonts.bold, bold: fonts.bold, '800': fonts.extrabold, '900': fonts.extrabold,
};

/** Troca fontWeight pela família Nunito Sans do peso certo (fonte própria + fontWeight falha em alguns Androids). */
export function withFont(style: TextStyle | TextStyle[] | undefined | null | false): TextStyle {
  const s = (StyleSheet.flatten(style as TextStyle) ?? {}) as TextStyle;
  if (s.fontFamily) return s;
  const family = BY_WEIGHT[String(s.fontWeight ?? '400')] ?? fonts.regular;
  const { fontWeight: _w, ...rest } = s;
  return { ...rest, fontFamily: family };
}

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const type = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 34 },
  title: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};
