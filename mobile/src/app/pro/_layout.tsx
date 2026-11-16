import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProSync } from '@/api/use-pro-sync';
import { AppTabs } from '@/components/tab-bar';
import { T } from '@/components/ui';
import { colors } from '@/theme';

export default function ProLayout() {
  const { saving, error } = useProSync();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <AppTabs
        tabs={[
          { name: 'index', href: '/pro', label: 'Home', icon: 'home' },
          { name: 'agenda', href: '/pro/agenda', label: 'Agenda', icon: 'calendar' },
          { name: 'clientes', href: '/pro/clientes', label: 'Clientes', icon: 'people' },
          { name: 'lucro', href: '/pro/lucro', label: 'Lucro', icon: 'trending-up' },
          { name: 'estoque', href: '/pro/estoque', label: 'Estoque', icon: 'cube' },
          { name: 'perfil', href: '/pro/perfil', label: 'Perfil', icon: 'color-palette' },
        ]}
      />
      {saving || error ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 6, alignSelf: 'center', backgroundColor: error ? colors.danger : colors.black, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <T v="small" color={colors.cardSolid}>{error ? `Não salvou: ${error}` : 'Salvando página…'}</T>
        </View>
      ) : null}
    </View>
  );
}
