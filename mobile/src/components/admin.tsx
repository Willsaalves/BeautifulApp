import { View } from 'react-native';

import type { AccountRow } from '@/api/admin';
import { Badge } from '@/components/ui';

export function AccountBadges({ a }: { a: AccountRow }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {a.deletedAt ? <Badge label="Excluída" tone="muted" /> : null}
      {a.suspendedAt ? <Badge label="Suspensa" tone="danger" /> : null}
      {a.admin ? <Badge label="Admin" /> : null}
      {a.professional ? <Badge label="Profissional" tone="success" /> : null}
      {a.client ? <Badge label="Cliente" tone="muted" /> : null}
      {a.openReports ? <Badge label={`${a.openReports} denúncia(s)`} tone="danger" /> : null}
    </View>
  );
}
