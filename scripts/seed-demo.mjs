#!/usr/bin/env node
// Cria profissionais de teste de todos os nichos, em vários bairros, com portfólio completo:
// foto, capa, serviços (com opções), expediente, página com widgets (capa, galeria, trending,
// porcentagem, contagem, texto, fidelidade, avaliações), designs, estoque com baixa automática,
// stories, e clientes com atendimentos concluídos e avaliados.
//
// Uso (com a API rodando no perfil de desenvolvimento, código de login 123456):
//   node scripts/seed-demo.mjs
//   node scripts/seed-demo.mjs --api http://localhost:8080 --por-nicho 4 --clientes 8
//
// Rodar de novo é seguro: contas que já existem são puladas.
// Imagens: geradas pelo próprio script (PNG), sem precisar de internet.

import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- argumentos
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, []),
);
const API = (args.api ?? process.env.API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const PER_NICHE = Math.min(99, Math.max(1, Number(args['por-nicho'] ?? 4)));
const CLIENTS = Number(args.clientes ?? 8);
const OTP = args.codigo ?? '123456';

// ---------------------------------------------------------------- dados
const NEIGHBORHOODS = [
  ['Pinheiros', -23.5666, -46.6913], ['Moema', -23.6008, -46.665], ['Vila Mariana', -23.5891, -46.6345],
  ['Tatuapé', -23.5403, -46.576], ['Santana', -23.5025, -46.6254], ['Itaim Bibi', -23.5845, -46.678],
  ['Lapa', -23.528, -46.704], ['Mooca', -23.559, -46.599], ['Butantã', -23.571, -46.708],
  ['Perdizes', -23.536, -46.677], ['Jardins', -23.564, -46.66], ['Ipiranga', -23.589, -46.606],
];
const FIRST = ['Bruna', 'Camila', 'Larissa', 'Juliana', 'Fernanda', 'Patrícia', 'Aline', 'Renata', 'Carol', 'Bianca', 'Letícia', 'Mariana',
  'Gabriela', 'Thais', 'Vanessa', 'Natália', 'Priscila', 'Débora', 'Jéssica', 'Amanda', 'Rafaela', 'Tatiane', 'Paula', 'Isabela'];
const LAST = ['Souza', 'Oliveira', 'Lima', 'Costa', 'Ribeiro', 'Martins', 'Almeida', 'Rocha', 'Carvalho', 'Gomes', 'Barbosa', 'Freitas'];
const CLIENT_NAMES = ['Ana Paula Reis', 'Beatriz Nunes', 'Clara Moreira', 'Daniela Pires', 'Eduarda Melo', 'Flávia Teixeira',
  'Giovana Campos', 'Helena Duarte', 'Ingrid Prado', 'Joana Matos', 'Karina Vieira', 'Luiza Faria'];

const PALETTES = [
  ['#F7C9DA', '#CDBCE7', '#221A20'], ['#FAEDE6', '#F2B5C4', '#7A3E5C'], ['#EFE8F7', '#B9A3DE', '#3B2A4A'],
  ['#FDE2E4', '#E8A0BF', '#5C2A3E'], ['#E9F2EF', '#BFD8D2', '#2F4F4A'], ['#FFF1D6', '#F4C095', '#6B3F2A'],
];

const NICHES = {
  UNHA: {
    label: 'Nail designer', studio: ['Nails', 'Nail Studio', 'Unhas & Arte'], motif: 'nails',
    bio: 'Alongamento em gel, nail art e manutenção. Material esterilizado e hora marcada.',
    services: [
      { name: 'Alongamento em gel', durationMin: 150, price: 180, deposit: 30, ret: 21, options: [
        { label: 'Formato', choices: [['Quadrado', 0], ['Amendoado', 0], ['Stiletto', 15], ['Bailarina', 10]] },
        { label: 'Tamanho', choices: [['Curto', 0], ['Médio', 10], ['Longo', 25]] }] },
      { name: 'Manutenção de gel', durationMin: 90, price: 120, deposit: 30, ret: 21 },
      { name: 'Esmaltação em gel', durationMin: 60, price: 70, deposit: 20, ret: 14 },
    ],
    designs: [['PINK', 0], ['MEGA', 35], ['FRANCESINHA GLOW', 15], ['BORBOLETA', 25], ['CROMADO', 20]],
    products: [['Gel construtor', 'G', 300, 50, 0.6, 8], ['Lixa descartável', 'UN', 200, 40, 0.5, 2]],
  },
  CILIOS: {
    label: 'Lash designer', studio: ['Lash', 'Lash Studio', 'Olhar'], motif: 'lashes',
    bio: 'Extensão de cílios fio a fio e volume russo. Atendimento com hora marcada.',
    services: [
      { name: 'Volume russo', durationMin: 150, price: 220, deposit: 30, ret: 20, options: [
        { label: 'Efeito', choices: [['Clássico', 0], ['Gatinho', 20], ['Boneca', 20], ['Fox eyes', 30]] }] },
      { name: 'Fio a fio', durationMin: 120, price: 160, deposit: 30, ret: 20 },
      { name: 'Manutenção de cílios', durationMin: 90, price: 110, deposit: 20, ret: 15 },
    ],
    designs: [['EFEITO GATINHO', 0], ['FOX EYES', 30], ['WET LOOK', 20], ['BONECA', 20]],
    products: [['Fios de cílios (bandeja)', 'UN', 40, 8, 25, 1], ['Cola para cílios', 'ML', 30, 5, 12, 0.5]],
  },
  SOBRANCELHA: {
    label: 'Designer de sobrancelha', studio: ['Brows', 'Brow Bar', 'Sobrancelhas'], motif: 'brows',
    bio: 'Design de sobrancelha, henna e brow lamination com visagismo.',
    services: [
      { name: 'Design de sobrancelha', durationMin: 40, price: 55, deposit: 20, ret: 15 },
      { name: 'Design com henna', durationMin: 60, price: 75, deposit: 20, ret: 15 },
      { name: 'Brow lamination', durationMin: 75, price: 140, deposit: 30, ret: 45 },
    ],
    designs: [['NATURAL', 0], ['FIO A FIO', 30], ['LAMINADA', 40]],
    products: [['Pincel de sobrancelha', 'UN', 150, 30, 1.2, 1], ['Henna', 'G', 100, 20, 1.5, 2]],
  },
  ESTETICA: {
    label: 'Esteticista', studio: ['Estética', 'Skin Clinic', 'Harmonização'], motif: 'lips',
    bio: 'Harmonização, preenchimento labial, botox e limpeza de pele.',
    services: [
      { name: 'Preenchimento labial', durationMin: 60, price: 900, deposit: 30, ret: 180 },
      { name: 'Botox', durationMin: 45, price: 1200, deposit: 30, ret: 120 },
      { name: 'Limpeza de pele', durationMin: 90, price: 180, deposit: 20, ret: 30 },
    ],
    designs: [['LÁBIO RUSSO', 200], ['CONTORNO', 100], ['GLOW SKIN', 0]],
    products: [['Ácido hialurônico', 'ML', 20, 5, 150, 2], ['Máscara facial', 'UN', 60, 10, 4, 1]],
  },
  CABELO: {
    label: 'Cabeleireira', studio: ['Hair', 'Salão', 'Hair Studio'], motif: 'hair',
    bio: 'Corte, escova, mechas e tratamentos. Especialista em loiros.',
    services: [
      { name: 'Corte feminino', durationMin: 60, price: 120, deposit: 20, ret: 60 },
      { name: 'Escova modelada', durationMin: 60, price: 80, deposit: 20, ret: 7 },
      { name: 'Mechas', durationMin: 240, price: 450, deposit: 30, ret: 90, options: [
        { label: 'Comprimento', choices: [['Curto', 0], ['Médio', 60], ['Longo', 120]] }] },
    ],
    designs: [['MORENA ILUMINADA', 0], ['BLONDE', 80], ['CORTE BOB', 0], ['ONDAS', 0]],
    products: [['Pó descolorante', 'G', 1000, 200, 0.12, 60], ['Máscara de hidratação', 'G', 500, 100, 0.2, 30]],
  },
  DEPILACAO: {
    label: 'Depiladora', studio: ['Depil', 'Depilação', 'Pele Lisa'], motif: 'leaves',
    bio: 'Depilação com cera quente e fria. Ambiente higienizado e materiais descartáveis.',
    services: [
      { name: 'Perna inteira', durationMin: 50, price: 90, deposit: 20, ret: 30 },
      { name: 'Virilha completa', durationMin: 40, price: 70, deposit: 20, ret: 30 },
      { name: 'Buço', durationMin: 15, price: 25, deposit: 0, ret: 20 },
    ],
    designs: [['PELE LISA', 0], ['COMBO VERÃO', 40]],
    products: [['Cera quente', 'G', 2000, 300, 0.05, 80], ['Espátula descartável', 'UN', 300, 50, 0.1, 3]],
  },
};
const REVIEWS = [
  [5, 'Amei demais! Atendimento impecável e super cuidadosa. Já agendei a próxima.'],
  [5, 'Resultado perfeito, exatamente como a referência que mandei.'],
  [4, 'Muito bom! Só atrasou uns minutinhos, mas valeu a pena.'],
  [5, 'Ambiente lindo e limpinho. Recomendo para todas as amigas.'],
  [5, 'Melhor profissional que já fui, durou muito mais do que eu esperava.'],
  [4, 'Gostei bastante, preço justo e atendimento simpático.'],
];

// ---------------------------------------------------------------- utilidades
let seed = 20261116;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const cents = (r) => Math.round(r * 100);
const log = (...a) => console.log(...a);
const fmt = (p) => `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;

async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function login(phone) {
  await call('POST', '/auth/otp/request', { phone });
  return call('POST', '/auth/otp/verify', { phone, code: OTP });
}
const refresh = (s) => call('POST', '/auth/refresh', { refreshToken: s.refreshToken });

async function upload(token, kind, png) {
  const u = await call('POST', '/media/upload-url', { kind, contentType: 'image/png', sizeBytes: png.length }, token);
  const res = await fetch(u.uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png });
  if (!res.ok) throw new Error(`upload ${kind} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return u.key;
}

