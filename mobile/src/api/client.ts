import createClient, { type Middleware } from 'openapi-fetch';

import type { components, paths } from './schema';
import { loadSession, saveSession } from './tokens';

/**
 * URL da API (ex: EXPO_PUBLIC_API_URL=http://192.168.0.10:8080).
 * Sem ela o app continua no modo protótipo, com dados de exemplo.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
export const API_ENABLED = API_URL.length > 0;

export type Schemas = components['schemas'];
export type Me = Schemas['Me'];

/** Erro no formato ProblemDetail do backend ({ code, detail, fields }). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const s = await loadSession();
  if (!s) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: s.refreshToken }),
  });
  if (!res.ok) {
    await saveSession(null);
    return false;
  }
  const body = (await res.json()) as Schemas['Session'];
  await saveSession({ accessToken: body.accessToken!, refreshToken: body.refreshToken! });
  return true;
}

const auth: Middleware = {
  async onRequest({ request }) {
    const s = await loadSession();
    if (s && !request.url.includes('/auth/')) request.headers.set('Authorization', `Bearer ${s.accessToken}`);
    return request;
  },
  async onResponse({ request, response }) {
    // access token vence a cada 15 min: renova uma vez e repete a chamada
    if (response.status === 401 && !request.url.includes('/auth/')) {
      refreshing ??= refreshSession().finally(() => { refreshing = null; });
      if (await refreshing) {
        const s = await loadSession();
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => { headers[k] = v; });
        headers.Authorization = `Bearer ${s!.accessToken}`;
        const method = request.method.toUpperCase();
        const body = method === 'GET' || method === 'HEAD' ? undefined : await request.clone().text();
        const retry = await fetch(request.url, { method, headers, body: body || undefined });
        // O openapi-fetch exige uma instância do Response global; no iOS o fetch nativo usa outra classe.
        const text = await retry.text();
        const outHeaders: Record<string, string> = {};
        retry.headers.forEach((v, k) => { outHeaders[k] = v; });
        return new Response(text, { status: retry.status, statusText: retry.statusText, headers: outHeaders });
      }
    }
    // sem alteração: não devolver nada (devolver a mesma resposta quebra no iOS)
    return undefined;
  },
};

/**
 * No React Native, repassar um objeto Request para o fetch nativo nem sempre funciona bem.
 * Aqui desmontamos em (url, init) com o corpo já como texto.
 */
async function rnFetch(input: Request | string | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' || input instanceof URL) return fetch(input, init);
  const headers: Record<string, string> = {};
  input.headers.forEach((v, k) => { headers[k] = v; });
  const method = input.method?.toUpperCase() ?? 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : await input.clone().text();
  return fetch(input.url, { method, headers, body: body || undefined });
}

export const api = createClient<paths>({ baseUrl: API_URL, fetch: rnFetch });
api.use(auth);

/** Converte a resposta do openapi-fetch em dado ou ApiError com a mensagem do backend. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let r: { data?: T; error?: unknown; response: Response };
  try {
    r = await p;
  } catch (err) {
    if (__DEV__) console.warn('[api] falha de rede', API_URL, err);
    throw new ApiError(
      0,
      'NETWORK',
      __DEV__
        ? `Sem conexão com a API em ${API_URL} (${(err as Error)?.message ?? err}). Teste ${API_URL}/actuator/health no navegador do celular.`
        : 'Sem conexão com o servidor. Verifique sua internet.',
    );
  }
  if (r.response.ok) return r.data as T;
  const e = (r.error ?? {}) as { code?: string; detail?: string; fields?: Record<string, string> };
  const firstField = e.fields ? Object.values(e.fields)[0] : undefined;
  throw new ApiError(r.response.status, e.code ?? 'UNKNOWN', firstField ?? e.detail ?? 'Algo deu errado. Tente de novo.', e.fields);
}
