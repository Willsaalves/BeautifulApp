import * as ImagePicker from 'expo-image-picker';

/** Abre a galeria e devolve a URI local da imagem (ou null se cancelar). Upload para S3 vem com o backend. */
export async function pickImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}