// ---------------------------------------------------------------- imagens (PNG gerado)
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const clamp = (x) => Math.max(0, Math.min(1, x));
const fill = (d, px) => clamp(0.5 - d / px); // anti-aliasing a partir da distância

// Distâncias com sinal (negativo = dentro)
const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
function sdCapsule(x, y, ax, ay, bx, by, r) {
  const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay;
  const t = clamp((px * dx + py * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - dx * t, py - dy * t) - r;
}
const sdEllipse = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
function sdArc(x, y, cx, cy, r, thick, a0, a1) {
  const ang = Math.atan2(y - cy, x - cx);
  if (ang < a0 || ang > a1) return 1e9;
  return Math.abs(Math.hypot(x - cx, y - cy) - r) - thick;
}

const cache = new Map();
/** Mesma combinação de motivo/paleta/variação reaproveita o PNG (bem mais rápido). */
function image(w, h, motif, palette, variant) {
  const key = [w, h, motif, palette.join(), variant % 9].join('|');
  if (!cache.has(key)) cache.set(key, render(w, h, motif, palette, variant % 9));
  return cache.get(key);
}

/** Desenha uma imagem w×h: fundo em degradê, bolhas suaves e o motivo do nicho. */
function render(w, h, motif, palette, variant) {
  const [c0, c1, c2] = palette.map(hex);
  const rgb = Buffer.alloc(w * h * 3);
  const s = Math.min(w, h);
  const px = 1.2;
  const bubbles = Array.from({ length: 7 }, () => [rnd() * w, rnd() * h, s * (0.05 + rnd() * 0.18), 0.12 + rnd() * 0.2]);
  const accent = mix(c1, c2, 0.35 + 0.3 * rnd());
  const tilt = (rnd() - 0.5) * 0.5;
  const shapes = buildMotif(motif, w, h, s, variant, tilt);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let col = mix(c0, c1, clamp((x / w) * 0.5 + (y / h) * 0.6));
      for (const [bx, by, br, ba] of bubbles) col = mix(col, [255, 255, 255], fill(sdCircle(x, y, bx, by, br), br * 0.6) * ba);
      for (const sh of shapes) {
        const d = sh.d(x, y);
        if (d > 2) continue;
        const a = fill(d, px) * (sh.alpha ?? 1);
        if (a <= 0) continue;
        const base = sh.color === 'dark' ? c2 : sh.color === 'white' ? [255, 255, 255] : accent;
        col = mix(col, base, a);
        if (sh.gloss) col = mix(col, [255, 255, 255], a * 0.35 * clamp(1 - (y - sh.gloss) / (s * 0.08)) * (y > sh.gloss ? 1 : 0));
      }
      const i = (y * w + x) * 3;
      rgb[i] = col[0]; rgb[i + 1] = col[1]; rgb[i + 2] = col[2];
    }
  }
  return encodePng(w, h, rgb);
}

