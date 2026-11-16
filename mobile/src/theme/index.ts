// Paleta da referência visual (colorselect): lilás #CDBCE7, preto #010101, off-white #E7E3E4
export const colors = {
  lilac: '#CDBCE7',
  lilacSoft: '#EFE8F7',
  lilacDeep: '#9F86C9',
  black: '#010101',
  offWhite: '#E7E3E4',
  bg: '#F4F1F3',
  card: '#FFFFFF',
  text: '#010101',
  textMuted: '#6E6A6C',
  border: '#E2DDE0',
  success: '#3E9B6E',
  warning: '#D9922E',
  danger: '#D2525B',
  cream: '#F6EEDD',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.8, lineHeight: 36 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};
