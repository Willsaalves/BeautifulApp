import { api, ApiError, unwrap, type Schemas } from './client';

type Kind = Schemas['UploadRequest']['kind'];

/**
 * Envia uma imagem local (URI do image picker) direto para o storage via URL pré-assinada.
 * Devolve a chave para salvar no perfil (photoKey/coverKey…).
 */
export async function uploadImage(kind: Kind, uri: string): Promise<{ key: string; publicUrl?: string }> {
  const file = await (await fetch(uri)).blob();
  const contentType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const up = await unwrap(api.POST('/media/upload-url', { body: { kind, contentType, sizeBytes: file.size } }));
  const put = await fetch(up.uploadUrl!, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!put.ok) throw new ApiError(put.status, 'UPLOAD_FAILED', 'Não foi possível enviar a imagem. Tente de novo.');
  return { key: up.key!, publicUrl: up.publicUrl };
}

/** URIs locais precisam de upload; URLs http(s) já estão no storage. */
export const isLocalUri = (uri?: string) => !!uri && !/^https?:/.test(uri);