function buildMotif(motif, w, h, s, variant, tilt) {
  const cx = w / 2, cy = h / 2, out = [];
  const rot = (x, y) => [cx + (x - cx) * Math.cos(tilt) - (y - cy) * Math.sin(tilt), cy + (x - cx) * Math.sin(tilt) + (y - cy) * Math.cos(tilt)];
  const R = (fn) => (x, y) => { const [rx, ry] = rot(x, y); return fn(rx, ry); };
  if (motif === 'avatar') {
    out.push({ d: (x, y) => sdCircle(x, y, cx, cy - s * 0.1, s * 0.2), color: 'dark' });
    out.push({ d: (x, y) => sdEllipse(x, y, cx, cy + s * 0.42, s * 0.36, s * 0.26), color: 'dark' });
    out.push({ d: (x, y) => sdEllipse(x, y, cx, cy - s * 0.2, s * 0.24, s * 0.16), color: 'accent' }); // cabelo
    return out;
  }
  if (motif === 'nails') {
    const n = 4 + (variant % 2);
    for (let i = 0; i < n; i++) {
      const x0 = cx + (i - (n - 1) / 2) * s * 0.16, len = s * (0.22 + 0.06 * Math.sin(i + variant)), top = cy - len / 2 - s * 0.03 * Math.abs(i - (n - 1) / 2) * -1;
      out.push({ d: R((x, y) => sdCapsule(x, y, x0, top, x0, top + len, s * 0.055)), color: i % 2 && variant % 3 === 0 ? 'white' : 'accent', gloss: top - s * 0.04 });
      if (variant % 3 === 1) out.push({ d: R((x, y) => sdCapsule(x, y, x0, top - s * 0.01, x0, top + s * 0.02, s * 0.05)), color: 'white', alpha: 0.9 });
    }
  } else if (motif === 'lashes') {
    out.push({ d: R((x, y) => sdArc(x, y, cx, cy + s * 0.25, s * 0.32, s * 0.012, -Math.PI * 0.85, -Math.PI * 0.15)), color: 'dark' });
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI * (0.82 - i * 0.045), r = s * 0.32, bx = cx + Math.cos(a) * r, by = cy + s * 0.25 + Math.sin(a) * r;
      const L = s * (0.08 + 0.05 * Math.sin((i / 14) * Math.PI)) * (variant % 2 ? 1.3 : 1);
      out.push({ d: R((x, y) => sdCapsule(x, y, bx, by, bx + Math.cos(a) * L - s * 0.02, by + Math.sin(a) * L, s * 0.006)), color: 'dark' });
    }
    out.push({ d: R((x, y) => sdEllipse(x, y, cx, cy + s * 0.12, s * 0.22, s * 0.09)), color: 'white', alpha: 0.85 });
    out.push({ d: R((x, y) => sdCircle(x, y, cx, cy + s * 0.12, s * 0.07)), color: 'accent' });
  } else if (motif === 'brows') {
    for (const side of [-1, 1]) {
      const bx = cx + side * s * 0.2;
      out.push({ d: R((x, y) => sdArc(side > 0 ? x : 2 * bx - x, y, bx, cy + s * 0.12, s * 0.2, s * (0.025 + 0.01 * (variant % 2)), -Math.PI * 0.9, -Math.PI * 0.35)), color: 'dark' });
      out.push({ d: R((x, y) => sdEllipse(x, y, bx, cy + s * 0.16, s * 0.1, s * 0.04)), color: 'white', alpha: 0.7 });
    }
  } else if (motif === 'lips') {
    out.push({ d: R((x, y) => Math.min(sdEllipse(x, y, cx - s * 0.1, cy - s * 0.02, s * 0.15, s * 0.08), sdEllipse(x, y, cx + s * 0.1, cy - s * 0.02, s * 0.15, s * 0.08))), color: 'accent', gloss: cy - s * 0.08 });
    out.push({ d: R((x, y) => sdEllipse(x, y, cx, cy + s * 0.08, s * 0.24, s * 0.1)), color: 'accent', gloss: cy + s * 0.02 });
    out.push({ d: R((x, y) => sdCapsule(x, y, cx - s * 0.2, cy + s * 0.025, cx + s * 0.2, cy + s * 0.025, s * 0.006)), color: 'dark', alpha: 0.6 });
    if (variant % 2) out.push({ d: (x, y) => sdCircle(x, y, cx + s * 0.28, cy - s * 0.25, s * 0.05), color: 'white' });
  } else if (motif === 'hair') {
    for (let k = 0; k < 6; k++) {
      const off = (k - 2.5) * s * 0.08;
      out.push({ d: (x, y) => Math.abs(x - cx - off - Math.sin(y / (s * 0.09) + k * 0.6 + variant) * s * 0.06) - s * 0.028, color: k % 2 ? 'accent' : 'dark', alpha: 0.85 });
    }
  } else if (motif === 'leaves') {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + variant * 0.3, lx = cx + Math.cos(a) * s * 0.16, ly = cy + Math.sin(a) * s * 0.16;
      out.push({ d: (x, y) => { const dx = x - lx, dy = y - ly, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); return sdEllipse(u, v, 0, 0, s * 0.15, s * 0.06); }, color: k % 2 ? 'accent' : 'white', alpha: 0.9 });
    }
    out.push({ d: (x, y) => sdCircle(x, y, cx, cy, s * 0.06), color: 'dark' });
  }
  return out;
}

