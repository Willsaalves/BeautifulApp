import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import type { IconName } from './ui';

export interface TabDef {
  name: string;
  href: Href;
  label: string;
  icon: IconName;
}

/** Barra inferior flutuante preta, no estilo da referência (pílula "HOME" destacada). */
export function AppTabs({ tabs }: { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <Bar bottom={Math.max(insets.bottom, 10)}>
          {tabs.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton icon={t.icon} label={t.label} />
            </TabTrigger>
          ))}
        </Bar>
      </TabList>
    </Tabs>
  );
}

/** Barra vinho de ponta a ponta, cantos de cima arredondados (identidade Glammi). */
function Bar({ bottom, style, ...props }: TabListProps & { bottom: number }) {
  return <View {...props} style={[style, styles.wrap, { paddingBottom: bottom, height: 64 + bottom }]} />;
}

function TabButton({
  isFocused,
  icon,
  label,
  ref: _ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable {...props} accessibilityLabel={label} style={StyleSheet.flatten([styles.btn, isFocused && styles.btnActive])}>
      <Ionicons name={icon} size={20} color={colors.cardSolid} />
      {isFocused ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.wine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 8,
    shadowColor: colors.wine,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  btn: { height: 44, minWidth: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 },
  btnActive: { backgroundColor: colors.pink, paddingHorizontal: 16 },
  label: { fontSize: 12, fontFamily: 'Montserrat_700Bold', color: colors.cardSolid },
});
