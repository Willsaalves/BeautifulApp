import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

let cached: Coords | null | undefined;

/** Localização atual (pede permissão uma vez). Devolve null se negada ou indisponível. */
export async function currentCoords(force = false): Promise<Coords | null> {
  if (cached !== undefined && !force) return cached;
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return (cached = null);
    const last = await Location.getLastKnownPositionAsync();
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    cached = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    cached = null;
  }
  return cached;
}
