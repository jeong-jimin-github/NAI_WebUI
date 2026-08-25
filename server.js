import express from 'express';
import { argon2id, blake2b } from 'hash-wasm';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_HOST = 'https://api.novelai.net';
const IMAGE_HOST = 'https://image.novelai.net';

app.disable('x-powered-by');
app.use(express.json({ limit: '96mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.static('public', { extensions: ['html'] }));

const bearerHeaders = (token, includeJson = true) => ({
  Authorization: `Bearer ${token}`,
  Accept: '*/*',
  ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  Origin: 'https://novelai.net',
  Referer: 'https://novelai.net/',
});

function getToken(req) {
  const token = String(req.get('X-NAI-Token') || '').trim();
  if (token.length < 16) {
    const error = new Error('NovelAI access token is required.');
    error.status = 401;
    throw error;
  }
  return token;
}

async function deriveAccessKey(email, password) {
  const preSalt = `${password.slice(0, 6)}${email}novelai_data_access_key`;
  const saltHex = await blake2b(preSalt, 128);
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
  const key = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 1953,
    hashLength: 64,
    outputType: 'binary',
  });
  return Buffer.from(key).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '').slice(0, 64);
}

function summarizeSubscription(data) {
  const fixed = Number(data?.trainingStepsLeft?.fixedTrainingStepsLeft || 0);
  const purchased = Number(data?.trainingStepsLeft?.purchasedTrainingSteps || 0);
  const tier = Number(data?.tier ?? 0);
  return {
    tier,
    tierName: ['Paper', 'Tablet', 'Scroll', 'Opus'][tier] || `Tier ${tier}`,
    anlas: fixed + purchased,
    fixedAnlas: fixed,
    purchasedAnlas: purchased,
    expiresAt: data?.expiresAt ?? null,
    active: Boolean(data?.active ?? tier > 0),
    perks: data?.perks ?? {},
  };
}

async function readError(response) {
  const type = response.headers.get('content-type') || '';
  try {
    if (type.includes('json')) return JSON.stringify(await response.json());
    return (await response.text()).slice(0, 4000);
  } catch { return `${response.status} ${response.statusText}`; }
}

async function fetchSubscription(token) {
  let lastError;
  for (const host of [API_HOST, IMAGE_HOST]) {
    const response = await fetch(`${host}/user/subscription`, {
      headers: bearerHeaders(token, false),
    });
    if (response.ok) return response.json();
    lastError = new Error(await readError(response));
    lastError.status = response.status;
  }
  throw lastError || new Error('Unable to load subscription.');
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'NAI WebUI' }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const key = await deriveAccessKey(email, password);
    const response = await fetch(`${API_HOST}/user/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await readError(response) });
    const login = await response.json();
    if (!login?.accessToken) return res.status(502).json({ error: 'NovelAI did not return an access token.' });
    const subscription = summarizeSubscription(await fetchSubscription(login.accessToken));
    res.json({ accessToken: login.accessToken, subscription });
  } catch (error) { next(error); }
});

app.post('/api/auth/token', async (req, res, next) => {
  try {
    const token = getToken(req);
    res.json({ ok: true, subscription: summarizeSubscription(await fetchSubscription(token)) });
  } catch (error) { next(error); }
});

app.post('/api/nai/subscription', async (req, res, next) => {
  try {
    res.json({ subscription: summarizeSubscription(await fetchSubscription(getToken(req))) });
  } catch (error) { next(error); }
});

async function proxyBinary(req, res, next, url) {
  try {
    const response = await fetch(url, {
      method: 'POST', headers: bearerHeaders(getToken(req)), body: JSON.stringify(req.body || {}),
    });
    if (!response.ok) return res.status(response.status).json({ error: await readError(response) });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.send(buffer);
  } catch (error) { next(error); }
}

app.post('/api/nai/generate', (req, res, next) => proxyBinary(req, res, next, `${IMAGE_HOST}/ai/generate-image`));
app.post('/api/nai/augment', (req, res, next) => proxyBinary(req, res, next, `${IMAGE_HOST}/ai/augment-image`));
app.post('/api/nai/upscale', (req, res, next) => proxyBinary(req, res, next, `${API_HOST}/ai/upscale`));
app.post('/api/nai/encode-vibe', (req, res, next) => proxyBinary(req, res, next, `${IMAGE_HOST}/ai/encode-vibe`));

app.get('/api/nai/tags', async (req, res, next) => {
  try {
    const url = new URL(`${IMAGE_HOST}/ai/generate-image/suggest-tags`);
    url.searchParams.set('model', String(req.query.model || 'nai-diffusion-5-curated'));
    url.searchParams.set('prompt', String(req.query.prompt || '').slice(0, 256));
    url.searchParams.set('lang', req.query.lang === 'jp' ? 'jp' : 'en');
    const response = await fetch(url, { headers: bearerHeaders(getToken(req), false) });
    if (!response.ok) return res.status(response.status).json({ error: await readError(response) });
    res.json(await response.json());
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  res.status(Number(error?.status || 500)).json({ error: error?.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`NAI WebUI listening on http://0.0.0.0:${PORT}`));
