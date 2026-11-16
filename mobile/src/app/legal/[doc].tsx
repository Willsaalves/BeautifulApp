import { useLocalSearchParams } from 'expo-router';

import { Header, Screen, T } from '@/components/ui';
import { Markdown } from '@/components/markdown';
import { LEGAL_DOCS, type LegalSlug } from '@/legal/docs';

// Termos de Uso / Política de Privacidade dentro do app (mesmo texto da página pública da API).
export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = LEGAL_DOCS[doc as LegalSlug];
  return (
    <Screen bottomInset={40}>
      <Header />
      {d ? <Markdown source={d.markdown} /> : <T muted>Documento não encontrado.</T>}
    </Screen>
  );
}
