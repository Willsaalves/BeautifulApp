import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useStore } from '@/store/app-store';
import { colors, fonts } from '@/theme';

/** Sino com contador de não lidas; abre a caixa de notificações. */
export function Bell({ style, color = colors.text }: { style?: StyleProp<ViewStyle>; color?: string }) {
  const { unread } = useStore();
  return (
    <Pressable accessibilityLabel={unread ? `Notificações, ${unread} não lidas` : 'Notificações'} onPress={() => router.push('/notificacoes')} style={style}>
      <Ionicons name="notifications-outline" size={20} color={color} />
      {unread > 0 ? (
        <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: colors.cardSolid, fontSize: 10, fontFamily: fonts.extrabold }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
