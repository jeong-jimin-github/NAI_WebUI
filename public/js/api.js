import { TIER_NAMES } from './config.js';
import { deriveAccessKey } from './crypto.js';

const API_HOST = 'https://api.novelai.net';
const IMAGE_HOST = 'https://image.novelai.net';
const TEXT_HOST = 'https://text.novelai.net';

function summarizeSubscription(raw) {
  const fixed = Number(raw?.trainingStepsLeft?.fixedTrainingStepsLeft || 0);
  const purchased = Number(raw?.trainingStepsLeft?.purchasedTrainingSteps || 0);
  const tier = Number(raw?.tier ?? 0);
  return {
    tier,
    tierName: TIER_NAMES[tier] || `Tier ${tier}`,
    anlas: fixed + purchased,
    fixedAnlas: fixed,
    purchasedAnlas: purchased,
    expiresAt: raw?.expiresAt ?? null,
    active: Boolean(raw?.active ?? tier > 0),
    perks: raw?.perks ?? {},
  };
}

async function readError(response) {
  try {
    const type = response.headers.get('content-type') || '';
    if (type.includes('json')) {
      const data = await response.clone().json();
      return data?.message || data?.error || JSON.stringify(data);
    }
    return (await response.clone().text()).slice(0, 2000);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export class NaiClient {
  constructor() {
    this.token = '';
  }

  setToken(token) {
    this.token = String(token || '').trim();
  }

  authHeaders(json = false) {
    const headers = { Accept: '*/*' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async send(url, init = {}) {
    const next = {
      ...init,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    };
    try {
      return await fetch(url, next);
    } catch (error) {
      throw new ApiError(
        `NovelAI API에 직접 연결하지 못했습니다: ${error?.message || error}. 네트워크 또는 CORS를 확인하세요.`,
        0,
      );
    }
  }

  async sendJson(url, { method = 'GET', body } = {}) {
    const response = await this.send(url, {
      method,
      headers: this.authHeaders(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let message = await readError(response);
      if (response.status === 401 || response.status === 403) {
        message += ' — 토큰/구독 상태를 확인하세요.';
      }
      throw new ApiError(message, response.status);
    }
    return response;
  }

  async login(email, password) {
    const key = await deriveAccessKey(email, password);
    const response = await this.send(`${API_HOST}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) throw new ApiError(await readError(response), response.status);
    const data = await response.json();
    if (!data?.accessToken) throw new ApiError('NovelAI가 access token을 반환하지 않았습니다.', 502);
    this.setToken(data.accessToken);
    const subscription = await this.subscription();
    return { accessToken: data.accessToken, subscription };
  }

  async subscription() {
    if (!this.token) throw new ApiError('NovelAI access token is required.', 401);

    const primary = await this.send(`${API_HOST}/user/subscription`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (primary.ok) return { subscription: summarizeSubscription(await primary.json()), degraded: false };
    if (primary.status === 401 || primary.status === 403) {
      throw new ApiError(await readError(primary), primary.status);
    }

    try {
      const fallback = await this.send(`${TEXT_HOST}/user/subscription`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      if (fallback.ok) {
        return {
          subscription: summarizeSubscription(await fallback.json()),
          degraded: false,
          fallbackHost: 'text.novelai.net',
        };
      }
      if (fallback.status === 401 || fallback.status === 403) {
        throw new ApiError(await readError(fallback), fallback.status);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    }

    return {
      subscription: null,
      degraded: true,
      warning: '구독 정보를 확인하지 못했습니다. 토큰은 유지하며 생성 요청에서 다시 검증합니다.',
    };
  }

  async generate(payload) {
    return this.sendJson(`${IMAGE_HOST}/ai/generate-image`, { method: 'POST', body: payload });
  }

  async augment(payload) {
    return this.sendJson(`${IMAGE_HOST}/ai/augment-image`, { method: 'POST', body: payload });
  }

  async upscale(payload) {
    return this.sendJson(`${API_HOST}/ai/upscale`, { method: 'POST', body: payload });
  }

  async encodeVibe(payload) {
    return this.sendJson(`${IMAGE_HOST}/ai/encode-vibe`, { method: 'POST', body: payload });
  }

  async suggestTags({ model, prompt, lang = 'en' }) {
    const query = new URLSearchParams({ model, prompt, lang });
    const response = await this.send(
      `${IMAGE_HOST}/ai/generate-image/suggest-tags?${query}`,
      { method: 'GET', headers: this.authHeaders() },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.tags || [];
  }
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
