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
        <Bar bottom={Math.max(insets.bottom, 12)}>
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

function Bar({ bottom, style, ...props }: TabListProps & { bottom: number }) {
  return <View {...props} style={[style, styles.wrap, { bottom }]} />;
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
      <Ionicons name={icon} size={18} color={isFocused ? colors.black : colors.card} />
      {isFocused ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  btn: { height: 46, minWidth: 42, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 },
  btnActive: { backgroundColor: colors.lilac, paddingHorizontal: 14 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.black },
});
