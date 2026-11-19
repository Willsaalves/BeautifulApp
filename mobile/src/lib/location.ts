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

let placeCache: string | null | undefined;

/** "Perdizes, São Paulo" a partir da localização (só com permissão; no navegador pode não estar disponível). */
export async function currentPlaceLabel(): Promise<string | null> {
  if (placeCache !== undefined) return placeCache;
  const c = await currentCoords();
  if (!c) return (placeCache = null);
  try {
    const [p] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    const district = p?.district || p?.subregion || p?.name;
    const city = p?.city || p?.subregion || p?.region;
    placeCache = [district, city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ') || null;
  } catch {
    placeCache = null;
  }
  return placeCache;
}
