import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Tokens no Keychain/Keystore (nativo). No web (só desenvolvimento) cai para localStorage.
const KEY = 'beautifulapp.session';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

let cache: StoredSession | null | undefined;

export async function loadSession(): Promise<StoredSession | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    cache = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveSession(s: StoredSession | null) {
  cache = s;
  try {
    if (Platform.OS === 'web') {
      if (s) globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
      else globalThis.localStorage?.removeItem(KEY);
    } else if (s) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // armazenamento indisponível: a sessão vale só enquanto o app está aberto
  }
}