// ---------------------------------------------------------------- criação
// (11) 95555-N0KK: N = nicho (1 a 6), KK = número da profissional no nicho
const proPhone = (n, k) => `1195555${n + 1}0${String(k + 1).padStart(2, '0')}`;
const clientPhone = (i) => `1195556${String(1001 + i)}`;

async function createClient(i) {
  const phone = clientPhone(i);
  let s = await login(phone);
  const me = await call('GET', '/me', undefined, s.accessToken);
  if (me.client) return { phone, name: me.client.name ?? CLIENT_NAMES[i % CLIENT_NAMES.length], s, existed: true };
  const name = CLIENT_NAMES[i % CLIENT_NAMES.length];
  const photoKey = await upload(s.accessToken, 'AVATAR', image(320, 320, 'avatar', pick(PALETTES), i));
  await call('POST', '/me/onboarding', { role: 'CLIENT', name, photoKey, acceptedTerms: true, imageConsent: true }, s.accessToken);
  s = await refresh(s);
  return { phone, name, s, existed: false };
}

async function createPro(i, n, nicheKey, k, clients) {
  const N = NICHES[nicheKey];
  const phone = proPhone(n, k);
  let s = await login(phone);
  const me = await call('GET', '/me', undefined, s.accessToken);
  if (me.professional) return { phone, name: me.professional.name, niche: nicheKey, hood: me.professional.neighborhood, existed: true };

  const [hood, lat, lng] = NEIGHBORHOODS[(n + k * 5) % NEIGHBORHOODS.length]; // cada nicho em bairros diferentes
  const name = `${FIRST[i % FIRST.length]} ${LAST[(n * 5 + k * 7 + k) % LAST.length]}`;
  const studio = `${N.studio[k % N.studio.length]} ${name.split(' ')[0]}`;
  const palette = PALETTES[(i + k) % PALETTES.length];
  const tok = () => s.accessToken;

  const photoKey = await upload(tok(), 'AVATAR', image(320, 320, 'avatar', palette, i));
  const coverKey = await upload(tok(), 'COVER', image(960, 340, N.motif, palette, i));
  await call('POST', '/me/onboarding', {
    role: 'PROFESSIONAL', name, studio, niche: nicheKey, neighborhood: hood, city: 'São Paulo',
    bio: N.bio, pixKey: `${name.split(' ')[0].toLowerCase()}${i}@pix.dev`, photoKey, coverKey,
    latitude: lat + (rnd() - 0.5) * 0.01, longitude: lng + (rnd() - 0.5) * 0.01, acceptedTerms: true, imageConsent: true,
  }, tok());
  s = await refresh(s);

  // expediente: seg a sáb (domingo = 0)
  await call('PUT', '/me/work-hours', [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: weekday === 6 ? '09:00:00' : '09:00:00', end: weekday === 6 ? '15:00:00' : '19:00:00' })), tok());

  // serviços
  const services = [];
  for (const sv of N.services) {
    services.push(await call('POST', '/me/services', {
      name: sv.name, niche: nicheKey, durationMin: sv.durationMin, priceCents: cents(Math.max(5, Math.round((sv.price * (0.9 + rnd() * 0.3)) / 5) * 5)),
      depositPercent: sv.deposit, returnIntervalDays: sv.ret, requiresReference: false,
      options: (sv.options ?? []).map((o) => ({ label: o.label, choices: o.choices.map(([label, d]) => ({ label, priceDeltaCents: cents(d) })) })),
    }, tok()));
  }

  // estoque + baixa automática no serviço principal
  const consumption = [];
  for (const [pname, unit, qty, min, cost, perService] of N.products) {
    const p = await call('POST', '/me/products', { name: pname, unit, minQuantity: min, lot: `L${2026}${String(i).padStart(3, '0')}` }, tok());
    await call('POST', `/me/products/${p.id}/purchases`, { quantity: qty, unitCostCents: cents(cost) }, tok());
    consumption.push({ productId: p.id, amount: perService });
  }
  await call('PUT', `/me/services/${services[0].id}/consumption`, consumption, tok());

  // designs (Trending)
  for (const [dname, delta] of N.designs) {
    const imageKey = await upload(tok(), 'DESIGN', image(420, 420, N.motif, palette, Math.floor(rnd() * 9)));
    await call('POST', '/me/designs', { serviceId: services[0].id, name: dname, imageKey, priceDeltaCents: cents(delta) }, tok());
  }

  // galeria
  const gallery = [];
  for (let g = 0; g < 6; g++) gallery.push(await upload(tok(), 'PORTFOLIO', image(420, 420, N.motif, PALETTES[(i + g) % PALETTES.length], g)));

  // fidelidade
  await call('PUT', '/me/loyalty-program', { enabled: true, goalCents: cents(pick([400, 500, 600, 800])), discountPercent: pick([10, 15, 20]) }, tok());

  // página (widgets) — SERVICOS e AGENDA são obrigatórios
  const in10 = new Date(Date.now() + (5 + Math.floor(rnd() * 20)) * 86400_000).toISOString();
  await call('PUT', '/me/page/widgets', [
    { type: 'CAPA', title: studio.toUpperCase(), subtitle: `${N.label} em ${hood}`, color: palette[1], imageKey: coverKey },
    { type: 'CONTAGEM', title: pick(['Black Friday: 20% OFF', 'Semana da noiva', 'Promo de aniversário do studio']), subtitle: 'Termina em', target: in10 },
    { type: 'TRENDING', title: 'Trending Designs' },
    { type: 'SERVICOS', title: 'Serviços' },
    { type: 'AGENDA', title: 'Próximos horários livres' },
    { type: 'PORCENTAGEM', title: 'Agenda do mês', subtitle: 'já preenchida — garanta seu horário', value: 55 + Math.floor(rnd() * 40) },
    { type: 'GALERIA', title: 'Portfólio', images: gallery },
    { type: 'TEXTO', title: 'Sobre mim', body: `${N.bio} Atendo em ${hood} há ${2 + Math.floor(rnd() * 8)} anos. 💜` },
    { type: 'FIDELIDADE', title: 'Cartão fidelidade' },
    { type: 'AVALIACOES', title: 'Depoimentos' },
  ], tok());

  // stories da profissional
  const proId = (await call('GET', '/me', undefined, tok())).professional.id;
  for (let st = 0; st < 2; st++) {
    const imageKey = await upload(tok(), 'STORY', image(405, 720, N.motif, palette, st + 3));
    await call('POST', '/stories', { professionalId: proId, imageKey, caption: pick(['Resultado de hoje ✨', 'Agenda aberta para a semana!', 'Amei esse 💜']), serviceName: services[0].name }, tok());
  }

  // atendimentos: concluídos+avaliados, um confirmado e um com comprovante para conferir
  const stats = { reviews: 0, open: 0 };
  const nClients = clients.length;
  const plan = ['review', 'review', 'review', 'confirmed', 'receipt'];
  let day = 1;
  for (let a = 0; a < plan.length && nClients; a++) {
    const client = clients[(i + a) % nClients];
    const svc = services[a % services.length];
    const slot = await findSlot(proId, svc.id, day, client.s.accessToken);
    if (!slot) break;
    day = slot.day;
    const selections = (svc.options ?? []).map((o) => ({ optionId: o.id, choiceId: o.choices[Math.floor(rnd() * o.choices.length)].id }));
    let ap = await call('POST', '/appointments', { serviceId: svc.id, startsAt: slot.start, selections, notes: 'Criado pelo seed de testes' }, client.s.accessToken);
    if (ap.status === 'AWAITING_DEPOSIT') {
      const receiptKey = await upload(client.s.accessToken, 'RECEIPT', image(360, 640, 'leaves', PALETTES[4], a));
      ap = await call('POST', `/appointments/${ap.id}/receipt`, { receiptKey }, client.s.accessToken);
    }
    if (plan[a] === 'receipt') { stats.open++; continue; }
    if (ap.status === 'RECEIPT_SENT') ap = await call('POST', `/appointments/${ap.id}/confirm-deposit`, {}, tok());
    if (plan[a] === 'confirmed') { stats.open++; continue; }
    await call('POST', `/appointments/${ap.id}/complete`, {}, tok());
    const [rating, comment] = pick(REVIEWS);
    await call('POST', `/appointments/${ap.id}/review`, { rating, comment }, client.s.accessToken);
    stats.reviews++;
    if (a === 0) {
      const imageKey = await upload(client.s.accessToken, 'STORY', image(405, 720, N.motif, palette, 7));
      await call('POST', '/stories', { professionalId: proId, imageKey, caption: 'Amei o resultado! 😍', serviceName: svc.name }, client.s.accessToken).catch(() => {});
    }
  }
  // favoritas
  for (const c of clients.slice(0, 2 + (i % 3))) await call('PUT', `/me/favorites/${proId}`, undefined, c.s.accessToken).catch(() => {});

  return { phone, name, studio, niche: nicheKey, hood, existed: false, ...stats };
}

