import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { pickImage } from '@/lib/pick-image';
import { colors, radius } from '@/theme';

import { Avatar } from './ui';

/** Cabeçalho estilo Twitter: capa larga + foto de perfil sobreposta no canto esquerdo. */
export function ProfileHeader({
  name,
  color,
  photo,
  cover,
  editable,
  onChangePhoto,
  onChangeCover,
  right,
  rounded = true,
}: {
  name: string;
  color?: string;
  photo?: string;
  cover?: string;
  editable?: boolean;
  onChangePhoto?: (uri: string) => void;
  onChangeCover?: (uri: string) => void;
  right?: React.ReactNode;
  rounded?: boolean;
}) {
  const AVATAR = 92;
  return (
    <View>
      <Pressable
        disabled={!editable}
        accessibilityLabel="Trocar capa"
        onPress={async () => { const uri = await pickImage(); if (uri) onChangeCover?.(uri); }}
        style={{ height: 150, borderRadius: rounded ? radius.xl : 0, overflow: 'hidden' }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <LinearGradient colors={[colors.blush, colors.lilac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        )}
        {editable ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: 'rgba(1,1,1,0.55)', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={22} color={colors.cardSolid} />
            </View>
          </View>
        ) : null}
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -AVATAR / 2, paddingHorizontal: 12 }}>
        <Pressable
          disabled={!editable}
          accessibilityLabel="Trocar foto de perfil"
          onPress={async () => { const uri = await pickImage(); if (uri) onChangePhoto?.(uri); }}>
          <View style={{ borderRadius: AVATAR, borderWidth: 4, borderColor: colors.bg }}>
            <Avatar name={name || '?'} color={color} photo={photo} size={AVATAR} />
          </View>
          {editable ? (
            <View style={{ position: 'absolute', right: 2, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}>
              <Ionicons name="camera" size={14} color={colors.cardSolid} />
            </View>
          ) : null}
        </Pressable>
        <View style={{ paddingBottom: 4 }}>{right}</View>
      </View>
    </View>
  );
}

export const handleOf = (name: string) =>
  '@' +
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^dra?\.\s*/, '')
    .replace(/[^a-z0-9]+/g, '');
