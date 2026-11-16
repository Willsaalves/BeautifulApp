// Paleta escolhida pela Bruna: pastel lavanda → pêssego, cards brancos translúcidos,
// ameixa escuro no lugar do preto e destaque em degradê rosa → lavanda.
export const colors = {
  lilac: '#E8DCF2',       // destaque suave (lavanda)
  lilacSoft: '#F4EEF8',
  lilacDeep: '#B78DBF',   // anéis, barras de progresso
  blush: '#F6D5E2',       // rosa do "escolhido"
  black: '#221A20',       // ameixa escuro (botões, textos fortes, barra inferior)
  plumSoft: '#3A2F37',
  offWhite: '#EFE7EC',
  bg: '#F5EEF1',
  card: 'rgba(255,255,255,0.82)',
  cardSolid: '#FFFFFF',
  text: '#221A20',
  textMuted: '#8C8088',
  border: '#ECE2E7',
  success: '#4E9C7A',
  warning: '#C9894A',
  danger: '#C95668',
  cream: '#FBEDE6',       // pêssego
  pink: '#F7C9DA',        // rosa do botão principal da home
  plumDeep: '#24171F',    // fundo do destaque da home
};

/** Fundo das telas (degradê lavanda → pêssego) e destaque "escolhido". */
export const gradients = {
  screen: ['#EFE8F7', '#F7EEF2', '#FAEDE6'] as const,
  chosen: ['#F6D3E1', '#E6D6F5'] as const,
};

/** Playfair Display (carregada em app/_layout.tsx) para títulos de destaque, estilo editorial. */
export const fonts = {
  serif: 'PlayfairDisplay_500Medium',
  serifSemi: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_500Medium_Italic',
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