async function findSlot(proId, serviceId, fromDay, token) {
  for (let d = fromDay; d < fromDay + 14; d++) {
    const date = new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
    const slots = await call('GET', `/professionals/${proId}/availability?date=${date}&serviceId=${serviceId}`, undefined, token);
    const free = slots.filter((x) => x.status === 'FREE');
    if (free.length) return { start: free[Math.floor(rnd() * Math.min(free.length, 6))].start, day: d };
  }
  return null;
}

// ---------------------------------------------------------------- main
async function main() {
  log(`API: ${API}`);
  try {
    const h = await call('GET', '/actuator/health');
    if (h.status !== 'UP') throw new Error(h.status);
  } catch (e) {
    console.error(`A API não respondeu em ${API} (${e.message}). Suba o backend antes (gradlew bootRun).`);
    process.exit(1);
  }

  log(`\nCriando ${CLIENTS} clientes…`);
  const clients = [];
  for (let c = 0; c < CLIENTS; c++) {
    clients.push(await createClient(c));
    process.stdout.write(clients.at(-1).existed ? 'o' : '+');
  }

  const niches = Object.keys(NICHES);
  log(`\n\nCriando ${niches.length * PER_NICHE} profissionais (${PER_NICHE} por nicho)…`);
  const pros = [];
  for (const [n, niche] of niches.entries()) {
    for (let k = 0; k < PER_NICHE; k++) {
      const i = k * niches.length + n; // espalha os nichos pelos bairros
      try {
        const p = await createPro(i, n, niche, k, clients);
        pros.push(p);
        log(`  ${p.existed ? '·' : '✓'} ${p.name.padEnd(22)} ${NICHES[niche].label.padEnd(24)} ${String(p.hood ?? '').padEnd(13)} ${p.existed ? '(já existia)' : `${p.reviews} avaliações, ${p.open} em aberto`}`);
      } catch (e) {
        log(`  ✗ ${fmt(proPhone(n, k))} (${niche}): ${e.message}`);
      }
    }
  }

  log('\nPronto! Login no app com o código 123456:');
  log(`  Clientes:       ${fmt(clientPhone(0))} até ${fmt(clientPhone(CLIENTS - 1))}`);
  log('  Profissionais:');
  for (const [n, niche] of niches.entries()) log(`    ${NICHES[niche].label.padEnd(24)} ${fmt(proPhone(n, 0))} até ${fmt(proPhone(n, PER_NICHE - 1))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
