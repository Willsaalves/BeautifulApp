import { useWindowDimensions } from 'react-native';

/** Largura de referência dos layouts (iPhone 14/15). */
const BASE = 390;

/** Até onde a fonte do sistema (acessibilidade) pode crescer sem quebrar o layout. */
export const MAX_FONT_SCALE = 1.3;

/** Largura máxima do conteúdo: em tablet/dobrável o app vira uma coluna centralizada, em vez de esticar. */
export const MAX_CONTENT_WIDTH = 560;

/**
 * Medidas que acompanham a tela: k é o fator de escala (0,85 no iPhone SE / Android pequeno, 1 no iPhone padrão,
 * até 1,1 nos grandes). Use s(n) para tamanhos de ícones, quadrados e fontes de destaque.
 */
export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const k = Math.max(0.85, Math.min(1.1, contentWidth / BASE));
  return {
    width,
    height,
    contentWidth,
    k,
    s: (n: number) => Math.round(n * k),
    small: width < 360,
    short: height < 700,
    wide: width >= 600,
    fontScale: Math.min(fontScale, MAX_FONT_SCALE),
  };
}
