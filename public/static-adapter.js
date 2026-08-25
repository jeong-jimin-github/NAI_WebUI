(() => {
  'use strict';

  const API_HOST = 'https://api.novelai.net';
  const IMAGE_HOST = 'https://image.novelai.net';
  const nativeFetch = window.fetch.bind(window);

  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  function getHeader(headers, name) {
    if (!headers) return '';
    if (headers instanceof Headers) return headers.get(name) || '';
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : '';
  }

  function cleanHeaders(headers, token, json = false) {
    const out = new Headers(headers || {});
    out.delete('X-NAI-Token');
    if (token) out.set('Authorization', `Bearer ${token}`);
    out.set('Accept', '*/*');
    if (json) out.set('Content-Type', 'application/json');
    return out;
  }

  async function errorText(response) {
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

  async function subscription(token) {
    const response = await nativeFetch(`${API_HOST}/user/subscription`, {
      method: 'GET',
      headers: cleanHeaders({}, token, false),
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return { response, error: await errorText(response) };
    return { response, data: summarizeSubscription(await response.json()) };
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  async function deriveAccessKey(email, password) {
    const { argon2id, blake2b } =
      await import('https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/index.esm.js');
    const preSalt = `${password.slice(0, 6)}${email}novelai_data_access_key`;
    const saltHex = await blake2b(preSalt, 128);
    const salt = Uint8Array.from(saltHex.match(/.{2}/g), byte => parseInt(byte, 16));
    const key = await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 1953,
      hashLength: 64,
      outputType: 'binary',
    });
    return bytesToBase64(key)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
      .slice(0, 64);
  }

  function localPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return null;
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin) return null;
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  async function directProxy(target, init, token, forceMethod) {
    const next = { ...init };
    next.method = forceMethod || next.method || 'GET';
    next.headers = cleanHeaders(next.headers, token, Boolean(next.body));
    next.mode = 'cors';
    next.credentials = 'omit';
    next.cache = 'no-store';
    try {
      return await nativeFetch(target, next);
    } catch (error) {
      return jsonResponse({
        error: `NovelAI API 직접 연결 실패: ${error?.message || error}. 브라우저/CORS 또는 네트워크 상태를 확인하세요.`,
      }, 502);
    }
  }

  window.fetch = async function staticNovelAIFetch(input, init = {}) {
    const path = localPath(input);
    if (!path || !path.startsWith('/api/')) return nativeFetch(input, init);

    const token = String(getHeader(init.headers, 'X-NAI-Token') || '').trim();

    if (path === '/api/auth/token') {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      const result = await subscription(token);
      if (result.error) return jsonResponse({ error: result.error }, result.response.status);
      return jsonResponse({ ok: true, subscription: result.data });
    }

    if (path === '/api/nai/subscription') {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      const result = await subscription(token);
      if (result.error) return jsonResponse({ error: result.error }, result.response.status);
      return jsonResponse({ subscription: result.data });
    }

    if (path === '/api/auth/login') {
      try {
        const body = JSON.parse(init.body || '{}');
        const email = String(body.email || '').trim();
        const password = String(body.password || '');
        if (!email || !password) return jsonResponse({ error: 'Email and password are required.' }, 400);

        const key = await deriveAccessKey(email, password);
        const loginResponse = await nativeFetch(`${API_HOST}/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ key }),
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!loginResponse.ok) {
          return jsonResponse({ error: await errorText(loginResponse) }, loginResponse.status);
        }
        const login = await loginResponse.json();
        if (!login?.accessToken) return jsonResponse({ error: 'NovelAI did not return an access token.' }, 502);

        const result = await subscription(login.accessToken);
        if (result.error) return jsonResponse({ error: result.error }, result.response.status);
        return jsonResponse({ accessToken: login.accessToken, subscription: result.data });
      } catch (error) {
        return jsonResponse({ error: error?.message || String(error) }, 500);
      }
    }

    if (path.startsWith('/api/nai/tags')) {
      const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
      return directProxy(`${IMAGE_HOST}/ai/generate-image/suggest-tags${query}`, init, token, 'GET');
    }

    const routes = {
      '/api/nai/generate': `${IMAGE_HOST}/ai/generate-image`,
      '/api/nai/augment': `${IMAGE_HOST}/ai/augment-image`,
      '/api/nai/upscale': `${API_HOST}/ai/upscale`,
      '/api/nai/encode-vibe': `${IMAGE_HOST}/ai/encode-vibe`,
    };

    if (routes[path]) {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      return directProxy(routes[path], init, token, 'POST');
    }

    return jsonResponse({ error: `Unknown static API route: ${path}` }, 404);
  };

  window.__NAI_STATIC_MODE__ = true;
  console.info('[NAI WebUI] Static mode active: NovelAI API requests are sent directly from this browser.');
})();
