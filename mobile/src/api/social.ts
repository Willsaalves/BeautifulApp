// Fase 5: notificações, push, stories, chat e próximos procedimentos.
import type { ChatMessage, Dream, Niche, Story } from '@/domain/types';

import { api, unwrap, type Schemas } from './client';
import { uploadImage } from './media';

// ---------- notificações ----------

export const inbox = () => unwrap(api.GET('/me/notifications', { params: { query: { limit: 50 } } }));
export const readAll = () => unwrap(api.POST('/me/notifications/read-all'));
export const registerDevice = (expoPushToken: string, platform: string) =>
  unwrap(api.POST('/me/devices', { body: { expoPushToken, platform } }));
export const unregisterDevice = (expoPushToken: string) =>
  unwrap(api.POST('/me/devices/unregister', { body: { expoPushToken } }));

// ---------- stories ----------

export const storyFromApi = (s: Schemas['StoryView']): Story => ({
  id: s.id!,
  authorType: s.authorType === 'PROFESSIONAL' ? 'profissional' : 'cliente',
  authorId: s.authorAccountId!,
  professionalId: s.professionalId!,
  image: s.imageUrl ?? '',
  caption: s.caption ?? '',
  createdAt: s.createdAt ?? new Date().toISOString(),
  authorName: s.authorName,
  professionalStudio: s.professionalStudio,
  authorPhoto: s.authorPhotoUrl,
  serviceName: s.serviceName,
  mine: s.mine,
});

export const activeStories = async () => (await unwrap(api.GET('/stories'))).map(storyFromApi);

export async function postStory(input: { professionalId: string; imageUri: string; caption: string; serviceName?: string }) {
  const { key } = await uploadImage('STORY', input.imageUri);
  return storyFromApi(
    await unwrap(api.POST('/stories', { body: { professionalId: input.professionalId, imageKey: key, caption: input.caption || undefined, serviceName: input.serviceName } })),
  );
}

// ---------- chat ----------

export const messageFromApi = (appointmentId: string, m: Schemas['MessageView']): ChatMessage => ({
  id: m.id!,
  appointmentId,
  from: m.from === 'PROFESSIONAL' ? 'profissional' : 'cliente',
  text: m.text ?? '',
  createdAt: m.createdAt ?? new Date().toISOString(),
});

export const listMessages = async (appointmentId: string) =>
  (await unwrap(api.GET('/appointments/{id}/messages', { params: { path: { id: appointmentId } } }))).map((m) => messageFromApi(appointmentId, m));

export const sendMessage = async (appointmentId: string, text: string) =>
  messageFromApi(appointmentId, await unwrap(api.POST('/appointments/{id}/messages', { params: { path: { id: appointmentId } }, body: { text } })));

// ---------- próximos procedimentos ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dreamsFromApi = (list: Schemas['Item'][]): Dream[] =>
  list.map((d) => ({ id: d.id!, niche: (d.niche ?? 'UNHA').toLowerCase() as Niche, label: d.label ?? '', targetDate: d.targetDate ?? '', done: d.done ?? false }));

export const myNextProcedures = async () => dreamsFromApi(await unwrap(api.GET('/me/next-procedures')));

export const saveNextProcedures = async (dreams: Dream[]) =>
  dreamsFromApi(
    await unwrap(
      api.PUT('/me/next-procedures', {
        body: dreams.map((d) => ({
          id: UUID_RE.test(d.id) ? d.id : undefined,
          niche: d.niche.toUpperCase() as Schemas['Item']['niche'],
          label: d.label,
          targetDate: d.targetDate.slice(0, 10),
          done: d.done,
        })),
      }),
    ),
  );
