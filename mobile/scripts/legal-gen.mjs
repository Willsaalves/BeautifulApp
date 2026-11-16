// Copia os Termos e a Política do backend (fonte única) para dentro do app, com as variáveis preenchidas.
// Rode depois de editar backend/src/main/resources/legal: npm run legal:gen
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '../../backend/src/main/resources/legal');
const vars = Object.fromEntries(
  readFileSync(join(dir, '_dados.yml'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes(':'))
    .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim().replace(/^"(.*)"$/, '$1')]),
);
const docs = {};
for (const slug of ['termos', 'privacidade']) {
  const md = readFileSync(join(dir, `${slug}.md`), 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
  docs[slug] = { title: md.match(/^# (.+)$/m)?.[1] ?? slug, markdown: md };
}
const out = `// Gerado por scripts/legal-gen.mjs a partir de backend/src/main/resources/legal. Não edite à mão.
export const LEGAL_VERSION = ${JSON.stringify(vars.versao ?? '1')};
export const LEGAL_VARS: Record<string, string> = ${JSON.stringify(vars, null, 2)};
export const LEGAL_DOCS = ${JSON.stringify(docs, null, 2)} as const;
export type LegalSlug = keyof typeof LEGAL_DOCS;
`;
writeFileSync(join(here, '../src/legal/docs.ts'), out);
console.log(`Textos legais versão ${vars.versao} gerados em src/legal/docs.ts`);
