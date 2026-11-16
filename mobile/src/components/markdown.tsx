import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, T } from '@/components/ui';
import { colors, fonts, space } from '@/theme';

// Markdown do jeito que os textos legais usam: # títulos, parágrafos, - listas, | tabelas |, **negrito** e [links](termos).

function Inline({ text, v = 'body' }: { text: string; v?: 'body' | 'small' }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([a-z-]+\))/g).filter(Boolean);
  return (
    <T v={v === 'small' ? 'small' : undefined} style={{ lineHeight: v === 'small' ? 20 : 23 }}>
      {parts.map((p, i) => {
        if (p.startsWith('**')) return <T key={i} v={v === 'small' ? 'small' : undefined} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</T>;
        const link = /^\[([^\]]+)\]\(([a-z-]+)\)$/.exec(p);
        if (link) {
          return (
            <T key={i} v={v === 'small' ? 'small' : undefined} color={colors.lilacDeep} style={{ textDecorationLine: 'underline' }}
              onPress={() => router.push(`/legal/${link[2]}`)}>{link[1]}</T>
          );
        }
        return p;
      })}
    </T>
  );
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n');
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(<Inline key={`p${out.length}`} text={para.join(' ')} />);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        if (!/^\|[\s|:-]+\|$/.test(row)) rows.push(row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      i--;
      const [head, ...body] = rows;
      out.push(
        <View key={`t${out.length}`} style={{ gap: space.sm }}>
          {body.map((r, j) => (
            <Card key={j} style={{ padding: space.md, gap: 4 }}>
              {r.map((c, k) => (
                <View key={k}>
                  <T v="overline" muted>{head[k]}</T>
                  <Inline text={c} v="small" />
                </View>
              ))}
            </Card>
          ))}
        </View>,
      );
    } else if (t.startsWith('- ')) {
      flush();
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) items.push(lines[i++].trim().slice(2));
      i--;
      out.push(
        <View key={`l${out.length}`} style={{ gap: 6 }}>
          {items.map((it, j) => (
            <View key={j} style={{ flexDirection: 'row', gap: space.sm }}>
              <T style={{ lineHeight: 23 }}>•</T>
              <View style={{ flex: 1 }}><Inline text={it} /></View>
            </View>
          ))}
        </View>,
      );
    } else if (t.startsWith('# ')) {
      flush();
      out.push(<T key={`h${out.length}`} style={{ fontFamily: fonts.serifSemi, fontSize: 32, lineHeight: 38 }}>{t.slice(2)}</T>);
    } else if (t.startsWith('## ')) {
      flush();
      out.push(<T key={`h${out.length}`} v="h3" style={{ fontSize: 18, marginTop: space.md }}>{t.slice(3)}</T>);
    } else if (!t) {
      flush();
    } else {
      para.push(t);
    }
  }
  flush();
  return <View style={{ gap: space.md }}>{out}</View>;
}
